// Hello world Inngest function triggered by the app/hello event. Kept from
// Phase 1 as a smoke test for the Inngest dev server.
import { inngest } from "../client"

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "app/hello" },
  async () => {
    return { greeted: true }
  },
)
