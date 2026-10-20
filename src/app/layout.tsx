export const metadata = {
  title: "yesno-flow",
  description: "Visual AI workflow builder",
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}