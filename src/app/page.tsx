import { FlowCanvas } from "@/components/flow/flow-canvas"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">yesno-flow</h1>
          <p className="text-sm text-muted-foreground">Build a decision flow with YES and NO branches.</p>
        </div>
      </header>
      <FlowCanvas />
    </main>
  )
}
