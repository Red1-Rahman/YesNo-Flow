import { z } from "zod"
const ContextAnswerSchema = z.enum(["YES", "NO"])

export const SourceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/)
export const ContextFormatSchema = z.enum(["md", "yaml", "db", "json", "vector-db", "txt"])
export type ContextFormat = z.infer<typeof ContextFormatSchema>
export const ContextSourceSchema = z.object({ id: SourceIdSchema, format: ContextFormatSchema, ref: z.string().min(1).max(200), label: z.string().max(80).optional(), required: z.boolean().default(true), topK: z.number().int().min(1).max(20).optional() }).superRefine((source, ctx) => {
  if (source.topK !== undefined && source.format !== "vector-db") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "topK is only valid for vector-db sources", path: ["topK"] })
})
export const NodeContextSchema = z.object({ sources: z.array(ContextSourceSchema).max(10).default([]), requireCitation: z.boolean().default(false) }).superRefine((value, ctx) => {
  const ids = new Set<string>()
  value.sources.forEach((source, index) => { if (ids.has(source.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate source id "${source.id}"`, path: ["sources", index, "id"] }); ids.add(source.id) })
})
export const LoadedContextSchema = z.object({ sourceId: SourceIdSchema, format: ContextFormatSchema, title: z.string(), content: z.string(), truncated: z.boolean().default(false) })
export const CitationSchema = z.object({ sourceId: z.string(), quote: z.string().max(240).optional(), verified: z.boolean() })
export const ModelCitationSchema = z.object({ sourceId: z.string(), quote: z.string().max(240) })
export const DecisionResultSchema = z.object({ answer: ContextAnswerSchema, citations: z.array(ModelCitationSchema).max(10) }).strict()
export type ContextSource = z.infer<typeof ContextSourceSchema>
export type NodeContext = z.infer<typeof NodeContextSchema>
export type LoadedContext = z.infer<typeof LoadedContextSchema>
export type Citation = z.infer<typeof CitationSchema>
export type ModelCitation = z.infer<typeof ModelCitationSchema>
