import { NextResponse } from "next/server"
import { inngest } from "@/inngest/client"

export async function GET() {
  await inngest.send({
    name: "app/hello",
    data: {},
  })
  return NextResponse.json({ received: true })
}
