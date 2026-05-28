import { NextResponse } from "next/server"
import { getSetting } from "@/lib/settings"

// ============ GET: Public Settings ============
// Returns only non-sensitive settings. No auth required.
export async function GET() {
  try {
    const [
      discount_percentage,
      company_name,
      company_email,
      company_phone,
      company_address,
      whatsapp_number,
      average_rating,
      review_count,
      social_facebook,
      social_instagram,
      social_twitter,
    ] = await Promise.all([
      getSetting("discount_percentage", "5"),
      getSetting("company_name", "GreenLeaf Cleaning"),
      getSetting("company_email", "hello@greenleafcleaning.co.uk"),
      getSetting("company_phone", "07700 000 000"),
      getSetting("company_address", "123 Green Lane, London, EC1A 1BB"),
      getSetting("whatsapp_number", "447700000000"),
      getSetting("average_rating", "4.9"),
      getSetting("review_count", "2000"),
      getSetting("social_facebook", ""),
      getSetting("social_instagram", ""),
      getSetting("social_twitter", ""),
    ])

    return NextResponse.json({
      success: true,
      data: {
        discount_percentage: Number(discount_percentage) || 5,
        company_name: company_name,
        company_email: company_email,
        company_phone: company_phone,
        company_address: company_address,
        whatsapp_number: whatsapp_number,
        average_rating: Number(average_rating) || 4.9,
        review_count: Number(review_count) || 2000,
        social_facebook: social_facebook || "",
        social_instagram: social_instagram || "",
        social_twitter: social_twitter || "",
      },
    })
  } catch (error) {
    console.error("[Public Settings] GET error:", error)
    return NextResponse.json(
      {
        success: true,
        data: {
          discount_percentage: 5,
          company_name: "GreenLeaf Cleaning",
          company_email: "hello@greenleafcleaning.co.uk",
          company_phone: "07700 000 000",
          company_address: "123 Green Lane, London, EC1A 1BB",
          whatsapp_number: "447700000000",
          average_rating: 4.9,
          review_count: 2000,
          social_facebook: "",
          social_instagram: "",
          social_twitter: "",
        },
      }
    )
  }
}
