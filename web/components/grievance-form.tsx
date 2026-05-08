"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Loader2,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GrievancePickerClient as GrievancePicker } from "@/components/map-client";

type Step = 1 | 2 | 3;

export function GrievanceForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canNext1 = title.trim().length > 4 && description.trim().length > 12;
  const canSubmit = canNext1 && location !== null;

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }

  function submit() {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("title", title.trim());
        fd.set("description", description.trim());
        fd.set("address", address.trim());
        if (location) {
          fd.set("lat", String(location.lat));
          fd.set("lng", String(location.lng));
        }
        if (photo) fd.set("photo", photo);

        const res = await fetch("/api/grievance", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Server returned ${res.status}`);
        }
        const data = (await res.json()) as { id: string };
        router.push(`/grievances/${data.id}?just=1`);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Submission failed");
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <Stepper step={step} />

      <div className="px-6 pb-6 pt-2 sm:px-10 sm:pb-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <Header
                eyebrow="Step 1 · Describe"
                title="What's the issue?"
                subtitle="A short title, then a bit of detail. The agent will pick the right department for you."
              />
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Pothole near 12th Main"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Describe the issue</Label>
                <Textarea
                  id="description"
                  placeholder="When did it start? Who is affected? Anything we should know?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  {description.length}/1000
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  onClick={() => canNext1 && setStep(2)}
                  disabled={!canNext1}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <Header
                eyebrow="Step 2 · Photo (optional)"
                title="Show us, if you can."
                subtitle="A photo helps the agent classify and helps the department prioritise."
              />

              {!photoPreview ? (
                <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/30 px-6 py-12 text-center transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--secondary)]/60">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Camera className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">
                    Tap to take a photo or pick from gallery
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    JPG/PNG · up to ~10 MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhoto}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-[420px] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <Header
                eyebrow="Step 3 · Pin the spot"
                title="Where exactly?"
                subtitle="We've used your current location as a starting point — drag the pin or tap to adjust."
              />

              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  placeholder="12th Main Rd, Indiranagar, Bengaluru"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <GrievancePicker value={location} onChange={setLocation} />

              {location && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <MapPin className="h-3 w-3" />
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              )}

              {submitError && (
                <p className="rounded-lg border border-rose-300/40 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={submit}
                  disabled={!canSubmit || isPending}
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Agent is
                      analysing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Submit grievance
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
        {eyebrow}
      </p>
      <h2
        className="text-2xl tracking-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {title}
      </h2>
      <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "Describe" },
    { n: 2, label: "Photo" },
    { n: 3, label: "Location" },
  ];
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--secondary)]/40 px-6 py-4 sm:px-10">
      {items.map((it, idx) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <div key={it.n} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-all ${
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-4 ring-[var(--primary)]/15"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]"
                }`}
              >
                {done ? "✓" : it.n}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  active
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {it.label}
              </span>
            </div>
            {idx < items.length - 1 && (
              <div className="h-px flex-1 bg-[var(--border)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
