import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const links = [
  { href: "/", label: "Home" },
  { href: "/routes", label: "Outstation" },
  { href: "/bookings", label: "My Bookings" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu name={user.name} email={user.email} isAdmin={user.role === "ADMIN"} />
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" }) + " hidden sm:inline-flex"}>Log in</Link>
              <Link href="/register" className={buttonVariants({ size: "lg" })}>Sign up</Link>
            </>
          )}
          <MobileNav links={links} />
        </div>
      </div>
    </header>
  );
}
