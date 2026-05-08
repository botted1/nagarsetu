import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadPhoto } from "@/lib/storage";
import { verifyResolution } from "@/lib/verify-resolution";
import { sendMail, statusEmailTemplate } from "@/lib/email";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const grievance = await prisma.grievance.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!grievance) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!grievance.photoUrl) {
    return NextResponse.json(
      { error: "original grievance has no photo to compare against" },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const fixPhoto = form.get("fixPhoto");
  const note = (form.get("note") ?? "")?.toString() || null;
  if (!(fixPhoto instanceof File) || fixPhoto.size === 0) {
    return NextResponse.json(
      { error: "fixPhoto is required" },
      { status: 400 }
    );
  }

  // 1. Upload the fix photo
  const uploaded = await uploadPhoto(fixPhoto);

  // 2. Ask the agent to compare the two images
  const verdict = await verifyResolution({
    originalPhotoUrl: grievance.photoUrl,
    fixPhotoUrl: uploaded.url,
    grievanceTitle: grievance.title,
    grievanceDescription: grievance.description,
  });

  // 3. Decide the new status from the verdict
  // - fixed → RESOLVED
  // - unchanged / different_issue → revert to IN_PROGRESS (the fix didn't take)
  // - uncertain → still RESOLVED, but flagged in the UI
  const newStatus =
    verdict.verdict === "unchanged" || verdict.verdict === "different_issue"
      ? "IN_PROGRESS"
      : "RESOLVED";

  const fromStatus = grievance.status;

  await prisma.grievance.update({
    where: { id },
    data: {
      status: newStatus,
      fixPhotoUrl: uploaded.url,
      resolutionVerdict: verdict.verdict,
      resolutionConfidence: verdict.confidence,
      resolutionReasoning: verdict.reasoning,
      resolutionVerifiedAt: new Date(),
    },
  });

  // 4. Audit-log the transition
  await prisma.grievanceUpdate.create({
    data: {
      grievanceId: id,
      fromStatus,
      toStatus: newStatus,
      note: buildUpdateNote(verdict, note),
      byUserId: session.user.id,
    },
  });

  // 5. Email the citizen with a verdict-aware subject
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${origin}/grievances/${id}`;
  const tpl = statusEmailTemplate({
    citizenName: grievance.user.name ?? null,
    grievanceTitle: grievance.title,
    fromStatus,
    toStatus: newStatus,
    note: buildUpdateNote(verdict, note),
    url,
  });
  try {
    await sendMail({
      to: grievance.user.email,
      subject:
        newStatus === "RESOLVED"
          ? `✓ Resolved: ${grievance.title}`
          : `Status update: ${grievance.title}`,
      html: tpl.html,
      text: tpl.text,
    });
  } catch (err) {
    console.error("[verify-resolution] email send failed:", err);
  }

  return NextResponse.json({
    ok: true,
    status: newStatus,
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    reasoning: verdict.reasoning,
    fixPhotoUrl: uploaded.url,
  });
}

function buildUpdateNote(
  verdict: { verdict: string; confidence: number; reasoning: string },
  adminNote: string | null
): string {
  const conf = Math.round(verdict.confidence * 100);
  const verdictLabel: Record<string, string> = {
    fixed: `✓ Verified fixed (${conf}% confidence)`,
    unchanged: `⚠ Verifier says the issue still appears unchanged (${conf}%)`,
    different_issue: `⚠ Verifier says the photo shows a different scene (${conf}%)`,
    uncertain: `~ Verifier was uncertain (${conf}%)`,
  };
  const head = verdictLabel[verdict.verdict] ?? "Verifier responded.";
  const reasoning = verdict.reasoning ? `\n${verdict.reasoning}` : "";
  const tail = adminNote ? `\n\nAdmin note: ${adminNote}` : "";
  return `${head}${reasoning}${tail}`;
}
