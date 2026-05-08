import NextAuth, { type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { magicLinkTemplate, sendMail } from "@/lib/email";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
  providers: [
    Resend({
      // The Resend provider is just the convenient "email" shape Auth.js
      // exposes; the actual delivery happens in our unified mailer
      // (Gmail SMTP → Resend → console). The apiKey is a placeholder so
      // Auth.js doesn't complain at startup.
      apiKey: process.env.RESEND_API_KEY || "dev-noop",
      from: process.env.RESEND_FROM ?? "NagarSetu <onboarding@resend.dev>",
      async sendVerificationRequest({ identifier: to, url }) {
        const { host } = new URL(url);
        const tpl = magicLinkTemplate(url, host);
        const result = await sendMail({
          to,
          subject: `Sign in to ${host}`,
          html: tpl.html,
          text: tpl.text,
        });
        if (result.devLogged) {
          // Mailer fell all the way to console — also print the structured
          // dev-magic-link block so the link is easy to spot in the terminal.
          console.log("\n──────── 🔑 [dev magic link] ────────");
          console.log(`Sign-in for: ${to}`);
          console.log(url);
          console.log("─────────────────────────────────────\n");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in
        token.id = user.id;
        token.name = user.name ?? null;
        token.role = (user as { role?: string }).role ?? "CITIZEN";
        token.departmentId =
          (user as { departmentId?: string | null }).departmentId ?? null;
      } else if (token.id) {
        // Refresh on every request so role/name updates take effect without re-login.
        // (e.g. completing onboarding, getting promoted to ADMIN.)
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, role: true, departmentId: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.role = fresh.role;
          token.departmentId = fresh.departmentId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string | null) ?? null;
        session.user.role = (token.role as string) ?? "CITIZEN";
        session.user.departmentId =
          (token.departmentId as string | null) ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
