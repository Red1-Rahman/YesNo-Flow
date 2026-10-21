import type { ContextSource, LoadedContext } from "../schemas/context"
export type ContextLoaderOptions = { root?: string; maxFileBytes?: number; maxSourceChars?: number }
export type ContextLoader = (source: ContextSource, opts?: ContextLoaderOptions) => Promise<LoadedContext>
