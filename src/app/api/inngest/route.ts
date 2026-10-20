import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { functions } from "@/inngest"

const { GET, POST, PUT } = serve({ client: inngest, functions })

export { GET, POST, PUT }
