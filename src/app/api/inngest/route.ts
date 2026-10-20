import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { helloWorld } from "@/inngest/functions/hello-world"

const { GET, POST } = serve({ client: inngest, functions: [helloWorld] })

export { GET, POST }