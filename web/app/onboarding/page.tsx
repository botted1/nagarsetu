import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/onboarding");

  // Already onboarded → take them to their dashboard.
  if (session.user.name && session.user.name.trim().length > 0) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/grievances");
  }

  return (
    <div className="grain gradient-civic">
      <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-lg items-center px-4 py-12 sm:px-6">
        <Card className="w-full p-8 sm:p-10">
          <p className="text-3xl">नमस्ते 👋</p>
          <h1
            className="mt-3 text-3xl tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Welcome to{" "}
            <span className="text-[var(--primary)]">NagarSetu</span>.
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Just one quick thing before you start. We&rsquo;ll use your name on
            the formal complaint letters our agent drafts for you.
          </p>

          <OnboardingForm
            email={session.user.email!}
            isAdmin={session.user.role === "ADMIN"}
          />

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-6 border-t border-[var(--border)] pt-4"
          >
            <button
              type="submit"
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Wrong account? Sign out
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
