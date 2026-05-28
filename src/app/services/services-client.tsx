"use client";

import * as React from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
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
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface ServiceData {
  id: number;
  name: string;
  description: string;
  price: number;
  packageType: string;
  bedroomsMin: number;
  bedroomsMax: number;
  bathroomsMin: number;
  bathroomsMax: number;
  durationHours: number;
  features: string | null;
  isFeatured: boolean;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  ArrowRight,
  MapPin,
};

const packageColors: Record<string, string> = {
  basic: "bg-secondary text-secondary-foreground border-secondary/50",
  standard:
    "bg-primary/10 text-primary border-primary/20",
  premium:
    "bg-amber-50 text-amber-700 border-amber-200",
};

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Basic", value: "basic" },
  { label: "Standard", value: "standard" },
  { label: "Premium", value: "premium" },
] as const;

// ─── Client Component ────────────────────────────────────────────────────

export function ServicesClient({ services }: { services: ServiceData[] }) {
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredServices = React.useMemo(() => {
    return services.filter((s) => {
      const matchesFilter =
        activeFilter === "all" || s.packageType === activeFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [services, activeFilter, searchQuery]);

  const parseFeatures = (features: string | null): string[] => {
    if (!features) return [];
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
      return features.split(",").map((f) => f.trim());
    } catch {
      return features.split(",").map((f) => f.trim());
    }
  };

  return (
    <div>
      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full h-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Count ── */}
      <p className="text-sm text-muted-foreground mb-6">
        Showing {filteredServices.length} of {services.length} services
        {searchQuery && (
          <span>
            {" "}
            for &ldquo;<strong>{searchQuery}</strong>&rdquo;
          </span>
        )}
      </p>

      {/* ── Services Grid ── */}
      {filteredServices.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const IconComp = iconMap[service.icon] || Sparkles;
            const features = parseFeatures(service.features);
            return (
              <Card
                key={service.id}
                className="group relative overflow-hidden border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                {service.isFeatured && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Featured
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <IconComp className="h-6 w-6" />
                    </div>
                    <Badge
                      variant="outline"
                      className={packageColors[service.packageType] || ""}
                    >
                      {service.packageType.charAt(0).toUpperCase() +
                        service.packageType.slice(1)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg pr-20">
                    {service.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price & Duration */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold text-primary">
                        {CURRENCY}
                        {service.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {service.durationHours}h
                    </div>
                  </div>

                  {/* Room Ranges */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      {service.bedroomsMin === service.bedroomsMax
                        ? `${service.bedroomsMin} bed`
                        : `${service.bedroomsMin}-${service.bedroomsMax} beds`}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {service.bathroomsMin === service.bathroomsMax
                        ? `${service.bathroomsMin} bath`
                        : `${service.bathroomsMin}-${service.bathroomsMax} baths`}
                    </div>
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <ul className="space-y-1.5">
                      {features.slice(0, 4).map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {features.length > 4 && (
                        <li className="text-xs text-muted-foreground pl-6">
                          +{features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    asChild
                    className="w-full rounded-full group-hover:shadow-md transition-shadow"
                    size="lg"
                  >
                    <Link href={`/book?service=${service.id}`}>
                      Book Now
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <SlidersHorizontal className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No services found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Try adjusting your search or filter to find what you&apos;re
            looking for.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setActiveFilter("all");
              setSearchQuery("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
