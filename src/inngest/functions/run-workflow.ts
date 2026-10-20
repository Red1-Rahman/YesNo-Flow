import { decide } from "@/lib/ai/decide"

const TAG = "Inngest.Function"

export const runWorkflow = {
  [Symbol.toStringTag]: TAG,
  name: "run-workflow",

  getConfig() {
    return {
      id: "run-workflow",
      name: "run-workflow",
      triggers: [],
      steps: {},
    }
  },

  async run({ workflow, input }: { workflow: any; input: string }) {
    let current = workflow.startNodeId
    const visits = new Map<string, number>()
    let totalSteps = 0
    const maxSteps = Number(process.env.WORKFLOW_MAX_STEPS || "25")

    while (current) {
      totalSteps++

      if (totalSteps > maxSteps) {
        throw new Error(
          `Workflow exceeded maximum of ${maxSteps} steps. Possible cycle detected.`,
        )
      }

      const visit = (visits.get(current) ?? 0) + 1
      visits.set(current, visit)

      const answer = await decide({ prompt: "", input })

      const answerKey = answer === "YES" ? "yes" : "no"
      const edge = workflow.edges.find(
        (e: { source: string; sourceHandle: string }) => e.source === current && e.sourceHandle === answerKey,
      )

      if (!edge) {
        return { outcomeNodeId: current, status: "succeeded" }
      }

      current = edge.target
    }

    return { outcomeNodeId: current, status: "succeeded" }
  },
}