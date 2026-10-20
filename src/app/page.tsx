export const metadata = {
  title: "yesno-flow",
  description: "Visual AI workflow builder",
}

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">yesno-flow</h1>
      <p className="mt-4 text-muted-foreground">
        Visual AI workflow builder — each node asks YES or NO
      </p>
    </main>
  )
}