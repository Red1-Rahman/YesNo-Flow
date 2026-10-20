"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RunStateSchema, type RunState } from "@/lib/schemas/run"

const BASE_POLL_INTERVAL_MS = 700
const MAX_BACKOFF_MS = 5600

const isTerminal = (status: RunState["status"]) =>
  status === "succeeded" || status === "failed"

export type RunPolling = {
  run: RunState | null
  /** True when polling cannot reach the server; cleared on the next success. */
  connectionLost: boolean
  startPolling: (runId: string) => void
  stopPolling: () => void
}

/**
 * Poll GET /api/runs/:runId every 700 ms until the run reaches a terminal
 * status or polling is stopped / the component unmounts. Failures back off
 * exponentially (700 ms, 1.4 s, 2.8 s, 5.6 s) and surface `connectionLost`
 * instead of crashing.
 */
export function useRunPolling(): RunPolling {
  const [run, setRun] = useState<RunState | null>(null)
  const [connectionLost, setConnectionLost] = useState(false)
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

  const poll = useCallback(async (runId: string, failures: number) => {
    if (runIdRef.current !== runId) return
    let delay = BASE_POLL_INTERVAL_MS
    let failed = false
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
      setConnectionLost(false)
      if (isTerminal(parsed.data.status)) {
        runIdRef.current = null
        return
      }
    } catch {
      if (runIdRef.current !== runId) return
      // Keep polling through transient failures with exponential backoff and
      // surface a generic message; never crash the panel.
      failed = true
      delay = Math.min(BASE_POLL_INTERVAL_MS * 2 ** (failures + 1), MAX_BACKOFF_MS)
      setConnectionLost(true)
    }
    if (runIdRef.current === runId) {
      const nextFailures = failed ? Math.min(failures + 1, 4) : 0
      timerRef.current = setTimeout(() => void poll(runId, nextFailures), delay)
    }
  }, [])

  const startPolling = useCallback(
    (runId: string) => {
      stopPolling()
      setRun(null)
      setConnectionLost(false)
      runIdRef.current = runId
      void poll(runId, 0)
    },
    [poll, stopPolling],
  )

  return { run, connectionLost, startPolling, stopPolling }
}
