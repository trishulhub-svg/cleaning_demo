import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  CreditCard,
  Lock,
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

// ─── Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: "Policies | GreenLeaf Cleaning",
  description:
    "Read our cancellation policy, payment policy, privacy policy, and terms of service.",
};

// ─── Page Component ──────────────────────────────────────────────────────

export default function PoliciesPage() {
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
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Legal Information
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Our <span className="text-primary">Policies</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              We believe in full transparency. Here you&apos;ll find all the
              information about our policies, terms, and commitments to you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Table of Contents ── */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground mr-1">
              Jump to:
            </span>
            {[
              { label: "Cancellation Policy", href: "#cancellation" },
              { label: "Payment Policy", href: "#payment" },
              { label: "Privacy Policy", href: "#privacy" },
              { label: "Terms of Service", href: "#terms" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Policies Content ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* ── Cancellation Policy ── */}
            <div id="cancellation">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Cancellation Policy</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: May 2025
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  We understand that plans change. That&apos;s why we&apos;ve
                  designed our cancellation policy to be fair and transparent.
                  Please review the details below before making a booking.
                </p>

                {/* 24h+ cancellation */}
                <div className="rounded-lg bg-green-50 border border-green-200 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">
                      Cancellation 24+ Hours Before
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      You will receive a <strong>90% refund</strong> of the
                      total booking amount.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      The 10% retention covers administrative and scheduling
                      costs.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      Refunds are processed within 5-7 business days to your
                      original payment method.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      You can easily rebook for another date at no extra
                      charge.
                    </li>
                  </ul>
                </div>

                {/* <24h cancellation */}
                <div className="rounded-lg bg-red-50 border border-red-200 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">
                      Cancellation Less Than 24 Hours Before
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-red-800">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      <strong>No refund</strong> will be issued for
                      cancellations made within 24 hours of the scheduled
                      booking.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      This is because our cleaners have already been assigned
                      and may have declined other work.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      Exceptions may be made for emergencies — please contact
                      us as soon as possible.
                    </li>
                  </ul>
                </div>

                {/* How to cancel */}
                <div className="space-y-3">
                  <h3 className="font-semibold">How to Cancel</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      Log into your account and navigate to &ldquo;My
                      Bookings&rdquo;.
                    </li>
                    <li>Find the booking you wish to cancel.</li>
                    <li>Click &ldquo;Cancel Booking&rdquo; and confirm.</li>
                    <li>
                      You&apos;ll receive an email confirmation with your
                      refund details.
                    </li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    Alternatively, contact us via phone or WhatsApp and
                    we&apos;ll process the cancellation for you.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Payment Policy ── */}
            <div id="payment">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Payment Policy</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: May 2025
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    At GreenLeaf Cleaning, we offer flexible payment options to
                    suit your preferences. Here&apos;s everything you need to
                    know about how payments work.
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Accepted Payment Methods</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold text-sm">Cash on Service</h4>
                      <p className="text-sm text-muted-foreground">
                        Pay in cash directly to your cleaner after the service
                        is completed. No upfront payment required.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold text-sm">Online Payment (Stripe)</h4>
                      <p className="text-sm text-muted-foreground">
                        Pay securely online via credit/debit card, Apple Pay, or
                        Google Pay. Get an instant{" "}
                        <strong className="text-primary">5% discount</strong>{" "}
                        when you pay online.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold text-sm">Card Payment on Site</h4>
                      <p className="text-sm text-muted-foreground">
                        Our cleaners carry mobile card readers so you can pay by
                        card at your doorstep.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold text-sm">Bank Transfer</h4>
                      <p className="text-sm text-muted-foreground">
                        For regular contracts and corporate clients, we also
                        accept bank transfers. Invoice provided.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Online Discount */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-2">
                  <h3 className="font-semibold text-primary">
                    5% Online Payment Discount
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    When you choose to pay online at the time of booking,
                    you&apos;ll automatically receive a 5% discount on the
                    total price. The discounted price will be shown before you
                    confirm your booking.
                  </p>
                </div>

                {/* Refund Timeline */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Refund Timeline</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong>Stripe payments:</strong> 5-7 business days to
                      your original payment method.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong>Card payments:</strong> 5-10 business days
                      depending on your bank.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong>Bank transfers:</strong> 3-5 business days.
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    All prices displayed on our website include VAT and are
                    final. There are no hidden fees, surge pricing, or
                    additional charges. The price you see is the price you pay.
                    Prices may vary for exceptionally large or heavily soiled
                    properties — we&apos;ll always communicate this upfront.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Privacy Policy ── */}
            <div id="privacy">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Privacy Policy</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: May 2025
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  GreenLeaf Cleaning Services Ltd (&ldquo;GreenLeaf&rdquo;,
                  &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
                  is committed to protecting your privacy. This Privacy Policy
                  explains how we collect, use, disclose, and safeguard your
                  information when you use our services and website.
                </p>

                {/* Information We Collect */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    1. Information We Collect
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">
                        Personal Information:
                      </strong>{" "}
                      When you create an account or make a booking, we may
                      collect your name, email address, phone number, and
                      home/work address.
                    </p>
                    <p>
                      <strong className="text-foreground">
                        Payment Information:
                      </strong>{" "}
                      Payment card details are processed securely by Stripe and
                      are never stored on our servers. We only receive a token
                      and confirmation of payment.
                    </p>
                    <p>
                      <strong className="text-foreground">
                        Usage Data:
                      </strong>{" "}
                      We automatically collect information about how you
                      interact with our website, including pages visited, time
                      spent, and browser type.
                    </p>
                    <p>
                      <strong className="text-foreground">
                        Communications:
                      </strong>{" "}
                      Records of any communications between you and our team,
                      including emails, chat messages, and phone calls.
                    </p>
                  </div>
                </div>

                {/* How We Use Your Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    2. How We Use Your Information
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      To process and manage your bookings.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      To communicate with you about your service, including
                      confirmations, reminders, and follow-ups.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      To process payments and issue refunds.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      To improve our services and website experience.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      To comply with legal obligations.
                    </li>
                  </ul>
                </div>

                {/* Data Sharing */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    3. Data Sharing & Third Parties
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We do not sell your personal data to third parties. We may
                    share your information only with:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong className="text-foreground">
                        Stripe:</strong> For secure payment processing.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong className="text-foreground">
                        Assigned Cleaners:</strong> Only the information needed
                      to perform the service (name, address, booking details).
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <strong className="text-foreground">
                        Legal Authorities:</strong> When required by law.
                    </li>
                  </ul>
                </div>

                {/* Data Security */}
                <div className="space-y-3">
                  <h3 className="font-semibold">4. Data Security</h3>
                  <p className="text-sm text-muted-foreground">
                    We implement industry-standard security measures including
                    SSL encryption, secure data storage, access controls, and
                    regular security audits to protect your personal information.
                  </p>
                </div>

                {/* Your Rights */}
                <div className="space-y-3">
                  <h3 className="font-semibold">5. Your Rights</h3>
                  <p className="text-sm text-muted-foreground">
                    Under the UK General Data Protection Regulation (UK GDPR),
                    you have the right to:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Access the personal data we hold about you.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Request correction of inaccurate data.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Request deletion of your data.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Object to or restrict processing of your data.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Data portability — receive your data in a
                      machine-readable format.
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    To exercise any of these rights, contact us at{" "}
                    <a
                      href="mailto:hello@greenleafcleaning.co.uk"
                      className="text-primary hover:underline"
                    >
                      hello@greenleafcleaning.co.uk
                    </a>
                    .
                  </p>
                </div>

                {/* Cookies */}
                <div className="space-y-3">
                  <h3 className="font-semibold">6. Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    We use essential cookies to operate our website and
                    optional analytics cookies to understand how visitors use
                    our site. You can manage your cookie preferences at any
                    time through your browser settings.
                  </p>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <h3 className="font-semibold">7. Contact</h3>
                  <p className="text-sm text-muted-foreground">
                    For any privacy-related concerns or questions, please
                    contact our Data Protection Officer at{" "}
                    <a
                      href="mailto:privacy@greenleafcleaning.co.uk"
                      className="text-primary hover:underline"
                    >
                      privacy@greenleafcleaning.co.uk
                    </a>{" "}
                    or write to: GreenLeaf Cleaning Services Ltd, 123 Green
                    Lane, London, EC1A 1BB.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Terms of Service ── */}
            <div id="terms">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Terms of Service</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: May 2025
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  These Terms of Service govern your use of GreenLeaf Cleaning
                  Services Ltd&apos;s website and cleaning services. By booking
                  a service or using our website, you agree to these terms.
                </p>

                {/* Services */}
                <div className="space-y-3">
                  <h3 className="font-semibold">1. Our Services</h3>
                  <p className="text-sm text-muted-foreground">
                    GreenLeaf Cleaning provides professional domestic and
                    commercial cleaning services across London. The specific
                    scope, duration, and price of each service are detailed in
                    the service description and confirmed at the time of
                    booking.
                  </p>
                </div>

                {/* Booking */}
                <div className="space-y-3">
                  <h3 className="font-semibold">2. Booking & Scheduling</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      All bookings are subject to availability.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      We reserve the right to adjust the scheduled time by up
                      to 1 hour if necessary, with advance notice.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      You must ensure someone is available to provide access
                      at the booked time, or provide clear access
                      instructions.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Same-day bookings may be subject to an additional
                      surcharge.
                    </li>
                  </ul>
                </div>

                {/* Satisfaction Guarantee */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-2">
                  <h3 className="font-semibold text-primary">
                    3. Satisfaction Guarantee
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    If you&apos;re not satisfied with our cleaning service,
                    please contact us within 24 hours of the service. We will
                    arrange for a re-clean of the areas of concern at no
                    additional charge. If we are unable to resolve the issue,
                    we will provide a partial or full refund at our discretion.
                  </p>
                </div>

                {/* Property & Liability */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    4. Property & Liability
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      GreenLeaf Cleaning holds £5 million public liability
                      insurance.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      We take reasonable care with your property, but are not
                      liable for pre-existing damage or wear and tear.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Any damage claims must be reported within 24 hours of the
                      service, with photographic evidence.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      We recommend securing valuables and fragile items before
                      each cleaning visit.
                    </li>
                  </ul>
                </div>

                {/* Client Responsibilities */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    5. Client Responsibilities
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Provide accurate access information and ensure our team
                      can enter the property.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Ensure pets are safely secured or inform us in advance
                      about any animals.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Inform us of any hazards, allergies, or special
                      requirements before the service.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Ensure the property is reasonably tidy before a standard
                      cleaning (pick up personal items, clothing, etc.).
                    </li>
                  </ul>
                </div>

                {/* Limitation of Liability */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    6. Limitation of Liability
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    To the maximum extent permitted by law, GreenLeaf Cleaning
                    Services Ltd shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages
                    arising out of or in connection with our services. Our
                    total liability for any claim shall not exceed the amount
                    paid for the specific service in question.
                  </p>
                </div>

                {/* Changes */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    7. Changes to Terms
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We may update these Terms of Service from time to time.
                    Significant changes will be communicated via email or a
                    prominent notice on our website. Your continued use of our
                    services after any changes constitutes acceptance of the
                    updated terms.
                  </p>
                </div>

                {/* Governing Law */}
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    8. Governing Law
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These terms are governed by and construed in accordance
                    with the laws of England and Wales. Any disputes shall be
                    subject to the exclusive jurisdiction of the English
                    courts.
                  </p>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <h3 className="font-semibold">9. Contact Us</h3>
                  <p className="text-sm text-muted-foreground">
                    If you have any questions about these Terms of Service,
                    please contact us at{" "}
                    <a
                      href="mailto:hello@greenleafcleaning.co.uk"
                      className="text-primary hover:underline"
                    >
                      hello@greenleafcleaning.co.uk
                    </a>{" "}
                    or call us at 07700 000 000.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
