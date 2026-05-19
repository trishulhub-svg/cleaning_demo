import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await db.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });
    return NextResponse.json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      price,
      packageType,
      bedroomsMin,
      bedroomsMax,
      bathroomsMin,
      bathroomsMax,
      durationHours,
      features,
      isFeatured,
      isActive,
      sortOrder,
    } = body;

    if (!name || description === undefined) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const service = await db.service.create({
      data: {
        name,
        description,
        price: parseFloat(price) || 0,
        packageType: packageType || "standard",
        bedroomsMin: parseInt(bedroomsMin) || 1,
        bedroomsMax: parseInt(bedroomsMax) || 2,
        bathroomsMin: parseInt(bathroomsMin) || 1,
        bathroomsMax: parseInt(bathroomsMax) || 2,
        durationHours: parseFloat(durationHours) || 2,
        features: features || null,
        isFeatured: isFeatured ?? false,
        isActive: isActive ?? true,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, action, ...data } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    if (action === "update") {
      const service = await db.service.update({
        where: { id: serviceId },
        data: {
          ...data,
          price: data.price ? parseFloat(data.price) : undefined,
          bedroomsMin: data.bedroomsMin ? parseInt(data.bedroomsMin) : undefined,
          bedroomsMax: data.bedroomsMax ? parseInt(data.bedroomsMax) : undefined,
          bathroomsMin: data.bathroomsMin
            ? parseInt(data.bathroomsMin)
            : undefined,
          bathroomsMax: data.bathroomsMax
            ? parseInt(data.bathroomsMax)
            : undefined,
          durationHours: data.durationHours
            ? parseFloat(data.durationHours)
            : undefined,
          sortOrder: data.sortOrder
            ? parseInt(data.sortOrder)
            : undefined,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ service });
    }

    if (action === "toggleActive") {
      const current = await db.service.findUnique({
        where: { id: serviceId },
      });
      if (!current) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }
      const service = await db.service.update({
        where: { id: serviceId },
        data: { isActive: !current.isActive, updatedAt: new Date() },
      });
      return NextResponse.json({ service });
    }

    if (action === "toggleFeatured") {
      const current = await db.service.findUnique({
        where: { id: serviceId },
      });
      if (!current) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }
      const service = await db.service.update({
        where: { id: serviceId },
        data: { isFeatured: !current.isFeatured, updatedAt: new Date() },
      });
      return NextResponse.json({ service });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}
