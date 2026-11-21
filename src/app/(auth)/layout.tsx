import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="grid flex-1 place-items-center bg-gradient-to-b from-accent to-background px-4 py-10">
      <div className="w-full max-w-md">
        <Logo className="mb-6 justify-center" />
        <div className="rounded-3xl border bg-card p-6 shadow-lift sm:p-8">{children}</div>
      </div>
    </main>
  );
}
