"use client"

import * as React from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  CreditCard,
  Mail,
  Percent,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Save,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────

interface SettingEntry {
  value: string
  masked: boolean
  source: "db" | "env" | "default"
}

type SettingsMap = Record<string, SettingEntry>

// ─── Component ─────────────────────────────────────────────────────

export function SettingsPageClient() {
  const [settings, setSettings] = React.useState<SettingsMap>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState<string | null>(null)
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set())
  const [editValues, setEditValues] = React.useState<Record<string, string>>({})
  const [passwordModal, setPasswordModal] = React.useState(false)
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [verifyingPassword, setVerifyingPassword] = React.useState(false)
  const [pendingSaveAction, setPendingSaveAction] = React.useState<(() => void) | null>(null)
  const [testEmailLoading, setTestEmailLoading] = React.useState(false)

  // Fetch settings on mount
  React.useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
        // Pre-fill edit values with current unmasked values
        const edits: Record<string, string> = {}
        for (const [k, v] of Object.entries(data.data as SettingsMap)) {
          edits[k] = v.value
        }
        setEditValues(edits)
      }
    } catch {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  function toggleReveal(key: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleEdit(key: string, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }))
  }

  function needsPasswordVerification(): boolean {
    const sensitiveKeys = ["stripe_secret_key", "stripe_webhook_secret", "smtp_pass", "smtp_user"]
    return sensitiveKeys.some((k) => {
      const current = settings[k]?.value ?? ""
      const edited = editValues[k] ?? ""
      return edited !== current && edited !== ""
    })
  }

  function initiateSave(saveFn: () => void) {
    if (needsPasswordVerification()) {
      setPendingSaveAction(() => saveFn)
      setPasswordModal(true)
      setConfirmPassword("")
      setPasswordError("")
    } else {
      saveFn()
    }
  }

  async function saveWithPassword() {
    if (!confirmPassword) {
      setPasswordError("Password is required")
      return
    }

    setVerifyingPassword(true)
    setPasswordError("")

    try {
      const res = await fetch("/api/admin/settings/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setPasswordError(data.error || "Verification failed")
        return
      }

      // Password verified, execute pending save
      setPasswordModal(false)
      setConfirmPassword("")
      if (pendingSaveAction) {
        pendingSaveAction()
      }
    } catch {
      setPasswordError("Verification failed. Please try again.")
    } finally {
      setVerifyingPassword(false)
    }
  }

  async function saveCompanySettings() {
    const keys = ["company_name", "company_email", "company_phone", "company_address", "whatsapp_number"]
    const updates: Record<string, string> = {}

    for (const k of keys) {
      if (editValues[k] !== (settings[k]?.value ?? "")) {
        updates[k] = editValues[k]
      }
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save")
      return
    }

    await saveSettings(updates)
  }

  async function savePaymentSettings() {
    const keys = ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret"]
    const updates: Record<string, string> = {}

    for (const k of keys) {
      const current = settings[k]?.value ?? ""
      const edited = editValues[k] ?? ""
      // Skip if value looks masked (hasn't been changed)
      if (edited !== current || !settings[k]?.masked) {
        updates[k] = edited
      }
    }

    await doSavePaymentSettings(updates)
  }

  async function doSavePaymentSettings(updates: Record<string, string>) {
    // Filter out unchanged values
    const realUpdates: Record<string, string> = {}
    for (const [k, v] of Object.entries(updates)) {
      const current = settings[k]?.value ?? ""
      if (v !== current && v !== "") {
        realUpdates[k] = v
      }
    }

    if (Object.keys(realUpdates).length === 0) {
      toast.info("No changes to save")
      return
    }

    await saveSettings(realUpdates)
  }

  async function saveEmailSettings() {
    const keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_name", "smtp_from_email"]
    const updates: Record<string, string> = {}

    for (const k of keys) {
      const current = settings[k]?.value ?? ""
      const edited = editValues[k] ?? ""
      if (edited !== current || !settings[k]?.masked) {
        updates[k] = edited
      }
    }

    const realUpdates: Record<string, string> = {}
    for (const [k, v] of Object.entries(updates)) {
      const current = settings[k]?.value ?? ""
      if (v !== current && v !== "") {
        realUpdates[k] = v
      }
    }

    if (Object.keys(realUpdates).length === 0) {
      toast.info("No changes to save")
      return
    }

    await saveSettings(realUpdates)
  }

  async function savePricingSettings() {
    const val = editValues["discount_percentage"] ?? "5"
    const current = settings["discount_percentage"]?.value ?? "5"

    if (val === current) {
      toast.info("No changes to save")
      return
    }

    await saveSettings({ discount_percentage: val })
  }

  async function saveSettings(updates: Record<string, string>) {
    const needsPwd = Object.keys(updates).some((k) =>
      ["stripe_secret_key", "stripe_webhook_secret", "smtp_pass", "smtp_user"].includes(k)
    )

    if (needsPwd) {
      setPendingSaveAction(() => () => doSave(updates))
      setPasswordModal(true)
      setConfirmPassword("")
      setPasswordError("")
      return
    }

    await doSave(updates)
  }

  async function doSave(updates: Record<string, string>) {
    setSaving("save")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates, confirmPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to save settings")
        return
      }

      toast.success("Settings saved successfully")
      await fetchSettings()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(null)
    }
  }

  async function handleTestEmail() {
    setTestEmailLoading(true)
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Test email sent successfully")
      } else {
        toast.error(data.error || "Failed to send test email")
      }
    } catch {
      toast.error("Failed to send test email")
    } finally {
      setTestEmailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application configuration</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4 hidden sm:block" />
            Company
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4 hidden sm:block" />
            Email
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Percent className="h-4 w-4 hidden sm:block" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* ─── Company Tab ─── */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic company details shown across the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={editValues["company_name"] ?? ""}
                    onChange={(e) => handleEdit("company_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_email">Company Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={editValues["company_email"] ?? ""}
                    onChange={(e) => handleEdit("company_email", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_phone">Company Phone</Label>
                  <Input
                    id="company_phone"
                    value={editValues["company_phone"] ?? ""}
                    onChange={(e) => handleEdit("company_phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                  <Input
                    id="whatsapp_number"
                    value={editValues["whatsapp_number"] ?? ""}
                    onChange={(e) => handleEdit("whatsapp_number", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Input
                  id="company_address"
                  value={editValues["company_address"] ?? ""}
                  onChange={(e) => handleEdit("company_address", e.target.value)}
                />
              </div>
              <Button onClick={() => saveCompanySettings()} disabled={saving === "save"}>
                {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Company Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Payments Tab ─── */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Configuration
              </CardTitle>
              <CardDescription>
                Manage your Stripe API keys. Secret keys require password verification to save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SourceBadge source={settings["stripe_publishable_key"]?.source} />

              <div className="space-y-2">
                <Label htmlFor="stripe_publishable_key">Publishable Key</Label>
                <Input
                  id="stripe_publishable_key"
                  value={editValues["stripe_publishable_key"] ?? ""}
                  onChange={(e) => handleEdit("stripe_publishable_key", e.target.value)}
                  placeholder="pk_test_..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Safe to expose in client-side code</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="stripe_secret_key">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="stripe_secret_key"
                    type={revealedKeys.has("stripe_secret_key") ? "text" : "password"}
                    value={editValues["stripe_secret_key"] ?? ""}
                    onChange={(e) => handleEdit("stripe_secret_key", e.target.value)}
                    placeholder="sk_test_••••0FgC"
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleReveal("stripe_secret_key")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {revealedKeys.has("stripe_secret_key") ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <SourceBadge source={settings["stripe_secret_key"]?.source} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe_webhook_secret">Webhook Secret</Label>
                <div className="relative">
                  <Input
                    id="stripe_webhook_secret"
                    type={revealedKeys.has("stripe_webhook_secret") ? "text" : "password"}
                    value={editValues["stripe_webhook_secret"] ?? ""}
                    onChange={(e) => handleEdit("stripe_webhook_secret", e.target.value)}
                    placeholder="whsec_••••0FgC"
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleReveal("stripe_webhook_secret")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {revealedKeys.has("stripe_webhook_secret") ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <SourceBadge source={settings["stripe_webhook_secret"]?.source} />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Saving secret keys requires your current password for verification.
                </p>
              </div>

              <Button onClick={() => savePaymentSettings()} disabled={saving === "save"}>
                {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Payment Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Email Tab ─── */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email / SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure outgoing email settings. SMTP password requires verification to save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={editValues["smtp_host"] ?? ""}
                    onChange={(e) => handleEdit("smtp_host", e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                  <SourceBadge source={settings["smtp_host"]?.source} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    value={editValues["smtp_port"] ?? ""}
                    onChange={(e) => handleEdit("smtp_port", e.target.value)}
                    placeholder="587"
                  />
                  <SourceBadge source={settings["smtp_port"]?.source} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP Username</Label>
                  <div className="relative">
                    <Input
                      id="smtp_user"
                      type={revealedKeys.has("smtp_user") ? "text" : "password"}
                      value={editValues["smtp_user"] ?? ""}
                      onChange={(e) => handleEdit("smtp_user", e.target.value)}
                      placeholder="user@example.com"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("smtp_user")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {revealedKeys.has("smtp_user") ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <SourceBadge source={settings["smtp_user"]?.source} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_pass">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp_pass"
                      type={revealedKeys.has("smtp_pass") ? "text" : "password"}
                      value={editValues["smtp_pass"] ?? ""}
                      onChange={(e) => handleEdit("smtp_pass", e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("smtp_pass")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {revealedKeys.has("smtp_pass") ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <SourceBadge source={settings["smtp_pass"]?.source} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input
                    id="smtp_from_name"
                    value={editValues["smtp_from_name"] ?? ""}
                    onChange={(e) => handleEdit("smtp_from_name", e.target.value)}
                    placeholder="GreenLeaf Cleaning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">From Email</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    value={editValues["smtp_from_email"] ?? ""}
                    onChange={(e) => handleEdit("smtp_from_email", e.target.value)}
                    placeholder="noreply@greenleafcleaning.co.uk"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveEmailSettings()} disabled={saving === "save"}>
                  {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Email Settings
                </Button>
                <Button variant="outline" onClick={handleTestEmail} disabled={testEmailLoading}>
                  {testEmailLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Pricing Tab ─── */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Pricing & Discounts
              </CardTitle>
              <CardDescription>
                Configure the online payment discount percentage shown on the booking page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="discount_percentage">Online Payment Discount (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="discount_percentage"
                    type="number"
                    min={0}
                    max={100}
                    value={editValues["discount_percentage"] ?? "5"}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value)))
                      handleEdit("discount_percentage", String(val))
                    }}
                    className="w-24 text-center"
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set to 0% to disable the online payment discount. Current: {settings["discount_percentage"]?.value ?? "5"}%
                </p>
              </div>

              {Number(editValues["discount_percentage"] ?? 5) > 0 ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 max-w-md">
                  <p className="text-sm text-green-800 font-medium mb-1">
                    Preview on Booking Page
                  </p>
                  <p className="text-xs text-green-700">
                    Pay Online ({editValues["discount_percentage"] ?? 5}% discount) will be shown to customers.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-w-md">
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    No Discount
                  </p>
                  <p className="text-xs text-gray-500">
                    Online payment discount is disabled. The discount badge will not appear on the booking page.
                  </p>
                </div>
              )}

              <Button onClick={() => savePricingSettings()} disabled={saving === "save"}>
                {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pricing Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Password Verification Modal ─── */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPasswordModal(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verify Your Identity
              </CardTitle>
              <CardDescription>
                Enter your current password to save sensitive settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {passwordError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Current Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveWithPassword()
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPasswordModal(false)}>
                  Cancel
                </Button>
                <Button onClick={saveWithPassword} disabled={verifyingPassword || !confirmPassword}>
                  {verifyingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  Verify & Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Helper Component ──────────────────────────────────────────────

function SourceBadge({ source }: { source?: "db" | "env" | "default" }) {
  if (!source || source === "default") return null
  return (
    <Badge variant="outline" className="text-xs">
      {source === "env" ? "from env" : "from database"}
    </Badge>
  )
}
