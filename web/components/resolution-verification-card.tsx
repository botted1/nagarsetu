import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export function ResolutionVerificationCard({
  originalUrl,
  fixUrl,
  verdict,
  confidence,
  reasoning,
  verifiedAt,
}: {
  originalUrl: string;
  fixUrl: string;
  verdict: string | null;
  confidence: number | null;
  reasoning: string | null;
  verifiedAt: Date | null;
}) {
  const conf = Math.round((confidence ?? 0) * 100);
  const isWin = verdict === "fixed";
  const isWarn = verdict === "unchanged" || verdict === "different_issue";
  const Icon = isWin ? CheckCircle2 : isWarn ? AlertTriangle : Eye;
  const label =
    {
      fixed: "Verified fixed",
      unchanged: "Verifier flagged: still unchanged",
      different_issue: "Verifier flagged: different scene",
      uncertain: "Vision verification inconclusive",
    }[verdict ?? "uncertain"] ?? "Vision verification";
  const tone = isWin
    ? "from-emerald-50 to-emerald-50/40 border-emerald-200/60 dark:from-emerald-500/10 dark:to-emerald-500/0 dark:border-emerald-500/30"
    : isWarn
      ? "from-rose-50 to-rose-50/40 border-rose-200/60 dark:from-rose-500/10 dark:to-rose-500/0 dark:border-rose-500/30"
      : "from-amber-50 to-amber-50/40 border-amber-200/60 dark:from-amber-500/10 dark:to-amber-500/0 dark:border-amber-500/30";
  const iconTone = isWin
    ? "text-emerald-600 dark:text-emerald-300"
    : isWarn
      ? "text-rose-600 dark:text-rose-300"
      : "text-amber-600 dark:text-amber-300";

  return (
    <Card
      className={`overflow-hidden bg-gradient-to-br ${tone} border ring-1 ring-inset`}
    >
      <div className="flex items-center gap-2 border-b border-current/10 px-6 py-3">
        <div
          className={`grid h-7 w-7 place-items-center rounded-full bg-white/60 dark:bg-black/20 ${iconTone}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm font-semibold">{label}</p>
        {verdict && (
          <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] dark:bg-black/30">
            {conf}% confidence
          </span>
        )}
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2">
        <figure className="space-y-2">
          <figcaption className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Before
          </figcaption>
          <a
            href={originalUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl border border-[var(--border)]"
          >
            <img
              src={originalUrl}
              alt="Original problem"
              className="aspect-[4/3] w-full object-cover"
            />
          </a>
        </figure>
        <figure className="space-y-2">
          <figcaption className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            After
          </figcaption>
          <a
            href={fixUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl border border-[var(--border)]"
          >
            <img
              src={fixUrl}
              alt="Claimed fix"
              className="aspect-[4/3] w-full object-cover"
            />
          </a>
        </figure>
      </div>

      {reasoning && (
        <div className="border-t border-current/10 px-6 py-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Agent reasoning
          </p>
          <p className="mt-1 leading-relaxed">{reasoning}</p>
          {verifiedAt && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Verified {formatRelativeTime(verifiedAt)} by Gemini Vision
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
