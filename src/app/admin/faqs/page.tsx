"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CircleHelp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

const FAQ_CATEGORIES = ["General", "Booking", "Services", "Pricing", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-gray-100 text-gray-800 border-gray-200",
  Booking: "bg-blue-100 text-blue-800 border-blue-200",
  Services: "bg-purple-100 text-purple-800 border-purple-200",
  Pricing: "bg-amber-100 text-amber-800 border-amber-200",
  Other: "bg-teal-100 text-teal-800 border-teal-200",
};

function FaqsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number;
    question: string;
  }>({ open: false, id: 0, question: "" });

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs");
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.faqs);
      }
    } catch (err) {
      console.error("Failed to fetch FAQs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Auto-open edit modal from ?edit=X
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam) {
      const id = parseInt(editParam);
      const faq = faqs.find((f) => f.id === id);
      if (faq) {
        openEditModal(faq);
      }
    }
  }, [searchParams, faqs]);

  const openEditModal = (faq: Faq) => {
    setEditId(faq.id);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category);
    setFormSortOrder(faq.sortOrder.toString());
    setFormIsActive(faq.isActive);
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditId(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("General");
    setFormSortOrder("0");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        category: formCategory,
        sortOrder: parseInt(formSortOrder) || 0,
        isActive: formIsActive,
      };

      let res;
      if (editId) {
        res = await fetch("/api/admin/faqs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...body }),
        });
      } else {
        res = await fetch("/api/admin/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        toast.success(editId ? "FAQ updated successfully" : "FAQ created successfully");
        setModalOpen(false);
        fetchFaqs();
      } else {
        toast.error("Failed to save FAQ");
      }
    } catch (err) {
      console.error("Error saving FAQ", err);
      toast.error("Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (faq: Faq) => {
    try {
      const res = await fetch("/api/admin/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: faq.id, isActive: !faq.isActive }),
      });
      if (res.ok) {
        toast.success(
          faq.isActive ? "FAQ deactivated" : "FAQ activated"
        );
        fetchFaqs();
      }
    } catch (err) {
      console.error("Error toggling FAQ", err);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(
        `/api/admin/faqs?id=${deleteDialog.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("FAQ deleted successfully");
        fetchFaqs();
      } else {
        toast.error("Failed to delete FAQ");
      }
    } catch (err) {
      console.error("Error deleting FAQ", err);
    } finally {
      setDeleteDialog({ open: false, id: 0, question: "" });
    }
  };

  const filteredFaqs =
    categoryFilter === "all"
      ? faqs
      : faqs.filter((f) => f.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage frequently asked questions ({faqs.length} total)
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            categoryFilter === "all"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({faqs.length})
        </button>
        {FAQ_CATEGORIES.map((cat) => {
          const count = faqs.filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* FAQs Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="hidden md:table-cell">Answer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredFaqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <CircleHelp className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="text-gray-500">No FAQs found</p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={openAddModal}
                      >
                        Add your first FAQ
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFaqs.map((faq) => (
                    <TableRow key={faq.id} className={!faq.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{faq.id}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[250px] truncate text-sm font-medium text-gray-900">
                          {faq.question}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="max-w-[300px] truncate text-sm text-gray-500">
                          {faq.answer}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CATEGORY_COLORS[faq.category] || CATEGORY_COLORS.Other}
                        >
                          {faq.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-gray-500">{faq.sortOrder}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={faq.isActive ? "default" : "secondary"}
                          className={
                            faq.isActive
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }
                        >
                          {faq.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggle(faq)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-amber-600"
                            title={faq.isActive ? "Deactivate" : "Activate"}
                          >
                            {faq.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(faq)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                id: faq.id,
                                question: faq.question,
                              })
                            }
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Update the FAQ details below."
                : "Fill in the details to create a new FAQ."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Enter the question..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Enter the answer..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormIsActive(!formIsActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formIsActive ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formIsActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setFormIsActive(!formIsActive)}>
                {formIsActive ? "Active" : "Inactive"}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Saving..." : editId ? "Update FAQ" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteDialog.question}&rdquo;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FaqsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <FaqsContent />
    </Suspense>
  );
}
