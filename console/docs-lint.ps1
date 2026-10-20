# Fails if any markdown file contains an em dash. Docs in this repo must not use them.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$emDash = [string][char]0x2014
$files = Get-ChildItem -Path . -Recurse -Filter '*.md' -File |
    Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.next)[\\/]' }

$hits = $files | Select-String -SimpleMatch $emDash -Encoding utf8
if ($hits) {
    $hits | ForEach-Object { Write-Host ("{0}:{1}" -f $_.Path, $_.LineNumber) }
    Write-Error 'Em dash found in documentation. Rewrite with a comma, colon, period, or parentheses.'
    exit 1
}
Write-Host 'No em dashes found.'
