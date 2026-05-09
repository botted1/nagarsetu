import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-lg items-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8 text-center sm:p-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1
          className="mt-6 text-3xl tracking-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Check your email
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--muted-foreground)]">
          We&rsquo;ve sent you a one-time sign-in link. Click it from any
          device. The link is valid for 24 hours.
        </p>
        <p className="mx-auto mt-4 max-w-sm rounded-lg border border-[var(--border)] bg-[var(--secondary)]/40 p-3 text-xs text-[var(--muted-foreground)]">
          Didn't receive an email? Check your spam folder.
        </p>
        <Button asChild variant="ghost" className="mt-6">
          <Link href="/">← Back home</Link>
        </Button>
      </Card>
    </div>
  );
}
