import type { Answer, Workflow } from "../schemas/workflow"

export function findNextEdge(workflow: Workflow, nodeId: string, answer: Answer) {
  const branch = answer === "YES" ? "yes" : "no"
  return workflow.edges.find((edge) => edge.source === nodeId && edge.sourceHandle === branch)
}

export function getNode(workflow: Workflow, id: string) {
  return workflow.nodes.find((node) => node.id === id)
}
