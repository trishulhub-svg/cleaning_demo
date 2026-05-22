"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Leaf, Menu, Phone, LogOut, User, LayoutDashboard, ChevronDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { APP_NAME, NAV_LINKS, COMPANY_PHONE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  // Hide public header on staff and admin routes (they have their own layouts)
  if (pathname.startsWith('/staff') || pathname.startsWith('/admin')) {
    return null;
  }

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setSigningOut(false);
    }
  };

  const getUserInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDashboardLink = () => {
    const userType = session?.user?.userType;
    switch (userType) {
      case "admin":
        return "/admin";
      case "staff":
        return "/staff";
      default:
        return "/dashboard";
    }
  };

  const getDashboardLabel = () => {
    const userType = session?.user?.userType;
    switch (userType) {
      case "admin":
        return "Admin Panel";
      case "staff":
        return "Staff Portal";
      default:
        return "Dashboard";
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            {APP_NAME}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:bg-primary/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={`tel:${COMPANY_PHONE.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden xl:inline">{COMPANY_PHONE}</span>
          </a>

          {status === "loading" ? (
            <div className="h-9 w-52 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <>
              <Button asChild size="default" className="rounded-full">
                <Link href="/book">Book Now</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-input bg-background p-0.5 pl-0.5 pr-3 transition-colors hover:bg-accent">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                      {session.user.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.user.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {session.user.userType}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      {getDashboardLabel()}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild size="default" className="rounded-full">
                <Link href="/book">Book Now</Link>
              </Button>
              <Button asChild variant="outline" size="default" className="rounded-full">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Medium breakpoint: show Login/Register without phone */}
        <div className="hidden items-center gap-2 md:flex lg:hidden">
          {status === "loading" ? (
            <div className="h-9 w-40 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-input bg-background p-0.5 pl-0.5 pr-3 transition-colors hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium leading-none">
                    {session.user.name}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {session.user.userType}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getDashboardLink()} className="cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    {getDashboardLabel()}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="outline" size="default" className="rounded-full">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="ghost" size="icon">
            <a href={`tel:${COMPANY_PHONE.replace(/\s/g, "")}`}>
              <Phone className="h-5 w-5" />
              <span className="sr-only">Call us</span>
            </a>
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  {APP_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pt-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}

                <Separator className="my-3" />

                {/* Mobile Auth */}
                {status === "loading" ? (
                  <div className="h-10 animate-pulse rounded-md bg-muted" />
                ) : session?.user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getUserInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {session.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {session.user.userType}
                        </span>
                      </div>
                    </div>

                    <SheetClose asChild>
                      <Link
                        href={getDashboardLink()}
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {getDashboardLabel()}
                      </Link>
                    </SheetClose>

                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                      disabled={signingOut}
                      className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-destructive transition-colors hover:bg-destructive/5"
                    >
                      <LogOut className="h-4 w-4" />
                      {signingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <User className="h-4 w-4" />
                        Login
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/register"
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <UserPlus className="h-4 w-4" />
                        Register
                      </Link>
                    </SheetClose>
                  </>
                )}

                <Separator className="my-3" />
                <SheetClose asChild>
                  <Button asChild className="w-full rounded-full">
                    <Link href="/book">Book Now</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
