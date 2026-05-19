import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GreenLeaf Cleaning — Service Verification",
  description: "Scan QR code to verify and complete your cleaning service.",
};

/**
 * Standalone layout for public pages (QR scan, booking completion).
 * Uses a full-viewport overlay to hide the main site header/footer.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {children}
    </div>
  );
}
