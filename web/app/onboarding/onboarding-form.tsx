"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length >= 2;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            phone: phone.trim() || null,
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Server returned ${res.status}`);
        }
        const data = (await res.json()) as { next: string };
        router.push(data.next);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not save your details."
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/40 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <Mail className="h-3 w-3" />
          Signed in as
        </span>{" "}
        <span className="font-medium">{email}</span>
        {isAdmin && (
          <span className="ml-2 rounded-full bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
            Admin
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Riya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          autoComplete="name"
          required
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Used on the formal complaint letters drafted on your behalf.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone <span className="text-[var(--muted-foreground)]">(optional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          autoComplete="tel"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Helps the municipality reach you about urgent issues. We never share
          this publicly.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-300/40 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <User className="h-4 w-4" /> Continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
