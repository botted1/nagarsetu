import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { GrievanceTimeline } from "@/components/grievance-timeline";
import { StatusUpdater } from "@/components/status-updater";
import { CopyButtonClient } from "@/app/grievances/[id]/copy-button";
import { GrievanceOverviewMapClient as GrievanceMap } from "@/components/map-client";
import { ResolutionVerificationCard } from "@/components/resolution-verification-card";
import {
  ArrowLeft,
  Bot,
  Building2,
  Mail,
  MapPin,
  Sparkles,
  User,
} from "lucide-react";
import { priorityTone } from "@/lib/utils";

export default async function AdminGrievanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (!session.user.name) redirect("/onboarding");
  if (session.user.role !== "ADMIN") redirect("/grievances");

  const { id } = await params;
  const g = await prisma.grievance.findUnique({
    where: { id },
    include: {
      department: true,
      user: true,
      updates: {
        orderBy: { createdAt: "asc" },
        include: { byUser: true },
      },
    },
  });
  if (!g) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
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
              <h1
                className="text-3xl tracking-tight"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {g.title}
              </h1>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {g.description}
              </p>
              {g.photoUrl && (
                <a
                  href={g.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  <img
                    src={g.photoUrl}
                    alt="Citizen evidence"
                    className="max-h-[420px] w-full object-cover"
                  />
                </a>
              )}
              <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/40 p-4 text-sm sm:grid-cols-2">
                <Field
                  icon={User}
                  label="Filed by"
                  value={g.user.name ?? g.user.email}
                />
                <Field icon={Mail} label="Email" value={g.user.email} />
                {g.address && (
                  <Field icon={MapPin} label="Address" value={g.address} />
                )}
                {g.lat && g.lng && (
                  <Field
                    icon={MapPin}
                    label="Coordinates"
                    value={`${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`}
                  />
                )}
              </div>
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
              <pre className="whitespace-pre-wrap px-6 py-5 font-serif text-[15px] leading-relaxed">
                {g.draftedComplaint}
              </pre>
            </Card>
          )}

          {g.agentReasoning && (
            <Card className="bg-[var(--secondary)]/40 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                <Bot className="h-3.5 w-3.5" /> Agent reasoning
              </div>
              <p className="mt-2 text-sm">{g.agentReasoning}</p>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Update status
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              The citizen receives an email on every change.
            </p>
            <div className="mt-4">
              <StatusUpdater
                grievanceId={g.id}
                currentStatus={g.status}
                hasOriginalPhoto={Boolean(g.photoUrl)}
              />
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Lifecycle
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
                    href: `/admin/${g.id}`,
                  },
                ]}
              />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
