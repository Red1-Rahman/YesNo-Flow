/**
 * JSON schema sent to the provider as `response_format` (strict mode).
 *
 * Keep this inside the subset every OpenAI-compatible provider accepts: type, properties,
 * required, enum, items, description, additionalProperties. Length and count limits
 * (`quote` max 240, `citations` max 10) are enforced afterwards by DecisionResultSchema.
 *
 * Do not add maxLength, minLength, pattern, or format here. Strict mode can reject them with
 * a 400, and in LLM_STRUCTURED_OUTPUT=auto that 400 silently falls back to unconstrained
 * output, which turns API-level enforcement off without any visible error.
 */
export const DECISION_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      enum: ["YES", "NO"],
      description: "Exactly the string YES or exactly the string NO.",
    },
    citations: {
      type: "array",
      description: "Sources relied on. Empty when no source was used.",
      items: {
        type: "object",
        properties: {
          sourceId: { type: "string", description: "The id of a provided source." },
          quote: { type: "string", description: "Short excerpt copied exactly from that source." },
        },
        required: ["sourceId", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["answer", "citations"],
  additionalProperties: false,
} as const
