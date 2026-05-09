import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-lg items-center px-4 py-12 sm:px-6">
      <SignInCard searchParams={searchParams} />
    </div>
  );
}

async function SignInCard({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  // Citizens default to /report (the most common first action). Admins
  // hitting /report get bounced to /admin by the page's own role check —
  // one extra hop but keeps the citizen flow zero-click.
  const callbackUrl = sp.callbackUrl ?? "/report";
  const error = sp.error;

  return (
    <Card className="w-full p-8 sm:p-10">
      <div className="grid h-11 w-11 place-items-center rounded-xl gradient-saffron text-white shadow-sm">
        <Mail className="h-5 w-5" />
      </div>
      <h1
        className="mt-6 text-3xl tracking-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Sign in with a magic link
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        We&rsquo;ll email you a one-tap link. No password needed.
      </p>

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("resend", {
            email: formData.get("email"),
            redirectTo: callbackUrl,
          });
        }}
        className="mt-6 space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Send me a magic link
        </Button>
        {error && (
          <p className="rounded-md border border-rose-300/50 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
            Something went wrong. Try again.
          </p>
        )}
      </form>

      <p className="mt-6 text-xs text-[var(--muted-foreground)]">
        By signing in, you agree to use this service responsibly. By default,
        new sign-ins are citizens. Admin access is granted to seeded municipal
        accounts.
      </p>
      <p className="mt-4 text-xs">
        <Link href="/" className="text-[var(--primary)] hover:underline">
          ← Back home
        </Link>
      </p>
    </Card>
  );
}
