import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadPhoto } from "@/lib/storage";
import { processGrievanceWithAgent } from "@/lib/agent";
import { findDepartmentByText } from "@/lib/departments";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const address = String(form.get("address") ?? "").trim() || null;
  const latRaw = form.get("lat");
  const lngRaw = form.get("lng");
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  const photo = form.get("photo");

  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadPhoto(photo);
    photoUrl = uploaded.url;
  }

  // Create the grievance immediately so it's tracked even if the agent takes a while
  const grievance = await prisma.grievance.create({
    data: {
      userId: session.user.id,
      title,
      description,
      address,
      lat,
      lng,
      photoUrl,
      status: "SUBMITTED",
    },
  });

  // Best-effort agent enrichment (non-blocking from the user's perspective —
  // we still respond as soon as DB row is created, but we await so the redirect
  // shows the enriched result on first paint).
  try {
    const agentRes = await processGrievanceWithAgent({
      title,
      description,
      photoUrl,
      lat,
      lng,
      address,
      citizenName: session.user.name ?? null,
    });

    const dept = await prisma.department.findUnique({
      where: { slug: agentRes.departmentSlug },
    });

    await prisma.grievance.update({
      where: { id: grievance.id },
      data: {
        category: agentRes.category,
        priority: agentRes.priority,
        departmentId: dept?.id,
        draftedComplaint: agentRes.draftedComplaint,
        agentReasoning: agentRes.reasoning,
        similarGrievanceIds: JSON.stringify(agentRes.similarGrievanceIds),
      },
    });
  } catch (err) {
    console.error("[api/grievance] agent enrichment failed:", err);
    const dept = findDepartmentByText(`${title} ${description}`);
    const department = await prisma.department.findUnique({
      where: { slug: dept.slug },
    });
    if (department) {
      await prisma.grievance.update({
        where: { id: grievance.id },
        data: {
          departmentId: department.id,
          category: dept.name.split(" ")[0],
          agentReasoning: "Local fallback (agent unavailable).",
        },
      });
    }
  }

  return NextResponse.json({ id: grievance.id });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await prisma.grievance.findMany({
    where:
      session.user.role === "ADMIN" ? {} : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { department: true },
  });
  return NextResponse.json(items);
}
