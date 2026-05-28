"use client";

import { MessageCircle } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/constants";

interface FloatingWhatsAppProps {
  whatsappNumber?: string;
}

/** Strip non-digit characters from a phone number for WhatsApp URL */
function sanitizeWhatsAppNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function FloatingWhatsApp({ whatsappNumber }: FloatingWhatsAppProps) {
  const raw = whatsappNumber || WHATSAPP_NUMBER;
  const number = sanitizeWhatsAppNumber(raw);

  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent("Hi! I'd like to book a cleaning service.")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-300 hover:bg-green-600 hover:scale-110 hover:shadow-xl"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="sr-only">Chat on WhatsApp</span>
    </a>
  );
}
