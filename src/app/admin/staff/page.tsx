"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus,
  Pencil,
  Power,
  KeyRound,
  Search,
  Check,
  X,
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
import { Skeleton } from "@/components/ui/skeleton";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { bookings: number };
  status?: "working" | "available" | "off_duty";
}

interface AdminMember {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = ["cleaner", "supervisor"];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<StaffMember | null>(null);
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    staffId: number;
    staffName: string;
  }>({ open: false, staffId: 0, staffName: "" });
  const [tempPasswordDisplay, setTempPasswordDisplay] = useState<{
    open: boolean;
    password: string;
    name: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cleaner",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/status");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
        // Also fetch admins for super_admin display
        const adminsRes = await fetch("/api/admin/admins");
        if (adminsRes.ok) {
          const adminsData = await adminsRes.json();
          setAdmins(adminsData.admins || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAdd = async () => {
    if (!formData.name || !formData.email || !formData.phone) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setAddModal(false);
        setFormData({ name: "", email: "", phone: "", role: "cleaner" });
        setTempPasswordDisplay({
          open: true,
          password: data.tempPassword,
          name: data.staff.name,
        });
        fetchStaff();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create staff member");
      }
    } catch (err) {
      console.error("Failed to add staff", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal || !formData.name || !formData.email || !formData.phone)
      return;
    setSubmitting(true);
    try {
      await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: editModal.id,
          action: "update",
          ...formData,
        }),
      });
      setEditModal(null);
      setFormData({ name: "", email: "", phone: "", role: "cleaner" });
      fetchStaff();
    } catch (err) {
      console.error("Failed to update staff", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: member.id,
          action: "toggleActive",
        }),
      });
      fetchStaff();
    } catch (err) {
      console.error("Failed to toggle staff active status", err);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: resetModal.staffId,
          action: "resetPassword",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResetModal({ open: false, staffId: 0, staffName: "" });
        setTempPasswordDisplay({
          open: true,
          password: data.tempPassword,
          name: resetModal.staffName,
        });
      }
    } catch (err) {
      console.error("Failed to reset password", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (member: StaffMember) => {
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
    });
    setEditModal(member);
  };

  const filteredStaff = staff.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your cleaning staff ({staff.length} total)
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ name: "", email: "", phone: "", role: "cleaner" });
            setAddModal(true);
          }}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search staff by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Managers Section (super_admin only) */}
      {admins.length > 0 && (
        <Card className="py-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b bg-purple-50">
              <CardTitle className="text-base text-purple-900">Managers</CardTitle>
              <p className="text-xs text-purple-600 mt-0.5">Admin accounts managed by super admin</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                            {admin.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          {admin.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 capitalize">
                          {admin.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Bookings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <p className="text-gray-500">No staff members found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          {member.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {member.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {member.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize"
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.status === "working" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            🟢 Working
                          </Badge>
                        )}
                        {member.status === "available" && (
                          <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                            ⚪ Available
                          </Badge>
                        )}
                        {member.status === "off_duty" && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            🔴 Off Duty
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{member._count.bookings}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(member)}
                            className="h-8 w-8"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setResetModal({
                                open: true,
                                staffId: member.id,
                                staffName: member.name,
                              })
                            }
                            className="h-8 w-8"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleActive(member)}
                            className="h-8 w-8"
                            title={member.isActive ? "Deactivate" : "Activate"}
                          >
                            {member.isActive ? (
                              <X className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
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

      {/* Add Staff Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff account. A temporary password will be generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="john@greenleafcleaning.co.uk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="07700 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                !formData.name || !formData.email || !formData.phone || submitting
              }
            >
              {submitting ? "Creating..." : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog
        open={!!editModal}
        onOpenChange={(open) => !open && setEditModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirm Modal */}
      <Dialog
        open={resetModal.open}
        onOpenChange={(open) =>
          setResetModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the password for{" "}
              <strong>{resetModal.staffName}</strong>? A new temporary password
              will be generated and they will be required to change it on next
              login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setResetModal({ open: false, staffId: 0, staffName: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetPassword}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Display */}
      <Dialog
        open={!!tempPasswordDisplay?.open}
        onOpenChange={(open) =>
          !open && setTempPasswordDisplay(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Generated</DialogTitle>
            <DialogDescription>
              The temporary password for <strong>{tempPasswordDisplay?.name}</strong> is:
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-gray-100 p-4 text-center">
            <p className="font-mono text-lg font-bold tracking-wider">
              {tempPasswordDisplay?.password}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Please share this password securely with the staff member. They will
            be required to change it upon first login.
          </p>
          <DialogFooter>
            <Button
              onClick={() => setTempPasswordDisplay(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
