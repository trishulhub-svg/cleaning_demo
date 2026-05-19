"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle, MessageCircle } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

interface FaqClientProps {
  groupedFaqs: Record<string, FaqItem[]>;
  categories: readonly string[];
  categoryColors: Record<string, string>;
  totalFaqs: number;
}

// ─── Client Component ────────────────────────────────────────────────────

export function FaqClient({
  groupedFaqs,
  categories,
  categoryColors,
  totalFaqs,
}: FaqClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");

  // Flatten and filter FAQs
  const allFaqs = React.useMemo(() => {
    const flat: (FaqItem & { categoryKey: string })[] = [];
    for (const [cat, items] of Object.entries(groupedFaqs)) {
      for (const item of items) {
        flat.push({ ...item, categoryKey: cat });
      }
    }
    return flat;
  }, [groupedFaqs]);

  const filteredFaqs = React.useMemo(() => {
    return allFaqs.filter((faq) => {
      const matchesCategory =
        activeCategory === "All" || faq.categoryKey === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [allFaqs, activeCategory, searchQuery]);

  // Group filtered FAQs by category for display
  const filteredGrouped: Record<string, FaqItem[]> = {};
  for (const faq of filteredFaqs) {
    const cat = faq.categoryKey;
    if (!filteredGrouped[cat]) filteredGrouped[cat] = [];
    filteredGrouped[cat].push(faq);
  }

  const availableCategories = [
    "All",
    ...Object.keys(groupedFaqs).filter(
      (cat) => groupedFaqs[cat] && groupedFaqs[cat].length > 0
    ),
  ];

  return (
    <div>
      {/* ── Search ── */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 rounded-full h-11 text-base"
        />
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-input hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            {cat !== "All" && (
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  categoryColors[cat]?.split(" ")[0] || "bg-primary"
                }`}
              />
            )}
            {cat}
            {cat !== "All" && groupedFaqs[cat] && (
              <span
                className={`text-xs ${
                  activeCategory === cat
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                ({groupedFaqs[cat].length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Results Count ── */}
      <p className="text-sm text-muted-foreground mb-6">
        Showing {filteredFaqs.length} of {totalFaqs} questions
        {searchQuery && (
          <span>
            {" "}
            matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
          </span>
        )}
      </p>

      {/* ── FAQ Accordion by Category ── */}
      {Object.keys(filteredGrouped).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(filteredGrouped).map(([category, faqs]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  variant="outline"
                  className={`text-sm font-medium ${categoryColors[category] || ""}`}
                >
                  {category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {faqs.length} {faqs.length === 1 ? "question" : "questions"}
                </span>
              </div>

              <div className="rounded-xl border bg-card">
                <Accordion type="multiple" className="w-full">
                  {faqs.map((faq, idx) => (
                    <AccordionItem
                      key={faq.id}
                      value={`${category}-${faq.id}`}
                    >
                      <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/30 transition-colors">
                        <span className="text-left font-medium">
                          {faq.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <HelpCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No questions found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            We couldn&apos;t find any FAQs matching your search. Try a
            different query or contact us directly.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("All");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
