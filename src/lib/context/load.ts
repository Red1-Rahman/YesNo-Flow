import { env } from "../env"
import { ContextError } from "../errors"
import { ContextSourceSchema, type ContextSource } from "../schemas/context"
import { applyBudgets } from "./budgets"
import { loadFileText } from "./file-text"
import { loadStructured } from "./structured"
import type { ContextLoaderOptions } from "./types"
import { loadDbSource } from "./sql"
import { loadVectorSource } from "./vector"

export async function loadContext(sources: ContextSource[], opts: ContextLoaderOptions & { maxTotalChars?: number; prompt?: string; input?: string } = {}) {
  const loaded = []
  const warnings: string[] = []
  for (const input of sources) {
    const source = ContextSourceSchema.parse(input)
    try {
      if (source.format === "db") loaded.push(await loadDbSource(source))
      else if (source.format === "vector-db") loaded.push(await loadVectorSource(source, opts.prompt ?? "", opts.input ?? ""))
      else loaded.push(source.format === "json" || source.format === "yaml" ? await loadStructured(source, opts) : await loadFileText(source, opts))
    } catch (error) {
      if (source.required) throw new ContextError(`Required context source "${source.id}" could not be loaded. ${error instanceof ContextError ? error.message : "Check the context configuration."}`, { cause: error })
      warnings.push(`Optional context source "${source.id}" could not be loaded.`)
    }
  }
  const budgeted = applyBudgets(loaded, { maxSourceChars: opts.maxSourceChars ?? env.CONTEXT_MAX_SOURCE_CHARS, maxTotalChars: opts.maxTotalChars ?? env.CONTEXT_MAX_TOTAL_CHARS })
  return { loaded: budgeted.loaded, warnings: [...warnings, ...budgeted.warnings] }
}
