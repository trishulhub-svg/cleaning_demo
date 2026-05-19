"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CURRENCY } from "@/lib/constants";

interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  packageType: string;
  durationHours: number;
}

export function QuickBookingForm({ services }: { services: Service[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceId) params.set("service", serviceId);
    if (date) params.set("date", date);
    if (phone) params.set("phone", phone);
    router.push(`/book?${params.toString()}`);
  };

  return (
    <Card className="border-2 border-primary/10 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Book a Clean Today
        </CardTitle>
        <CardDescription className="text-base">
          Select your service and preferred date to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service">Select Service</Label>
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Choose a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — from {CURRENCY}
                  {service.price.toFixed(0)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Preferred Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07700 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full text-base"
          >
            Continue Booking
            <ChevronRight className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
