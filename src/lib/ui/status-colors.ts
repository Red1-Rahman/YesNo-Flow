import type { EdgeVisualState, NodeVisualState } from "../graph/derive-visual-state"

/**
 * Single source of truth for status accents. Colors are never the only cue:
 * every status is paired with an icon and a text label in the components.
 * YES is green, NO is red, running is blue, error is amber.
 */
export const nodeStateClasses: Record<NodeVisualState, string> = {
  idle: "border-border bg-card",
  running: "border-blue-500 ring-2 ring-blue-500/40",
  "success-yes": "border-green-600",
  "success-no": "border-red-600",
  error: "border-amber-500",
}

export const edgeStateClasses: Record<EdgeVisualState, string> = {
  idle: "",
  active: "",
  taken: "",
  dim: "opacity-40",
  error: "",
}

export const answerBadgeClasses: Record<"YES" | "NO" | "running" | "error" | "idle", string> = {
  YES: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400",
  NO: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-400",
  running: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  error: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  idle: "border-border bg-muted text-muted-foreground",
}

export const edgeStrokeColors = {
  yes: "var(--color-green-600)",
  no: "var(--color-red-600)",
  active: "var(--color-blue-500)",
} as const
