import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, Building2, Plus } from "lucide-react";

export async function Nav() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)]/60 bg-[var(--background)]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--background)]/60">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="relative z-10 flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-saffron text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="text-base">
            Nagar<span className="text-[var(--primary)]">Setu</span>
          </span>
        </Link>

        <nav className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 sm:flex [&>*]:pointer-events-auto">
          {!user && (
            <>
              <Link
                href="/#how-it-works"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                How it works
              </Link>
              <Link
                href="/#departments"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Departments
              </Link>
            </>
          )}
          {user && !isAdmin && (
            <>
              <Link
                href="/grievances"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Dashboard
              </Link>
            </>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Admin dashboard
            </Link>
          )}
        </nav>

        <div className="relative z-10 flex items-center gap-2">
          {!user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/report">
                  <Sparkles className="h-3.5 w-3.5" />
                  Report an issue
                </Link>
              </Button>
            </>
          ) : (
            <>
              {!isAdmin && (
                <Button asChild size="sm" variant="default">
                  <Link href="/report">
                    <Plus className="h-3.5 w-3.5" /> New grievance
                  </Link>
                </Button>
              )}
              <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">
                {user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="ghost" size="icon" type="submit">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
