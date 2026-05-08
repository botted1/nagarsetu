import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMail, statusEmailTemplate } from "@/lib/email";

const VALID_STATUSES = [
  "SUBMITTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const;

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as { to?: string; note?: string | null };
  const to = body.to;
  if (!to || !VALID_STATUSES.includes(to as never)) {
    return NextResponse.json(
      { error: "invalid status" },
      { status: 400 }
    );
  }

  const existing = await prisma.grievance.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const fromStatus = existing.status;
  if (fromStatus === to) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const updated = await prisma.grievance.update({
    where: { id },
    data: { status: to as never },
  });

  await prisma.grievanceUpdate.create({
    data: {
      grievanceId: id,
      fromStatus,
      toStatus: to as never,
      note: body.note ?? null,
      byUserId: session.user.id,
    },
  });

  // Email the citizen
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${origin}/grievances/${id}`;
  const tpl = statusEmailTemplate({
    citizenName: existing.user.name ?? null,
    grievanceTitle: existing.title,
    fromStatus,
    toStatus: to,
    note: body.note ?? null,
    url,
  });

  try {
    await sendMail({
      to: existing.user.email,
      subject: `Update on your grievance: ${existing.title}`,
      html: tpl.html,
      text: tpl.text,
    });
  } catch (err) {
    console.error("[api/status] email send failed:", err);
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
