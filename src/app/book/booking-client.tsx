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

// ─── Booking Form Component ──────────────────────────────────────────────

export function BookingClient({
  services,
  initialServiceId,
  initialService,
}: {
  services: ServiceOption[];
  initialServiceId: number | null;
  initialService: InitialService | null;
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
  const [guestName, setGuestName] = React.useState("");
  const [guestEmail, setGuestEmail] = React.useState("");
  const [guestPhone, setGuestPhone] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const selectedService = services.find(
    (s) => s.id === parseInt(selectedServiceId, 10)
  );

  const basePrice = selectedService?.price ?? 0;
  const discountPercent = paymentMethod === "online" ? 5 : 0;
  const discountAmount = basePrice * (discountPercent / 100);
  const totalPrice = basePrice - discountAmount;

  const formatTimeSlot = (time: string) => {
    const [h] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12}:00 ${suffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !address) return;

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
    address.trim().length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Left: Booking Form ── */}
        <div className="lg:col-span-2 space-y-6">
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
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                        selectedTime === time
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-input hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      {formatTimeSlot(time)}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Notes */}
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
              <div className="space-y-2">
                <Label htmlFor="address">
                  Full Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="e.g. 42 High Street, London, NW1 2AB"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
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
                        Pay Online Now
                      </span>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        <Percent className="h-3 w-3 mr-0.5" />
                        5% OFF
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pay securely via Stripe and get an instant 5% discount.
                      We&apos;ll confirm your booking immediately.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Guest Fields for Online Payment */}
              {paymentMethod === "online" && (
                <div className="space-y-4 pt-2">
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">
                    To process your online payment, please provide your
                    contact details:
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="guest-name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="guest-name"
                        placeholder="John Smith"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required={paymentMethod === "online"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-phone">
                        Phone Number{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="guest-phone"
                        placeholder="07700 000 000"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        required={paymentMethod === "online"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="guest-email"
                      type="email"
                      placeholder="john@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required={paymentMethod === "online"}
                    />
                  </div>
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

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Online Discount (5%)
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
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Booking
                    </span>
                  )}
                </Button>

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
