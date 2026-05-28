"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  APP_NAME,
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_PHONE,
  NAV_LINKS,
  WHATSAPP_NUMBER,
} from "@/lib/constants";
import type { SiteSettings } from "@/components/site-header";

const serviceLinks = [
  { label: "Regular Cleaning", href: "/services" },
  { label: "Deep Cleaning", href: "/services" },
  { label: "End of Tenancy", href: "/services" },
  { label: "Office Cleaning", href: "/services" },
  { label: "Carpet Cleaning", href: "/services" },
  { label: "After Builders", href: "/services" },
];

interface SiteFooterProps {
  settings: SiteSettings;
}

/** Strip non-digit characters from a phone number for WhatsApp URL */
function sanitizeWhatsAppNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/** Only show the social link if a valid URL is configured */
function getSocialUrl(url: string | undefined, fallbackPrefix: string): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim();
  // If it's already a full URL, use it directly
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // If it looks like a username/handle, build the URL
  if (trimmed.length > 0) {
    return `${fallbackPrefix}${trimmed}`;
  }
  return null;
}

export function SiteFooter({ settings }: SiteFooterProps) {
  const pathname = usePathname();

  // Hide public footer on staff and admin routes (they have their own layouts)
  if (pathname.startsWith('/staff') || pathname.startsWith('/admin')) {
    return null;
  }

  const displayAppName = settings?.companyName || APP_NAME;
  const displayEmail = settings?.companyEmail || COMPANY_EMAIL;
  const displayPhone = settings?.companyPhone || COMPANY_PHONE;
  const displayAddress = settings?.companyAddress || COMPANY_ADDRESS;
  const whatsappRaw = settings?.whatsappNumber || WHATSAPP_NUMBER;
  const whatsappClean = sanitizeWhatsAppNumber(whatsappRaw);

  // Build social links from settings — hide icon if no URL configured
  const facebookUrl = getSocialUrl(settings?.socialFacebook, "https://facebook.com/");
  const instagramUrl = getSocialUrl(settings?.socialInstagram, "https://instagram.com/");
  const twitterUrl = getSocialUrl(settings?.socialTwitter, "https://twitter.com/");

  const hasAnySocial = facebookUrl || instagramUrl || twitterUrl;

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white">{displayAppName}</span>
            </Link>
            <p className="text-sm leading-relaxed text-white/80 max-w-xs">
              Professional eco-friendly cleaning services for homes and
              offices across London. Trusted by thousands of happy customers
              since 2020.
            </p>
            {hasAnySocial && (
              <div className="flex items-center gap-3 pt-2">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {twitterUrl && (
                  <a
                    href={twitterUrl}
                    aria-label="Twitter"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/book"
                  className="text-sm text-white/75 transition-colors hover:text-white"
                >
                  Book a Clean
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Services
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${displayPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {displayPhone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${displayEmail}`}
                  className="flex items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {displayEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/75">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                {displayAddress}
              </li>
            </ul>
            <Separator className="bg-white/20" />
            {whatsappClean && (
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <Separator className="bg-white/15" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-white/60">
          &copy; 2026 {displayAppName} Services. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <Link href="/policies#privacy" className="hover:text-white/80 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/policies#terms" className="hover:text-white/80 transition-colors">
            Terms of Service
          </Link>
          <Link href="/policies" className="hover:text-white/80 transition-colors">
            Cancellation
          </Link>
        </div>
      </div>
    </footer>
  );
}
