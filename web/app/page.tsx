import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Camera,
  Construction,
  Droplets,
  Lightbulb,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEPARTMENT_SEED } from "@/lib/departments";

const iconMap: Record<string, React.ElementType> = {
  Construction,
  Trash2,
  Lightbulb,
  Droplets,
};

export default function HomePage() {
  return (
    <div className="grain gradient-civic">
      <Hero />
      <HowItWorks />
      <Departments />
      <CallToAction />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/70 px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] backdrop-blur">
          <Sparkles className="h-3 w-3 text-[var(--primary)]" /> Powered by
          Google ADK + Gemini
        </span>
        <h1
          className="mt-6 text-5xl font-medium leading-[0.95] tracking-tight text-balance sm:text-7xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Your city,{" "}
          <span className="relative inline-block">
            <span className="relative z-10">fixed faster.</span>
            <svg
              className="absolute -bottom-2 left-0 h-3 w-full"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M2 8 Q 50 2, 100 6 T 198 5"
                stroke="oklch(0.78 0.16 60)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          Snap a photo, drop a pin, and we&rsquo;ll handle the paperwork. An AI
          agent classifies the issue, routes it to the right department, and
          drafts a formal complaint — all in seconds.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/report">
              <Sparkles className="h-4 w-4" /> Report an issue
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">
              See how it works <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          Sign-in is a one-tap magic link · No app to install
        </p>
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div
        className="absolute -inset-6 rounded-[2rem] gradient-saffron opacity-20 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-4 shadow-2xl shadow-amber-500/5 backdrop-blur-xl sm:grid-cols-3 sm:p-6">
        <PreviewCard
          step="01"
          title="Snap & describe"
          icon={Camera}
          tone="from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5"
          body="A pothole at 12th Main, Indiranagar. Risky for two-wheelers especially after rains."
        />
        <PreviewCard
          step="02"
          title="Agent triages"
          icon={Bot}
          tone="from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/5"
          body="Classified as Roads → Public Works · HIGH priority · Drafted formal complaint with location."
        />
        <PreviewCard
          step="03"
          title="Track resolution"
          icon={ShieldCheck}
          tone="from-sky-100 to-sky-50 dark:from-sky-500/20 dark:to-sky-500/5"
          body="Acknowledged in 4h. In progress. Resolved with photo proof. Email at every stage."
        />
      </div>
    </div>
  );
}

function PreviewCard({
  step,
  title,
  body,
  icon: Icon,
  tone,
}: {
  step: string;
  title: string;
  body: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br ${tone} p-5`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">
          {step}
        </span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--card)] shadow-sm ring-1 ring-[var(--border)]">
          <Icon className="h-4 w-4 text-[var(--foreground)]" />
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {body}
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            The agent loop
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Four steps. Five seconds. Zero paperwork.
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)]">
            A single Google ADK agent runs four tools in sequence to turn a
            casual report into a routed, formally-drafted municipal complaint.
          </p>
        </div>
        <ol className="space-y-3">
          <Step
            n="1"
            title="Classify the issue"
            body="Gemini 2.5 Flash reads your description and photo, picks a category, and assigns priority based on safety risk."
            icon={Bot}
          />
          <Step
            n="2"
            title="Route to the right department"
            body="Maps the category to one of four departments — Public Works, Sanitation, Electrical, or Water — using rules + LLM judgement."
            icon={Workflow}
          />
          <Step
            n="3"
            title="Draft a formal complaint"
            body="Writes a Indian-municipal-style letter (To, The Commissioner…) ready to print, share, or escalate."
            icon={Send}
          />
          <Step
            n="4"
            title="Find duplicates nearby"
            body="Checks for similar grievances within ~200 m so the department isn't flooded with the same pothole twice."
            icon={MapPin}
          />
        </ol>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
  icon: Icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: React.ElementType;
}) {
  return (
    <li className="group relative flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 p-5 transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--card)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-[var(--muted-foreground)]">
            0{n}
          </span>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{body}</p>
      </div>
    </li>
  );
}

function Departments() {
  return (
    <section
      id="departments"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
          Connected departments
        </p>
        <h2
          className="mt-2 text-3xl tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Routes to the people who can actually fix it.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENT_SEED.map((dept) => {
          const Icon = iconMap[dept.icon] ?? Building2;
          return (
            <div
              key={dept.slug}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                style={{ background: dept.color }}
              />
              <div
                className="grid h-11 w-11 place-items-center rounded-xl text-white"
                style={{ background: dept.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{dept.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {dept.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center sm:p-16">
        <div className="absolute inset-0 -z-10 gradient-saffron opacity-[0.08]" />
        <h2
          className="text-3xl tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Spotted a problem on your street?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[var(--muted-foreground)]">
          It takes about 30 seconds. We&rsquo;ll keep you posted at every step.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/report">
              <Sparkles className="h-4 w-4" /> Report an issue
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in to track</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
