"use client";

import * as React from "react";
import Link from "next/link";
import { CURRENCY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CalendarIcon,
  CreditCard,
  Banknote,
  MapPin,
  FileText,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Percent,
  Shield,
  User,
  Mail,
  Phone,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────

interface ServiceOption {
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
}

interface InitialService {
  id: number;
  name: string;
  description: string;
  price: number;
  packageType: string;
  durationHours: number;
}

// ─── Address Autocomplete Types ──────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
  };
}

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function isToday(date: Date | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isTimeSlotPast(timeSlot: string): boolean {
  const now = new Date();
  const [h, m] = timeSlot.split(":").map(Number);
  return (
    now.getFullYear() === new Date().getFullYear() &&
    now.getMonth() === new Date().getMonth() &&
    now.getDate() === new Date().getDate() &&
    (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()))
  );
}

// ─── Booking Form Component ──────────────────────────────────────────────

export function BookingClient({
  services,
  initialServiceId,
  initialService,
  isLoggedIn,
  loggedInUser,
}: {
  services: ServiceOption[];
  initialServiceId: number | null;
  initialService: InitialService | null;
  isLoggedIn: boolean;
  loggedInUser: { name: string; email: string } | null;
}) {
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(
    initialServiceId ? String(initialServiceId) : ""
  );
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );
  const [selectedTime, setSelectedTime] = React.useState<string>("");
  const [address, setAddress] = React.useState("");
  const [accessNotes, setAccessNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<
    "cash" | "online"
  >("cash");
  const [guestName, setGuestName] = React.useState(
    loggedInUser?.name || ""
  );
  const [guestEmail, setGuestEmail] = React.useState(
    loggedInUser?.email || ""
  );
  const [guestPhone, setGuestPhone] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  // Address autocomplete state
  const [addressQuery, setAddressQuery] = React.useState("");
  const [addressSuggestions, setAddressSuggestions] = React.useState<
    NominatimResult[]
  >([]);
  const [addressLoading, setAddressLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const addressInputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const [discountPercent, setDiscountPercent] = React.useState<number>(5);

  // Fetch discount percentage from public settings
  React.useEffect(() => {
    async function fetchDiscount() {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.data.discount_percentage === "number") {
            setDiscountPercent(data.data.discount_percentage);
          }
        }
      } catch {
        // Fallback to default 5%
      }
    }
    fetchDiscount();
  }, []);

  const selectedService = services.find(
    (s) => s.id === parseInt(selectedServiceId, 10)
  );

  const basePrice = selectedService?.price ?? 0;
  const effectiveDiscountPercent = paymentMethod === "online" ? discountPercent : 0;
  const discountAmount = basePrice * (effectiveDiscountPercent / 100);
  const totalPrice = basePrice - discountAmount;

  // ─── Address Autocomplete (Debounced) ───────────────────────────────

  React.useEffect(() => {
    if (!addressQuery.trim() || addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&countrycodes=gb&limit=5&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en-GB",
            },
          }
        );
        const data: NominatimResult[] = await res.json();
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressQuery]);

  // Close suggestions on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectAddress(suggestion: NominatimResult) {
    setAddress(suggestion.display_name);
    setAddressQuery("");
    setShowSuggestions(false);
  }

  function handleAddressInputChange(value: string) {
    setAddress(value);
    setAddressQuery(value);
  }

  // ─── Form Logic ─────────────────────────────────────────────────────

  const formatTimeSlot = (time: string) => {
    const [h] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12}:00 ${suffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !address) return;

    // Guest validation: if not logged in, all guest fields are required
    if (!isLoggedIn) {
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
        alert("Please fill in your name, email, and phone number to continue.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          bookingDate: format(selectedDate, "yyyy-MM-dd"),
          bookingTime: selectedTime + ":00",
          address,
          accessNotes,
          paymentMethod: paymentMethod === "online" ? "stripe" : "cash",
          totalPrice,
          guestName: guestName || undefined,
          guestEmail: guestEmail || undefined,
          guestPhone: guestPhone || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to checkout or confirmation based on payment method
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          window.location.href = `/booking-confirmation?bookingId=${data.bookingId}`;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    selectedServiceId &&
    selectedDate &&
    selectedTime &&
    address.trim().length > 0 &&
    (isLoggedIn || (guestName.trim() && guestEmail.trim() && guestPhone.trim()));

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Left: Booking Form ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Fields (only when NOT logged in) */}
          {!isLoggedIn && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Your Details
                </CardTitle>
                <CardDescription>
                  Please provide your contact information so we can confirm your booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="guest-name"
                        placeholder="John Smith"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="pl-9"
                        required={!isLoggedIn}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-phone">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="guest-phone"
                        placeholder="07700 000 000"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="pl-9"
                        required={!isLoggedIn}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="guest-email"
                      type="email"
                      placeholder="john@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="pl-9"
                      required={!isLoggedIn}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can also{" "}
                  <Link href="/login" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    log in
                  </Link>{" "}
                  to access your booking history and manage future bookings.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Select Service
              </CardTitle>
              <CardDescription>
                Choose the cleaning service that best fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {CURRENCY}
                          {service.price} / {service.durationHours}h
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedService && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{selectedService.name}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {selectedService.packageType.charAt(0).toUpperCase() +
                          selectedService.packageType.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {CURRENCY}
                        {selectedService.price}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedService.durationHours} hours
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedService.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Date & Time
              </CardTitle>
              <CardDescription>
                Pick a convenient date and time slot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-11"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "EEEE, d MMMM yyyy")
                        : "Pick a date..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <Label>Select Time</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const disabled = isToday(selectedDate) && isTimeSlotPast(time);
                    return (
                    <button
                      key={time}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                        disabled
                          ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                          : selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-input hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      {formatTimeSlot(time)}
                    </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Notes with Autocomplete */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location Details
              </CardTitle>
              <CardDescription>
                Where should our cleaners go?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address with Autocomplete */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Full Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={addressInputRef}
                      id="address"
                      placeholder="Start typing your address for suggestions..."
                      value={address}
                      onChange={(e) => handleAddressInputChange(e.target.value)}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      required
                      className="pl-9 pr-9"
                    />
                    {address && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddress("");
                          setAddressQuery("");
                          setAddressSuggestions([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {addressLoading && (
                      <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-60 overflow-y-auto"
                    >
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {suggestion.display_name.split(", ").slice(0, 3).join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.display_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  UK addresses only. Start typing to see suggestions powered by OpenStreetMap.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-notes">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Access Notes
                  </span>
                </Label>
                <Textarea
                  id="access-notes"
                  placeholder="e.g. Ring buzzer #42, key under the mat, dog in the back garden..."
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Help our cleaners find your property and access it easily.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Choose how you&apos;d like to pay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(val) =>
                  setPaymentMethod(val as "cash" | "online")
                }
                className="space-y-3"
              >
                {/* Pay After Service */}
                <label
                  htmlFor="cash"
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value="cash" id="cash" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        Pay After Service
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pay in cash or by card directly to the cleaner after the
                      service is completed. No upfront payment required.
                    </p>
                  </div>
                </label>

                {/* Pay Online Now */}
                <label
                  htmlFor="online"
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    paymentMethod === "online"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem
                    value="online"
                    id="online"
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        Pay Online ({discountPercent}% discount)
                      </span>
                      {discountPercent > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          <Percent className="h-3 w-3 mr-0.5" />
                          {discountPercent}% OFF
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {discountPercent > 0
                        ? `Pay securely via Stripe and get an instant ${discountPercent}% discount. We'll confirm your booking immediately.`
                        : "Pay securely via Stripe. We'll confirm your booking immediately."}
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Guest Email for Booking Confirmation */}
              {paymentMethod === "online" && !isLoggedIn && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Your contact details above will be used for payment processing and booking confirmation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Summary Sidebar ── */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info (when logged in) */}
                {isLoggedIn && loggedInUser && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Customer
                      </p>
                      <p className="text-sm font-semibold">{loggedInUser.name}</p>
                      <p className="text-xs text-muted-foreground">{loggedInUser.email}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Guest Info (when not logged in and filled in) */}
                {!isLoggedIn && guestName && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Customer
                      </p>
                      <p className="text-sm font-semibold">{guestName}</p>
                      {guestEmail && (
                        <p className="text-xs text-muted-foreground">{guestEmail}</p>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Service */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Service
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedService?.name || "Not selected"}
                  </p>
                </div>

                <Separator />

                {/* Date & Time */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </p>
                  <p className="text-sm">
                    {selectedDate
                      ? `${format(selectedDate, "d MMM yyyy")} at ${
                          selectedTime
                            ? formatTimeSlot(selectedTime)
                            : "Not selected"
                        }`
                      : "Not selected"}
                  </p>
                </div>

                <Separator />

                {/* Duration */}
                {selectedService && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {selectedService.durationHours} hours
                      </span>
                    </div>

                    <Separator />
                  </>
                )}

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Service Price
                    </span>
                    <span>{CURRENCY}{basePrice.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && effectiveDiscountPercent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Online Discount ({discountPercent}%)
                      </span>
                      <span className="text-primary font-medium">
                        -{CURRENCY}{discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">
                        {CURRENCY}{totalPrice.toFixed(2)}
                      </span>
                      {discountAmount > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          {CURRENCY}{basePrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Confirm Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-full h-12 text-base"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : paymentMethod === "online" ? (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pay {CURRENCY}{totalPrice.toFixed(2)} Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Booking
                    </span>
                  )}
                </Button>

                {/* Payment method subtext */}
                {paymentMethod === "cash" && (
                  <p className="text-xs text-muted-foreground text-center">
                    No payment now — pay {CURRENCY}{totalPrice.toFixed(2)} after service
                  </p>
                )}

                {!isFormValid && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please fill in all required fields
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Secure & encrypted booking
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Free cancellation up to 24h before
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Satisfaction guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
