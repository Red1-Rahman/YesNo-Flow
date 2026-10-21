import type { Citation, LoadedContext, ModelCitation } from "../schemas/context"
const collapse = (value: string) => value.replace(/\s+/g, " ").trim()
export function verifyCitations(modelCitations: ModelCitation[], loaded: LoadedContext[]): { citations: Citation[]; grounded: boolean } {
  const byId = new Map(loaded.map((source) => [source.sourceId, source]))
  const citations: Citation[] = []
  for (const citation of modelCitations) {
    const source = byId.get(citation.sourceId)
    if (!source) continue
    const quote = collapse(citation.quote)
    const verified = Boolean(quote) && collapse(source.content).includes(quote)
    citations.push({ sourceId: citation.sourceId, ...(verified ? { quote: citation.quote } : {}), verified })
  }
  return { citations, grounded: citations.some((citation) => citation.verified) }
}
