# One-time project setup: checks Node, installs deps, creates .env.local.
# Run: powershell -ExecutionPolicy Bypass -File .\console\setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$needNodeMajor = 20
$nodeMajor = 0
try { $nodeMajor = [int](node -p 'process.versions.node.split(".")[0]') } catch { $nodeMajor = 0 }
if ($nodeMajor -lt $needNodeMajor) {
    $found = 'none'
    try { $found = (node -v) } catch { }
    Write-Error "Node $needNodeMajor+ is required (found: $found)."
    exit 1
}

Write-Host 'Installing dependencies...'
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path '.env.local')) {
    Copy-Item '.env.example' '.env.local'
    Write-Host 'Created .env.local. Add your OPENAI_API_KEY before running a workflow.'
} else {
    Write-Host '.env.local already exists, leaving it untouched.'
}

if (-not (Test-Path 'components.json')) {
    Write-Host ''
    Write-Host 'shadcn is not initialised yet. Run:'
    Write-Host '  npx shadcn@latest init'
    Write-Host '  npx shadcn@latest add button card input textarea badge scroll-area sheet separator tooltip tabs dialog sonner'
}

Write-Host 'Setup complete. Start everything with: .\console\dev.ps1'
