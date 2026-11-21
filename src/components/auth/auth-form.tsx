"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api-client";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

type Mode = "login" | "register";
type Values = { name?: string; email: string; phone?: string; password: string };

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema) as never,
  });

  async function onSubmit(v: Values) {
    setServerError(null);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: v });
      router.push(next);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        for (const [k, msgs] of Object.entries(e.details)) setError(k as keyof Values, { message: msgs[0] });
      }
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const isLogin = mode === "login";
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {!isLogin && <Field id="name" label="Full name" error={errors.name?.message}><Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>}
      <Field id="email" label="Email" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
      {!isLogin && (
        <Field id="phone" label="Mobile (optional)" error={errors.phone?.message}>
          <div className="flex gap-2"><span className="grid h-8 place-items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">+91</span><Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" {...register("phone")} /></div>
        </Field>
      )}
      <Field id="password" label="Password" error={errors.password?.message} hint={isLogin ? undefined : "At least 8 characters with a letter and a number"}>
        <Input id="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      {serverError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}
      <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />} {isLogin ? "Log in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link className="font-medium text-primary hover:underline" href={`${isLogin ? "/register" : "/login"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
