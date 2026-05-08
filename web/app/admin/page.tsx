import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { GrievanceOverviewMapClient as GrievanceMap } from "@/components/map-client";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
} from "lucide-react";
import { formatRelativeTime, priorityTone } from "@/lib/utils";

type SearchParams = Promise<{ status?: string; dept?: string }>;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (!session.user.name) redirect("/onboarding");
  if (session.user.role !== "ADMIN") redirect("/grievances");

  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase();
  const deptFilter = sp.dept;

  const [departments, grievances] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.grievance.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter as never } : {}),
        ...(deptFilter
          ? { department: { slug: deptFilter } }
          : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { department: true, user: true },
    }),
  ]);

  const stats = {
    total: await prisma.grievance.count(),
    submitted: await prisma.grievance.count({
      where: { status: "SUBMITTED" },
    }),
    inProgress: await prisma.grievance.count({
      where: { status: "IN_PROGRESS" },
    }),
    resolved: await prisma.grievance.count({ where: { status: "RESOLVED" } }),
  };

  const pins = grievances
    .filter((g) => g.lat && g.lng && g.department)
    .map((g) => ({
      id: g.id,
      lat: g.lat as number,
      lng: g.lng as number,
      title: g.title,
      status: g.status,
      color: g.department?.color ?? "#52525b",
      href: `/admin/${g.id}`,
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            Municipal control room
          </p>
          <h1
            className="mt-2 text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Today&rsquo;s grievances
          </h1>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total filed"
          value={stats.total}
          tone="bg-[var(--primary)]/10 text-[var(--primary)]"
        />
        <StatCard
          icon={AlertTriangle}
          label="Awaiting triage"
          value={stats.submitted}
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        />
        <StatCard
          icon={Clock3}
          label="In progress"
          value={stats.inProgress}
          tone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved}
          tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        />
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill
          href="/admin"
          active={!statusFilter && !deptFilter}
          label="All"
        />
        {[
          "SUBMITTED",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "RESOLVED",
          "REJECTED",
        ].map((s) => (
          <FilterPill
            key={s}
            href={`/admin?status=${s.toLowerCase()}`}
            active={statusFilter === s}
            label={s.replace(/_/g, " ").toLowerCase()}
          />
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        {departments.map((d) => (
          <FilterPill
            key={d.id}
            href={`/admin?dept=${d.slug}`}
            active={deptFilter === d.slug}
            label={d.name.split(" ")[0]}
            color={d.color}
          />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle className="text-base">
              {grievances.length} grievance{grievances.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {grievances.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">
                No grievances match these filters yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {grievances.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/admin/${g.id}`}
                      className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[var(--secondary)]/40"
                    >
                      <div
                        className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
                        style={{
                          background: g.department?.color ?? "#71717a",
                        }}
                      >
                        {(g.department?.name ?? "??")
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {g.title}
                          </h3>
                          <StatusBadge status={g.status} />
                          {g.priority && (
                            <Badge
                              className={`${priorityTone(g.priority)} bg-transparent ring-[var(--border)]/60`}
                            >
                              {g.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted-foreground)]">
                          {g.user.email} · {formatRelativeTime(g.createdAt)}
                          {g.address && (
                            <>
                              {" · "}
                              <MapPin className="mr-0.5 inline h-3 w-3" />
                              {g.address}
                            </>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden p-1">
            <div className="px-4 pb-2 pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                Map view
              </p>
            </div>
            <GrievanceMap pins={pins} height={520} />
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Department workload
            </p>
            <ul className="mt-3 space-y-2">
              {departments.map((d) => {
                const count = grievances.filter(
                  (g) => g.departmentId === d.id
                ).length;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name}
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
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

function FilterPill({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--foreground)] text-[var(--background)]"
          : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="capitalize">{label}</span>
    </Link>
  );
}
