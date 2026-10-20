"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RunStateSchema, type RunState } from "@/lib/schemas/run"

const POLL_INTERVAL_MS = 700

const isTerminal = (status: RunState["status"]) =>
  status === "succeeded" || status === "failed"

export type RunPolling = {
  run: RunState | null
  error: string | null
  startPolling: (runId: string) => void
  stopPolling: () => void
}

/**
 * Poll GET /api/runs/:runId every 700 ms until the run reaches a terminal
 * status or polling is stopped / the component unmounts.
 */
export function useRunPolling(): RunPolling {
  const [run, setRun] = useState<RunState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    runIdRef.current = null
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const poll = useCallback(async (runId: string) => {
    if (runIdRef.current !== runId) return
    try {
      const response = await fetch(`/api/runs/${runId}`)
      if (!response.ok) {
        throw new Error(`Run state request failed with ${response.status}`)
      }
      const payload: unknown = await response.json()
      const parsed = RunStateSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error("Run state did not match the expected schema")
      }
      if (runIdRef.current !== runId) return
      setRun(parsed.data)
      setError(null)
      if (isTerminal(parsed.data.status)) {
        runIdRef.current = null
        return
      }
    } catch {
      if (runIdRef.current !== runId) return
      // Keep polling through transient failures; surface a generic message.
      setError("Lost connection to the run state.")
    }
    if (runIdRef.current === runId) {
      timerRef.current = setTimeout(() => void poll(runId), POLL_INTERVAL_MS)
    }
  }, [])

  const startPolling = useCallback(
    (runId: string) => {
      stopPolling()
      setRun(null)
      setError(null)
      runIdRef.current = runId
      void poll(runId)
    },
    [poll, stopPolling],
  )

  return { run, error, startPolling, stopPolling }
}
