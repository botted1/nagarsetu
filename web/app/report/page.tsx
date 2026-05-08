import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GrievanceForm } from "@/components/grievance-form";

export default async function ReportPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/report");
  }
  if (!session.user.name) {
    redirect("/onboarding");
  }
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
          New grievance
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Tell us what&rsquo;s wrong.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
          Three quick steps. The agent does the formal paperwork.
        </p>
      </div>
      <GrievanceForm />
    </div>
  );
}
