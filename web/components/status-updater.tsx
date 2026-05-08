"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Sparkles,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

const TRANSITIONS: Record<
  string,
  { to: string; label: string; icon: React.ElementType; tone: string }[]
> = {
  SUBMITTED: [
    {
      to: "ACKNOWLEDGED",
      label: "Acknowledge",
      icon: Eye,
      tone: "bg-amber-500 text-white hover:brightness-110",
    },
    {
      to: "REJECTED",
      label: "Reject",
      icon: XCircle,
      tone: "bg-rose-500 text-white hover:brightness-110",
    },
  ],
  ACKNOWLEDGED: [
    {
      to: "IN_PROGRESS",
      label: "Start work",
      icon: Wrench,
      tone: "bg-sky-500 text-white hover:brightness-110",
    },
    {
      to: "REJECTED",
      label: "Reject",
      icon: XCircle,
      tone: "bg-rose-500 text-white hover:brightness-110",
    },
  ],
  IN_PROGRESS: [
    {
      to: "RESOLVED",
      label: "Mark resolved",
      icon: CheckCircle2,
      tone: "bg-emerald-500 text-white hover:brightness-110",
    },
  ],
  RESOLVED: [
    {
      to: "IN_PROGRESS",
      label: "Re-open",
      icon: Clock3,
      tone: "bg-sky-500 text-white hover:brightness-110",
    },
  ],
  REJECTED: [],
};

type VerdictResult = {
  verdict: "fixed" | "unchanged" | "different_issue" | "uncertain";
  confidence: number;
  reasoning: string;
  status: string;
};

export function StatusUpdater({
  grievanceId,
  currentStatus,
  hasOriginalPhoto,
}: {
  grievanceId: string;
  currentStatus: string;
  hasOriginalPhoto: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resolveOpen, setResolveOpen] = useState(false);

  const transitions = TRANSITIONS[currentStatus] ?? [];

  function update(to: string) {
    // Special-case RESOLVED transition: open the verification dialog instead
    // of immediately calling /status. We need a fix photo to compare against.
    if (to === "RESOLVED" && hasOriginalPhoto) {
      setError(null);
      setResolveOpen(true);
      return;
    }

    setError(null);
    setPendingTo(to);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/grievance/${grievanceId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, note: note.trim() || null }),
        });
        if (!res.ok) throw new Error(await res.text());
        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setPendingTo(null);
      }
    });
  }

  if (transitions.length === 0) {
    return (
      <p className="text-xs text-[var(--muted-foreground)]">
        No further actions available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note for the citizen (optional, included in status email)…"
        rows={3}
      />
      <div className="flex flex-wrap gap-2">
        {transitions.map(({ to, label, icon: Icon, tone }) => (
          <motion.button
            key={to}
            whileTap={{ scale: 0.97 }}
            onClick={() => update(to)}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-60 ${tone}`}
          >
            {pendingTo === to ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {label}
          </motion.button>
        ))}
      </div>
      {error && (
        <p className="rounded-md border border-rose-300/40 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      <ResolveDialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        grievanceId={grievanceId}
        defaultNote={note}
        onComplete={() => {
          setNote("");
          router.refresh();
        }}
      />
    </div>
  );
}

function ResolveDialog({
  open,
  onClose,
  grievanceId,
  defaultNote,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  grievanceId: string;
  defaultNote: string;
  onComplete: () => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [note, setNote] = useState(defaultNote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerdictResult | null>(null);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!photo) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("fixPhoto", photo);
      if (note.trim()) fd.set("note", note.trim());
      const res = await fetch(
        `/api/grievance/${grievanceId}/verify-resolution`,
        { method: "POST", body: fd }
      );
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as VerdictResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (result) onComplete();
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setResult(null);
    setError(null);
    setNote("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-xl">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                Verify the fix
              </DialogTitle>
              <DialogDescription>
                Upload a photo showing the resolved issue. Our vision agent will
                compare it against the citizen&rsquo;s original photo before
                marking the grievance as resolved.
              </DialogDescription>
            </DialogHeader>

            {!photoPreview ? (
              <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/30 px-6 py-10 text-center transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--secondary)]/60">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Camera className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">Tap to upload fix photo</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Take a clear photo of the resolved spot
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={pickPhoto}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
                <img
                  src={photoPreview}
                  alt="Fix preview"
                  className="max-h-[320px] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    if (photoPreview) URL.revokeObjectURL(photoPreview);
                    setPhotoPreview(null);
                  }}
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (work order #, crew name, anything you'd like the citizen to see)…"
              rows={2}
            />

            {error && (
              <p className="rounded-md border border-rose-300/40 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!photo || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying with
                    Gemini…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Verify & resolve
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <VerdictView result={result} onClose={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VerdictView({
  result,
  onClose,
}: {
  result: VerdictResult;
  onClose: () => void;
}) {
  const conf = Math.round(result.confidence * 100);
  const isWin = result.verdict === "fixed";
  const isWarn =
    result.verdict === "unchanged" || result.verdict === "different_issue";
  const tone = isWin
    ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
    : isWarn
      ? "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30"
      : "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30";
  const Icon = isWin ? CheckCircle2 : isWarn ? AlertTriangle : Sparkles;
  const headline =
    {
      fixed: "Verified fixed",
      unchanged: "Looks unchanged",
      different_issue: "Different scene",
      uncertain: "Verifier was uncertain",
    }[result.verdict] ?? "Verifier responded";
  const followUp = isWin
    ? "Grievance has been marked Resolved. The citizen will get an email with both photos."
    : isWarn
      ? "Status reverted to In progress. The citizen has been notified that the fix needs another look."
      : "Grievance was marked Resolved, but the agent couldn't verify with confidence.";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon
            className={`h-5 w-5 ${
              isWin
                ? "text-emerald-600 dark:text-emerald-300"
                : isWarn
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-amber-600 dark:text-amber-300"
            }`}
          />
          {headline}
          <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">
            {conf}% confidence
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className={`rounded-xl ring-1 ring-inset ${tone} p-4 text-sm`}>
        <p className="font-medium">Agent reasoning</p>
        <p className="mt-1 leading-relaxed opacity-90">{result.reasoning}</p>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">{followUp}</p>

      <div className="flex justify-end pt-2">
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
  );
}
