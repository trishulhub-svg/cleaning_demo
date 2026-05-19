import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Leaf,
  Shield,
  Heart,
  Award,
  Users,
  Eye,
  Target,
  Lightbulb,
  Star,
  CheckCircle2,
  ChevronRight,
  CalendarCheck,
  MessageCircle,
  Phone,
} from "lucide-react";

// ─── Static Data ─────────────────────────────────────────────────────────

const values = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description:
      "We believe in protecting the planet while we clean. Every product we use is biodegradable, non-toxic, and cruelty-free. We continuously seek greener alternatives and minimise waste in all our operations.",
  },
  {
    icon: Heart,
    title: "Customer Happiness",
    description:
      "Your satisfaction is our top priority. We go above and beyond on every job, and if you're not completely happy, we'll come back and re-clean for free. No questions asked.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "Clear pricing, no hidden fees, and honest communication at every step. We want you to feel confident and informed from your first enquiry to the final walkthrough.",
  },
  {
    icon: Award,
    title: "Excellence",
    description:
      "We invest in the best training, equipment, and products so every clean meets the highest professional standards. Our 4.9/5 rating speaks for itself.",
  },
];

const teamMembers = [
  {
    name: "Sarah Mitchell",
    role: "Founder & CEO",
    bio: "Former environmental consultant turned cleaning entrepreneur. Sarah founded GreenLeaf in 2020 with a mission to make eco-friendly cleaning accessible to everyone.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "James Okafor",
    role: "Head of Operations",
    bio: "With 10+ years in facilities management, James ensures every team delivers consistently exceptional results across all of London.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "Emma Chen",
    role: "Customer Success Manager",
    bio: "Emma leads our customer happiness team, making sure every client feels heard, valued, and delighted with their GreenLeaf experience.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "David Williams",
    role: "Training & Quality Lead",
    bio: "David designs our rigorous training programmes and conducts quality audits to maintain our industry-leading standards.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  },
];

const certifications = [
  { label: "ISO 14001", sublabel: "Environmental Management" },
  { label: "DBS Checked", sublabel: "All Staff Vetted" },
  { label: "Fully Insured", sublabel: "£5M Public Liability" },
  { label: "SafeContractor", sublabel: "Approved Contractor" },
  { label: "EcoCertified", sublabel: "Green Products Only" },
  { label: "Trustpilot", sublabel: "4.9/5 Rating" },
];

const milestones = [
  { year: "2020", title: "Founded", description: "GreenLeaf Cleaning was born in London with 3 cleaners and a dream." },
  { year: "2021", title: "500 Customers", description: "Reached our first major milestone — 500 happy customers across London." },
  { year: "2022", title: "Team of 20", description: "Expanded our team and launched deep cleaning & end of tenancy services." },
  { year: "2023", title: "2,000+ Bookings", description: "Passed 2,000 completed bookings with a consistent 4.9/5 rating." },
  { year: "2024", title: "Award Winning", description: "Recognised as London's Best Eco Cleaning Service by London Business Awards." },
  { year: "2025", title: "35+ Staff", description: "Growing team serving all London boroughs with the same dedication to quality." },
];

// ─── Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: "About Us | GreenLeaf Cleaning",
  description:
    "Learn about GreenLeaf Cleaning Services — our story, mission, values, and the team behind London's most trusted eco-friendly cleaning company.",
};

// ─── Page Component ──────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6 text-center lg:text-left">
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary"
              >
                <Heart className="mr-1.5 h-3.5 w-3.5" />
                Our Story
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                About{" "}
                <span className="text-primary">GreenLeaf Cleaning</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground mx-auto lg:mx-0">
                We&apos;re on a mission to make professional, eco-friendly
                cleaning the standard — not the exception. Since 2020,
                we&apos;ve been transforming homes and offices across London
                while protecting the planet.
              </p>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                  alt="GreenLeaf Cleaning team at work"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Story ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80"
                  alt="Eco-friendly cleaning products"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-xl bg-white p-4 shadow-lg border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Eco-Friendly</p>
                    <p className="text-xs text-muted-foreground">Since Day 1</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <Badge variant="outline" className="border-primary/20 text-primary">
                Our Journey
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Born From a Simple Idea
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  GreenLeaf Cleaning was founded in 2020 by Sarah Mitchell, an
                  environmental consultant who was frustrated by the lack of
                  genuinely eco-friendly cleaning options in London.
                </p>
                <p>
                  &ldquo;I wanted a clean home without compromising my
                  values,&rdquo; Sarah explains. &ldquo;Every cleaning service
                  I tried used harsh chemicals that weren&apos;t safe for my
                  kids, my pets, or the planet. So I decided to build the
                  company I wished existed.&rdquo;
                </p>
                <p>
                  Starting with just 3 cleaners and a van full of plant-based
                  products, GreenLeaf has grown into a team of 35+ professionals
                  serving all London boroughs — but our commitment to
                  sustainability, quality, and customer happiness hasn&apos;t
                  changed one bit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission & Values ── */}
      <section className="bg-muted/30 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              What Drives Us
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Our Mission & Values
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              These are the principles that guide everything we do — from the
              products we choose to the people we hire.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <Card
                key={value.title}
                className="group border hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team Section ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              Our People
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Meet the Team
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Passionate professionals dedicated to delivering exceptional
              cleaning experiences every day.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member) => (
              <Card
                key={member.name}
                className="group text-center border hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                <CardHeader className="items-center pb-2">
                  <div className="mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {member.role}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Milestones / Timeline ── */}
      <section className="bg-muted/30 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              Our Journey
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Milestones
            </h2>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 sm:-translate-x-px" />

            <div className="space-y-8">
              {milestones.map((milestone, idx) => (
                <div
                  key={milestone.year}
                  className={`relative flex items-start gap-6 sm:gap-0 ${
                    idx % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md z-10">
                    <Star className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div
                    className={`ml-12 sm:ml-0 sm:w-[calc(50%-2rem)] ${
                      idx % 2 === 0 ? "sm:pr-8 sm:text-right" : "sm:pl-8"
                    }`}
                  >
                    <span className="text-sm font-bold text-primary">
                      {milestone.year}
                    </span>
                    <h3 className="text-lg font-bold mt-1">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Certifications & Badges ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">
              Trust & Quality
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Certifications & Trust Badges
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              We maintain the highest industry standards to give you complete
              peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {certifications.map((cert) => (
              <div
                key={cert.label}
                className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cert.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {cert.sublabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
              Ready to Experience the GreenLeaf Difference?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Join over 1,800 happy customers who trust us with their homes and
              offices every week.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full px-8 text-base h-12 bg-white text-primary hover:bg-white/90"
              >
                <Link href="/book">
                  Book Your First Clean
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-base h-12 border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
