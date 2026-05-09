import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .nullable()
    .optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, phone } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone && phone.length > 0 ? phone : null,
    },
  });

  // Citizens land on /report — most common first action after onboarding.
  const next = session.user.role === "ADMIN" ? "/admin" : "/report";
  return NextResponse.json({ ok: true, next });
}
