import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  COMPANY_PHONE,
  COMPANY_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/constants";
import { getSetting } from "@/lib/settings";
import { FaqClient } from "./faq-client";

// ─── Data Fetching ───────────────────────────────────────────────────────

async function getFaqs() {
  try {
    const faqs = await db.faq.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return faqs;
  } catch {
    return [];
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: "FAQ | GreenLeaf Cleaning",
  description:
    "Find answers to frequently asked questions about our cleaning services, booking process, pricing, and more.",
};

// ─── FAQ Categories ─────────────────────────────────────────────────────

const FAQ_CATEGORIES = [
  "General",
  "Booking",
  "Services",
  "Pricing",
  "Other",
] as const;

const categoryColors: Record<string, string> = {
  General: "bg-primary/10 text-primary",
  Booking: "bg-blue-50 text-blue-700",
  Services: "bg-amber-50 text-amber-700",
  Pricing: "bg-emerald-50 text-emerald-700",
  Other: "bg-purple-50 text-purple-700",
};

// ─── Page Component ──────────────────────────────────────────────────────

export default async function FaqPage() {
  const [faqs, companyPhone, companyEmail, whatsappNumber] = await Promise.all([
    getFaqs(),
    getSetting("company_phone", COMPANY_PHONE),
    getSetting("company_email", COMPANY_EMAIL),
    getSetting("whatsapp_number", WHATSAPP_NUMBER),
  ]);

  const cleanWhatsapp = (whatsappNumber || WHATSAPP_NUMBER).replace(/[^0-9]/g, "");

  const serializedFaqs = faqs.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    sortOrder: faq.sortOrder,
  }));

  // Group FAQs by category
  const groupedFaqs: Record<string, typeof serializedFaqs> = {};
  for (const faq of serializedFaqs) {
    const cat = faq.category || "Other";
    if (!groupedFaqs[cat]) groupedFaqs[cat] = [];
    groupedFaqs[cat].push(faq);
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center max-w-2xl mx-auto space-y-6">
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary"
            >
              Help Centre
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our services, booking
              process, pricing, and policies. Can&apos;t find what you need?
              We&apos;re just a message away.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ Content ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FaqClient
            groupedFaqs={groupedFaqs}
            categories={FAQ_CATEGORIES}
            categoryColors={categoryColors}
            totalFaqs={serializedFaqs.length}
          />
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Still Have Questions?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Our friendly team is available to help you with anything. Reach
              out via phone, email, or WhatsApp.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a href={`tel:${(companyPhone || COMPANY_PHONE).replace(/\s/g, "")}`}>
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-medium text-primary hover:bg-white/90 transition-colors">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call Us
                </button>
              </a>
              <a
                href={`mailto:${companyEmail || COMPANY_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3 text-base font-medium text-white hover:bg-white/10 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Us
              </a>
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("Hi! I have a question about your cleaning services.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3 text-base font-medium text-white hover:bg-white/10 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
