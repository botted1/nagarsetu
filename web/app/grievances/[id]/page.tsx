import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { GrievanceTimeline } from "@/components/grievance-timeline";
import { JustSubmittedToast } from "./just-submitted-toast";
import { CopyButtonClient } from "./copy-button";
import { GrievanceOverviewMapClient as GrievanceMap } from "@/components/map-client";
import { ResolutionVerificationCard } from "@/components/resolution-verification-card";
import {
  ArrowLeft,
  Bot,
  Building2,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import { priorityTone } from "@/lib/utils";

export default async function CitizenGrievanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!session.user.name) redirect("/onboarding");

  // Admins use the dedicated /admin/[id] surface — keep this route citizen-only.
  if (session.user.role === "ADMIN") {
    const { id } = await params;
    redirect(`/admin/${id}`);
  }

  const { id } = await params;
  const { just } = await searchParams;

  const g = await prisma.grievance.findUnique({
    where: { id },
    include: {
      department: true,
      updates: { orderBy: { createdAt: "asc" }, include: { byUser: true } },
      user: true,
    },
  });
  if (!g) notFound();
  if (g.userId !== session.user.id) {
    redirect("/grievances");
  }

  const similarIds: string[] = (() => {
    try {
      return JSON.parse(g.similarGrievanceIds) as string[];
    } catch {
      return [];
    }
  })();

  const similar = similarIds.length
    ? await prisma.grievance.findMany({
        where: { id: { in: similarIds } },
        select: { id: true, title: true, status: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {just && <JustSubmittedToast />}
      <Link
        href="/grievances"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All grievances
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-6 py-4">
              <StatusBadge status={g.status} />
              {g.priority && (
                <Badge
                  className={`${priorityTone(g.priority)} bg-[var(--secondary)]/60 ring-[var(--border)]`}
                >
                  {g.priority} priority
                </Badge>
              )}
              {g.department && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Building2 className="h-3 w-3" />
                  {g.department.name}
                </span>
              )}
            </div>

            <div className="space-y-4 p-6">
              <div>
                <h1
                  className="text-3xl tracking-tight"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {g.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {g.address || "Location attached"} · Filed{" "}
                  {new Date(g.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--foreground)]">
                {g.description}
              </p>
              {g.photoUrl && !g.fixPhotoUrl && (
                <a
                  href={g.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  <img
                    src={g.photoUrl}
                    alt="Citizen-uploaded evidence"
                    className="max-h-[420px] w-full object-cover"
                  />
                </a>
              )}
            </div>
          </Card>

          {g.fixPhotoUrl && g.photoUrl && (
            <ResolutionVerificationCard
              originalUrl={g.photoUrl}
              fixUrl={g.fixPhotoUrl}
              verdict={g.resolutionVerdict}
              confidence={g.resolutionConfidence}
              reasoning={g.resolutionReasoning}
              verifiedAt={g.resolutionVerifiedAt}
            />
          )}

          {g.draftedComplaint && (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--secondary)]/40 px-6 py-3">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-semibold">
                  AI-drafted formal complaint
                </p>
                <CopyButtonClient text={g.draftedComplaint} />
              </div>
              <pre className="whitespace-pre-wrap px-6 py-5 font-serif text-[15px] leading-relaxed text-[var(--foreground)]">
                {g.draftedComplaint}
              </pre>
            </Card>
          )}

          {g.agentReasoning && (
            <Card className="bg-[var(--secondary)]/40 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                <Bot className="h-3.5 w-3.5" /> Agent reasoning
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {g.agentReasoning}
              </p>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Status
            </p>
            <div className="mt-4">
              <GrievanceTimeline
                status={g.status}
                createdAt={g.createdAt}
                updates={g.updates.map((u) => ({
                  toStatus: u.toStatus,
                  fromStatus: u.fromStatus,
                  note: u.note,
                  createdAt: u.createdAt,
                }))}
              />
            </div>
          </Card>

          {g.lat && g.lng && g.department && (
            <Card className="overflow-hidden p-1">
              <div className="px-4 pb-2 pt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Location
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {g.lat.toFixed(5)}, {g.lng.toFixed(5)}
                </p>
              </div>
              <GrievanceMap
                height={240}
                pins={[
                  {
                    id: g.id,
                    lat: g.lat,
                    lng: g.lng,
                    title: g.title,
                    status: g.status,
                    color: g.department.color,
                    href: `/grievances/${g.id}`,
                  },
                ]}
              />
            </Card>
          )}

          {similar.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                Possible duplicates nearby
              </p>
              <ul className="mt-3 space-y-2">
                {similar.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/grievances/${s.id}`}
                      className="line-clamp-1 text-sm hover:underline"
                    >
                      {s.title}
                    </Link>
                    <ExternalLink className="h-3 w-3 text-[var(--muted-foreground)]" />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/report">File another grievance</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

