import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const STAGES = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ACKNOWLEDGED", label: "Acknowledged" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

type Update = {
  toStatus: string;
  fromStatus: string | null;
  note: string | null;
  createdAt: string | Date;
};

export function GrievanceTimeline({
  status,
  createdAt,
  updates,
}: {
  status: string;
  createdAt: string | Date;
  updates: Update[];
}) {
  if (status === "REJECTED") {
    const last = updates[updates.length - 1];
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-300/40 bg-rose-50/60 p-5 dark:bg-rose-500/10">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-rose-200 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200">
          <XCircle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
            Marked as rejected
          </p>
          <p className="text-sm text-rose-900/80 dark:text-rose-200/80">
            {last?.note ?? "The municipal team marked this grievance as rejected."}
          </p>
        </div>
      </div>
    );
  }

  const reachedIdx = STAGES.findIndex((s) => s.key === status);

  return (
    <ol className="relative space-y-0">
      {STAGES.map((stage, idx) => {
        const reached = idx <= reachedIdx;
        const current = idx === reachedIdx;
        const update =
          stage.key === "SUBMITTED"
            ? {
                toStatus: "SUBMITTED" as const,
                fromStatus: null,
                note: null,
                createdAt,
              }
            : updates.find((u) => u.toStatus === stage.key);

        return (
          <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
            {idx < STAGES.length - 1 && (
              <div
                className="absolute left-[15px] top-9 h-full w-px"
                style={{
                  background: reached
                    ? "oklch(0.78 0.15 165)"
                    : "var(--border)",
                  opacity: reached ? 1 : 0.6,
                }}
                aria-hidden
              />
            )}
            <StageDot
              reached={reached}
              current={current}
              isFinal={idx === STAGES.length - 1}
            />
            <div className="flex-1 pt-1">
              <p
                className={`text-sm font-semibold ${
                  reached
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {stage.label}
              </p>
              {update?.createdAt && reached && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatRelativeTime(update.createdAt)}
                </p>
              )}
              {update?.note && (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {update.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StageDot({
  reached,
  current,
  isFinal,
}: {
  reached: boolean;
  current: boolean;
  isFinal: boolean;
}) {
  if (current && !isFinal) {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700 ring-4 ring-sky-200/60 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/20">
        <Clock className="h-4 w-4" />
      </div>
    );
  }
  if (reached) {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--card)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
      <Circle className="h-4 w-4" />
    </div>
  );
}
