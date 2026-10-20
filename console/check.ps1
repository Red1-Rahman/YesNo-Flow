# Full verification gate. Every plan and every PR must pass this.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Step {
    param([string]$Label, [string]$Script)
    Write-Host $Label
    npm run --silent $Script
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Step failed: $Script"
        exit $LASTEXITCODE
    }
}

Invoke-Step '[1/3] typecheck' 'typecheck'
Invoke-Step '[2/3] lint' 'lint'
Invoke-Step '[3/3] test' 'test'
Write-Host 'All checks passed.'
