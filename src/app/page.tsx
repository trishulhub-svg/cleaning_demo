import Link from "next/link";
import { db } from "@/lib/db";
import { APP_NAME, CURRENCY, COMPANY_PHONE, WHATSAPP_NUMBER } from "@/lib/constants";
import { getSetting } from "@/lib/settings";
import { QuickBookingForm } from "@/components/home/quick-booking-form";
import { FloatingWhatsApp } from "@/components/home/floating-whatsapp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  UserCheck,
  Leaf,
  Star,
  Award,
  Clock,
  CalendarCheck,
  Users,
  Sparkles,
  ChevronRight,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkle,
  ThumbsUp,
} from "lucide-react";

// ─── Data Fetching ───────────────────────────────────────────────────────

async function getFeaturedServices() {
  try {
    return await db.service.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
    });
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [bookingCount, userCount, staffCount] = await Promise.all([
      db.booking.count(),
      db.user.count(),
      db.staff.count({ where: { isActive: true } }),
    ]);
    return { bookingCount, userCount, staffCount };
  } catch {
    return { bookingCount: 2500, userCount: 1800, staffCount: 35 };
  }
}

async function getReviewStats() {
  try {
    const [avgResult, countResult] = await Promise.all([
      db.review.aggregate({
        where: { isApproved: true },
        _avg: { rating: true },
        _count: true,
      }),
      db.review.aggregate({
        _count: true,
      }),
    ]);
    return {
      averageRating: avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(1)) : 4.9,
      approvedReviewCount: avgResult._count || 0,
      totalReviewCount: countResult._count || 0,
    };
  } catch {
    return { averageRating: 4.9, approvedReviewCount: 0, totalReviewCount: 0 };
  }
}

async function getSiteSettings() {
  const [
    companyName,
    companyPhone,
    companyAddress,
    whatsappNumber,
    averageRatingSetting,
    reviewCountSetting,
  ] = await Promise.all([
    getSetting("company_name", "GreenLeaf Cleaning"),
    getSetting("company_phone", "07700 000 000"),
    getSetting("company_address", "123 Green Lane, London, EC1A 1BB"),
    getSetting("whatsapp_number", "447700000000"),
    getSetting("average_rating", ""),
    getSetting("review_count", ""),
  ]);

  return {
    companyName,
    companyPhone,
    companyAddress,
    whatsappNumber,
    averageRatingSetting: averageRatingSetting ? Number(averageRatingSetting) : null,
    reviewCountSetting: reviewCountSetting ? Number(reviewCountSetting) : null,
  };
}

// ─── Static Data ─────────────────────────────────────────────────────────

const trustBadges = [
  { icon: Shield, label: "Fully Insured" },
  { icon: UserCheck, label: "DBS Checked" },
  { icon: Leaf, label: "Eco Certified" },
  { icon: Star, label: "5-Star Rated" },
  { icon: Award, label: "Guaranteed" },
  { icon: Clock, label: "Punctual" },
];

const howItWorksSteps = [
  {
    step: 1,
    icon: CalendarCheck,
    title: "Book Online",
    description:
      "Choose your service, pick a date and time that works for you, and book in under 2 minutes.",
  },
  {
    step: 2,
    icon: Sparkles,
    title: "We Clean",
    description:
      "Our vetted, professional cleaners arrive on time with all equipment and eco-friendly products.",
  },
  {
    step: 3,
    icon: ThumbsUp,
    title: "Enjoy Results",
    description:
      "Sit back and relax while we transform your space. Not satisfied? We'll re-clean for free.",
  },
];

// ─── Service Icon Mapper ─────────────────────────────────────────────────

function getServiceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("deep")) return Sparkles;
  if (lower.includes("end") || lower.includes("tenancy")) return ArrowRight;
  if (lower.includes("office") || lower.includes("commercial")) return MapPin;
  return Sparkle;
}

// ─── Homepage Component ──────────────────────────────────────────────────

export default async function HomePage() {
  const [services, stats, reviewStats, siteSettings] = await Promise.all([
    getFeaturedServices(),
    getStats(),
    getReviewStats(),
    getSiteSettings(),
  ]);

  // Use DB-computed review stats if available, otherwise fall back to settings, then hardcoded
  const displayRating = reviewStats.approvedReviewCount > 0
    ? reviewStats.averageRating
    : (siteSettings.averageRatingSetting || 4.9);

  const displayReviewCount = siteSettings.reviewCountSetting || 2000;
  const displayAppName = siteSettings.companyName || APP_NAME;
  const displayPhone = siteSettings.companyPhone || COMPANY_PHONE;
  const displayWhatsapp = (siteSettings.whatsappNumber || WHATSAPP_NUMBER).replace(/[^0-9]/g, "");

  // Generate star icons for the hero rating display
  const fullStars = Math.floor(displayRating);
  const hasHalf = displayRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const whyChooseUs = [
    {
      icon: Shield,
      title: "Fully Insured & Vetted",
      description:
        "Every cleaner is DBS checked, fully insured, and vetted through our rigorous selection process.",
    },
    {
      icon: Leaf,
      title: "Eco-Friendly Products",
      description:
        "We use only environmentally friendly, non-toxic cleaning products that are safe for your family and pets.",
    },
    {
      icon: Award,
      title: "Satisfaction Guaranteed",
      description:
        "If you're not 100% happy with our service, we'll come back and re-clean for absolutely free.",
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description:
        "Book for any day of the week, including weekends. Same-day booking available for urgent needs.",
    },
    {
      icon: Star,
      title: "5-Star Consistency",
      description:
        `With an average rating of ${displayRating}/5 from over ${displayReviewCount.toLocaleString()} reviews, excellence is our standard.`,
    },
    {
      icon: Search,
      title: "Transparent Pricing",
      description:
        "No hidden fees or surprise charges. You see the full price before confirming your booking.",
    },
  ];

  const heroImage =
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80";

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary/10">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero Content */}
            <div className="space-y-8 text-center lg:text-left">
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary"
              >
                <Leaf className="mr-1.5 h-3.5 w-3.5" />
                Eco-Friendly & Professional
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Professional{" "}
                <span className="text-primary">Cleaning Services</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground mx-auto lg:mx-0">
                Transform your home or office with our expert cleaning team.
                Trusted by over{" "}
                <strong className="text-foreground">
                  {stats.userCount.toLocaleString()}+ customers
                </strong>{" "}
                across London. Book in under 2 minutes.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-8 text-base h-12"
                >
                  <Link href="/book">
                    Book a Clean
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 text-base h-12"
                >
                  <Link href="/services">View Services</Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 pt-2 lg:justify-start">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-primary/60 to-primary/30"
                      />
                    ))}
                  </div>
                  <div className="ml-1 text-sm">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: fullStars }).map((_, i) => (
                        <Star
                          key={`full-${i}`}
                          className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                      {hasHalf && (
                        <Star
                          key="half"
                          className="h-3.5 w-3.5 fill-yellow-400/50 text-yellow-400"
                        />
                      )}
                      {Array.from({ length: emptyStars }).map((_, i) => (
                        <Star
                          key={`empty-${i}`}
                          className="h-3.5 w-3.5 text-yellow-400/30"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {displayRating} from {displayReviewCount.toLocaleString()}+ reviews
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src={heroImage}
                  alt="Professional cleaning service"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 rounded-xl bg-white p-4 shadow-lg border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Satisfaction Guaranteed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Or your money back
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <badge.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              {
                value: `${(stats.bookingCount / 1000).toFixed(1)}K+`,
                label: "Bookings Completed",
                icon: CalendarCheck,
              },
              {
                value: `${(stats.userCount / 1000).toFixed(1)}K+`,
                label: "Happy Customers",
                icon: Users,
              },
              {
                value: `${displayRating}`,
                label: "Average Rating",
                icon: Star,
              },
              {
                value: `${stats.staffCount}+`,
                label: "Expert Staff",
                icon: Sparkle,
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-white/70" />
                <p className="text-3xl font-extrabold sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-white/75">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Services ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              Our Services
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Featured Cleaning Services
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              From regular home cleaning to specialised deep cleaning, we&apos;ve got
              everything you need to keep your space spotless.
            </p>
          </div>

          {services.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const IconComp = getServiceIcon(service.name);
                return (
                  <Card
                    key={service.id}
                    className="group relative overflow-hidden border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">
                          {CURRENCY}
                          {service.price.toFixed(0)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {service.durationHours}h
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                      >
                        <Link href={`/book?service=${service.id}`}>
                          Book Now
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Regular Cleaning",
                  description: "Weekly or bi-weekly home cleaning to maintain a spotless living space.",
                  price: 60,
                  duration: 2,
                },
                {
                  name: "Deep Cleaning",
                  description: "Thorough top-to-bottom cleaning for a fresh start.",
                  price: 150,
                  duration: 4,
                },
                {
                  name: "End of Tenancy",
                  description: "Comprehensive cleaning to get your deposit back.",
                  price: 220,
                  duration: 5,
                },
                {
                  name: "Office Cleaning",
                  description: "Professional workspace cleaning for productive environments.",
                  price: 90,
                  duration: 2,
                },
              ].map((service, idx) => {
                const IconComp = getServiceIcon(service.name);
                return (
                  <Card
                    key={idx}
                    className="group relative overflow-hidden border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">
                          {CURRENCY}{service.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {service.duration}h
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                      >
                        <Link href="/book">
                          Book Now
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <Link href="/services">
                View All Services
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-muted/30 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              Simple Process
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Getting your space cleaned has never been easier. Just three simple steps.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {howItWorksSteps.map((item, idx) => (
              <div key={item.step} className="relative text-center">
                {/* Connector line */}
                {idx < howItWorksSteps.length - 1 && (
                  <div className="absolute top-12 left-1/2 hidden h-0.5 w-full bg-primary/20 md:block" />
                )}
                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary/10" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary text-sm font-bold shadow">
                    {item.step}
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                <p className="mx-auto max-w-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us + Quick Booking ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Why Choose Us */}
            <div className="lg:col-span-3">
              <div className="mb-10">
                <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
                  Why {displayAppName}
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Why Choose Us
                </h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  We go above and beyond to deliver an exceptional cleaning
                  experience every single time.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {whyChooseUs.map((item) => (
                  <div
                    key={item.title}
                    className="group flex gap-4 rounded-xl border p-5 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Booking Form */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                <QuickBookingForm
                  services={services.map((s) => ({
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    description: s.description,
                    packageType: s.packageType,
                    durationHours: s.durationHours,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA / Contact Section ── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready for a Spotless Space?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Join thousands of happy customers who trust {displayAppName} for their
              cleaning needs. Book today and experience the difference.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full px-8 text-base h-12 bg-white text-primary hover:bg-white/90"
              >
                <Link href="/book">
                  Book Online Now
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <a
                href={`https://wa.me/${displayWhatsapp}?text=${encodeURIComponent("Hi! I'd like to book a cleaning service.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 text-base h-12 border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp Us
                </Button>
              </a>
              <a
                href={`tel:${displayPhone.replace(/\s/g, "")}`}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 text-base h-12 border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Call Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp whatsappNumber={displayWhatsapp} />
    </>
  );
}
