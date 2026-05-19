"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Star,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY } from "@/lib/constants";

interface Service {
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
  isActive: boolean;
  sortOrder: number;
  _count: { bookings: number };
}

const PACKAGE_TYPES = ["basic", "standard", "premium"];

interface FormData {
  name: string;
  description: string;
  price: string;
  packageType: string;
  bedroomsMin: string;
  bedroomsMax: string;
  bathroomsMin: string;
  bathroomsMax: string;
  durationHours: string;
  features: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  price: "0",
  packageType: "standard",
  bedroomsMin: "1",
  bedroomsMax: "2",
  bathroomsMin: "1",
  bathroomsMax: "2",
  durationHours: "2",
  features: "",
  isFeatured: false,
  isActive: true,
  sortOrder: "0",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<Service | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error("Failed to fetch services", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAdd = async () => {
    if (!formData.name || !formData.description) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setAddModal(false);
        setFormData(emptyForm);
        fetchServices();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create service");
      }
    } catch (err) {
      console.error("Failed to add service", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal || !formData.name || !formData.description) return;
    setSubmitting(true);
    try {
      await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: editModal.id,
          action: "update",
          ...formData,
        }),
      });
      setEditModal(null);
      setFormData(emptyForm);
      fetchServices();
    } catch (err) {
      console.error("Failed to update service", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          action: "toggleActive",
        }),
      });
      fetchServices();
    } catch (err) {
      console.error("Failed to toggle service", err);
    }
  };

  const handleToggleFeatured = async (service: Service) => {
    try {
      await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          action: "toggleFeatured",
        }),
      });
      fetchServices();
    } catch (err) {
      console.error("Failed to toggle featured", err);
    }
  };

  const openEditModal = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      packageType: service.packageType,
      bedroomsMin: service.bedroomsMin.toString(),
      bedroomsMax: service.bedroomsMax.toString(),
      bathroomsMin: service.bathroomsMin.toString(),
      bathroomsMax: service.bathroomsMax.toString(),
      durationHours: service.durationHours.toString(),
      features: service.features || "",
      isFeatured: service.isFeatured,
      isActive: service.isActive,
      sortOrder: service.sortOrder.toString(),
    });
    setEditModal(service);
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your cleaning service packages ({services.length} total)
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData(emptyForm);
            setAddModal(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Services Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Duration</TableHead>
                  <TableHead className="hidden lg:table-cell">Size Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Bookings</TableHead>
                  <TableHead className="hidden sm:table-cell">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <p className="text-gray-500">No services found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.name}
                            {service.isFeatured && (
                              <Star className="ml-1.5 inline h-3 w-3 fill-amber-400 text-amber-400" />
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize"
                        >
                          {service.packageType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {CURRENCY}
                          {service.price.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {service.durationHours}h
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-gray-500">
                          {service.bedroomsMin}-{service.bedroomsMax} bed /{" "}
                          {service.bathroomsMin}-{service.bathroomsMax} bath
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            service.isActive ? "default" : "secondary"
                          }
                          className={
                            service.isActive
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {service._count.bookings}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-gray-500">
                          {service.sortOrder}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleFeatured(service)}
                            className="h-8 w-8"
                            title={
                              service.isFeatured
                                ? "Remove from Featured"
                                : "Mark as Featured"
                            }
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                service.isFeatured
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-400"
                              }`}
                            />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleActive(service)}
                            className="h-8 w-8"
                            title={
                              service.isActive ? "Deactivate" : "Activate"
                            }
                          >
                            {service.isActive ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(service)}
                            className="h-8 w-8"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
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

      {/* Add/Edit Service Modal */}
      <Dialog
        open={addModal || !!editModal}
        onOpenChange={(open) => {
          if (!open) {
            setAddModal(false);
            setEditModal(null);
            setFormData(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editModal ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              {editModal
                ? "Update the service details below."
                : "Create a new cleaning service package."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Standard Deep Clean"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe the service..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Package Type</Label>
                <Select
                  value={formData.packageType}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, packageType: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Min Beds</Label>
                  <Input
                    type="number"
                    value={formData.bedroomsMin}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        bedroomsMin: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Beds</Label>
                  <Input
                    type="number"
                    value={formData.bedroomsMax}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        bedroomsMax: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Min Baths</Label>
                  <Input
                    type="number"
                    value={formData.bathroomsMin}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        bathroomsMin: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Baths</Label>
                  <Input
                    type="number"
                    value={formData.bathroomsMax}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        bathroomsMax: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.durationHours}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      durationHours: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, sortOrder: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (comma-separated)</Label>
              <Input
                value={formData.features}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, features: e.target.value }))
                }
                placeholder="Kitchen, Bathroom, Vacuuming..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Featured</Label>
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, isFeatured: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddModal(false);
                setEditModal(null);
                setFormData(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editModal ? handleEdit : handleAdd}
              disabled={
                !formData.name || !formData.description || submitting
              }
            >
              {submitting
                ? "Saving..."
                : editModal
                  ? "Save Changes"
                  : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
