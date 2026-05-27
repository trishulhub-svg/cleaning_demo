import { NextResponse } from "next/server"
import { getSetting } from "@/lib/settings"

// ============ GET: Public Settings ============
// Returns only non-sensitive settings. No auth required.
export async function GET() {
  try {
    const [discount_percentage, company_name] = await Promise.all([
      getSetting("discount_percentage", "5"),
      getSetting("company_name", "GreenLeaf Cleaning"),
    ])

    return NextResponse.json({
      success: true,
      data: {
        discount_percentage: Number(discount_percentage) || 5,
        company_name: company_name,
      },
    })
  } catch (error) {
    console.error("[Public Settings] GET error:", error)
    return NextResponse.json(
      { success: true, data: { discount_percentage: 5, company_name: "GreenLeaf Cleaning" } }
    )
  }
}
