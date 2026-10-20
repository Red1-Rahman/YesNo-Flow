# Runs the Next.js app and the Inngest dev server together.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path '.env.local')) {
    Write-Error 'Missing .env.local. Run .\console\setup.ps1 first.'
    exit 1
}

Write-Host 'App:     http://localhost:3000'
Write-Host 'Inngest: http://localhost:8288'
npm run dev:all
exit $LASTEXITCODE
