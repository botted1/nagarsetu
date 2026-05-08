import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const ACTIVE_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"] as const;

export default async function CitizenDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/grievances");
  if (!session.user.name) redirect("/onboarding");
  if (session.user.role === "ADMIN") redirect("/admin");

  const grievances = await prisma.grievance.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { department: true },
  });

  const totals = {
    all: grievances.length,
    awaiting: grievances.filter(
      (g) => g.status === "SUBMITTED" || g.status === "ACKNOWLEDGED"
    ).length,
    inProgress: grievances.filter((g) => g.status === "IN_PROGRESS").length,
    resolved: grievances.filter((g) => g.status === "RESOLVED").length,
  };

  const active = grievances.filter((g) =>
    (ACTIVE_STATUSES as readonly string[]).includes(g.status)
  );
  const history = grievances.filter(
    (g) => !(ACTIVE_STATUSES as readonly string[]).includes(g.status)
  );

  const firstName = (session.user.name ?? session.user.email.split("@")[0])
    .split(" ")[0]
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            Your dashboard
          </p>
          <h1
            className="mt-2 text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Track your grievances and the city&rsquo;s response in one place.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/report">
            <Plus className="h-4 w-4" /> New grievance
          </Link>
        </Button>
      </header>

      {grievances.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Total filed"
              value={totals.all}
              tone="bg-[var(--primary)]/10 text-[var(--primary)]"
            />
            <StatCard
              icon={Inbox}
              label="Awaiting"
              value={totals.awaiting}
              tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
            />
            <StatCard
              icon={Clock3}
              label="In progress"
              value={totals.inProgress}
              tone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              icon={CheckCircle2}
              label="Resolved"
              value={totals.resolved}
              tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
          </section>

          {active.length > 0 && (
            <section className="mb-10 space-y-3">
              <SectionHeading
                eyebrow="Active"
                title="Currently being worked on"
                hint={`${active.length} open`}
              />
              <div className="space-y-3">
                {active.map((g) => (
                  <GrievanceRow key={g.id} g={g} accent />
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <SectionHeading
                eyebrow="History"
                title="Resolved & closed"
                hint={`${history.length} item${history.length === 1 ? "" : "s"}`}
              />
              <div className="space-y-3">
                {history.map((g) => (
                  <GrievanceRow key={g.id} g={g} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function SectionHeading({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
          {eyebrow}
        </p>
        <h2
          className="text-xl tracking-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h2>
      </div>
      <span className="text-xs text-[var(--muted-foreground)]">{hint}</span>
    </div>
  );
}

type Row = {
  id: string;
  title: string;
  status: string;
  address: string | null;
  createdAt: Date;
  department: { name: string; color: string } | null;
};

function GrievanceRow({ g, accent }: { g: Row; accent?: boolean }) {
  return (
    <Link href={`/grievances/${g.id}`} className="block">
      <Card
        className={`group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 ${
          accent
            ? "border-[var(--primary)]/30 bg-gradient-to-br from-[var(--card)] to-[var(--primary)]/[0.04]"
            : "hover:border-[var(--primary)]/40"
        }`}
      >
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: g.department?.color ?? "#52525b" }}
          aria-hidden
        >
          <span className="text-sm font-semibold">
            {(g.department?.name ?? "??")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{g.title}</h3>
            <StatusBadge status={g.status} />
          </div>
          <p className="truncate text-sm text-[var(--muted-foreground)]">
            {g.department?.name ?? "Awaiting routing"} ·{" "}
            {formatRelativeTime(g.createdAt)}
            {g.address && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {g.address}
                </span>
              </>
            )}
          </p>
        </div>

        <ArrowRight className="hidden h-4 w-4 text-[var(--muted-foreground)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--foreground)] sm:block" />
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative px-8 py-14 text-center">
        <div
          className="absolute inset-0 -z-10 gradient-saffron opacity-[0.06]"
          aria-hidden
        />
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2
          className="mt-4 text-2xl tracking-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Nothing filed yet.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
          See a pothole, a streetlight that&rsquo;s been out for days, or
          garbage piling up? Let your city know — we&rsquo;ll handle the
          paperwork.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/report">
            <Plus className="h-4 w-4" /> File your first grievance
          </Link>
        </Button>
      </div>
    </Card>
  );
}
