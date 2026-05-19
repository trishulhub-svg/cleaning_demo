import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-helpers";
import { BookingClient } from "./booking-client";

// ─── Data Fetching ───────────────────────────────────────────────────────

async function getAllServices() {
  try {
    return await db.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: "Book a Cleaning | GreenLeaf Cleaning",
  description:
    "Book your professional cleaning service in under 2 minutes. Choose your service, date, and time.",
};

// ─── Page Component ──────────────────────────────────────────────────────

interface BookPageProps {
  searchParams: Promise<{ service?: string }>;
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const { service: serviceId } = await searchParams;

  const allServices = await getAllServices();

  // Check if user is logged in
  const session = await getAuthSession();
  const isLoggedIn = !!session?.user;
  const loggedInUser = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
      }
    : null;

  const serializedServices = allServices.map((s) => ({
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
  }));

  const selectedServiceId = serviceId ? parseInt(serviceId, 10) : null;
  const selectedService = selectedServiceId
    ? allServices.find((s) => s.id === selectedServiceId)
    : null;

  return (
    <>
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Book Your <span className="text-primary">Cleaning</span>
            </h1>
            <p className="text-muted-foreground">
              Choose your service, pick a date and time, and you&apos;re all
              set. It only takes 2 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Booking Form ── */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <BookingClient
            services={serializedServices}
            initialServiceId={selectedServiceId}
            initialService={selectedService
              ? {
                  id: selectedService.id,
                  name: selectedService.name,
                  description: selectedService.description,
                  price: selectedService.price,
                  packageType: selectedService.packageType,
                  durationHours: selectedService.durationHours,
                }
              : null}
            isLoggedIn={isLoggedIn}
            loggedInUser={loggedInUser}
          />
        </div>
      </section>
    </>
  );
}
