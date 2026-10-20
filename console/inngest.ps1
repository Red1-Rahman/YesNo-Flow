# Runs only the Inngest dev server. Use when Next.js runs in another terminal.
# Optional: $env:PORT = 3001 before running to point at a different app port.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$port = if ($env:PORT) { $env:PORT } else { '3000' }
npx --yes inngest-cli@latest dev -u "http://localhost:$port/api/inngest"
exit $LASTEXITCODE
