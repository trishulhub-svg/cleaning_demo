// Helper utilities for PDF generation (client-side only)
// Used by client components to generate PDF exports
// Uses jsPDF + jspdf-autotable + html2canvas

import { format } from "date-fns";
import { CURRENCY } from "@/lib/constants";

/**
 * Create a styled jsPDF instance with standard fonts and page setup.
 */
export async function createPdf(
  title: string,
  subtitle?: string
) {
  // jspdf v4+ is ESM-only — must use dynamic import
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFillColor(34, 197, 94); // green-500
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GreenLeaf Cleaning Services", margin, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, margin, 20);

  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, margin, 25);
  }

  // Generation date on right
  doc.setFontSize(8);
  doc.text(
    `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    pageWidth - margin,
    12,
    { align: "right" }
  );

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return { doc, pageWidth, pageHeight, margin };
}

/**
 * Add page numbers to all pages in a jsPDF document.
 */
export function addPageNumbers(doc: any) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }
}

/**
 * Check if we need a new page and add one if close to bottom.
 * Returns true if a new page was added.
 */
export function ensureSpace(doc: any, y: number, needed: number, margin: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    return margin + 5;
  }
  return y;
}

/**
 * Add a section heading to the PDF.
 */
export function addSectionHeading(
  doc: any,
  y: number,
  title: string,
  margin: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const newY = ensureSpace(doc, y, 12, margin);

  doc.setFillColor(240, 253, 244); // green-50
  doc.rect(margin, newY - 4, doc.internal.pageSize.getWidth() - margin * 2, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(title, margin, newY + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  return newY + 10;
}

/**
 * Format currency value for PDF display.
 */
export function fmtCurrency(amount: number): string {
  return `${CURRENCY}${amount.toFixed(2)}`;
}

/**
 * Capture a DOM element as an image and embed in PDF.
 */
export async function captureElementToPdf(
  doc: any,
  elementId: string,
  y: number,
  margin: number
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const html2canvas = require("html2canvas");
    const el = document.getElementById(elementId);
    if (!el) return y;

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    const newY = ensureSpace(doc, y, imgHeight + 5, margin);

    doc.addImage(imgData, "PNG", margin, newY, imgWidth, imgHeight);
    return newY + imgHeight + 5;
  } catch (err) {
    console.error("Failed to capture element for PDF:", err);
    return y;
  }
}

/**
 * Download the PDF with the given filename.
 */
export function downloadPdf(doc: any, filename: string) {
  doc.save(filename);
}
