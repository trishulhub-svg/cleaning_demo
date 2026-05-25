import Link from "next/link";
import { db } from "@/lib/db";
import { CURRENCY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  BedDouble,
  Bath,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
} from "lucide-react";
import { ServicesClient } from "./services-client";

// ─── Data Fetching ───────────────────────────────────────────────────────

async function getServices() {
  try {
    return await db.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

// ─── Icon Mapper ─────────────────────────────────────────────────────────

function getServiceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("deep")) return Sparkles;
  if (lower.includes("end") || lower.includes("tenancy")) return ArrowRight;
  if (lower.includes("office") || lower.includes("commercial")) return MapPin;
  return Sparkles;
}

// ─── Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: "Our Cleaning Services | GreenLeaf Cleaning",
  description:
    "Explore our range of professional cleaning services including regular, deep, end of tenancy, and office cleaning across London.",
};

// ─── Page Component ──────────────────────────────────────────────────────

export default async function ServicesPage() {
  const services = await getServices();

  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    packageType: s.packageType,
    bedroomsMin: s.bedroomsMin,
    bedroomsMax: s.bedroomsMax,
    bathroomsMin: s.bathroomsMin,
    bathroomsMax: s.bathroomsMax,
    durationHours: s.durationHours,
    features: s.features,
    isFeatured: s.isFeatured,
    icon: getServiceIcon(s.name).displayName,
  }));

  return (
    <>
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Professional & Eco-Friendly
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Our Cleaning <span className="text-primary">Services</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From regular home maintenance to specialist deep cleaning, we
              offer a comprehensive range of services tailored to your needs.
              All with eco-friendly products and guaranteed results.
            </p>
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Satisfaction Guaranteed
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No Hidden Fees
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Eco-Friendly
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ServicesClient services={serializedServices} />
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Can&apos;t Find What You Need?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              We offer custom cleaning solutions tailored to your specific
              requirements. Get in touch and we&apos;ll create a bespoke
              package just for you.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full px-8 text-base h-12 bg-white text-primary hover:bg-white/90"
              >
                <Link href="/book">Book a Custom Clean</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-base h-12 border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/faq">View FAQ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
