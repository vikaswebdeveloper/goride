import Link from "next/link";
import { Route } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`} aria-label={`${siteConfig.name} home`}>
      <span className="grid size-8 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
        <Route className="size-4" aria-hidden />
      </span>
      <span className="text-lg">
        {siteConfig.shortName}
        <span className="text-primary"> India</span>
      </span>
    </Link>
  );
}
