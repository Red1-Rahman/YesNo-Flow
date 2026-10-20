# Removes build output and local run data. Does not touch node_modules or .env files.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

foreach ($path in '.next', '.data', '.inngest', 'coverage', 'dist', 'out') {
    if (Test-Path $path) { Remove-Item -Recurse -Force $path }
}
Get-ChildItem -Path . -Filter '*.tsbuildinfo' -File -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host 'Cleaned build output and local run data.'
