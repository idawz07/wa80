$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'app-web'

if (Test-Path $target) {
  Remove-Item $target -Recurse -Force
}

New-Item -ItemType Directory -Path $target | Out-Null
New-Item -ItemType Directory -Path (Join-Path $target 'icons') | Out-Null

Copy-Item (Join-Path $root 'index.html') $target
Copy-Item (Join-Path $root 'manifest.webmanifest') $target
Copy-Item (Join-Path $root 'sw.js') $target
Copy-Item (Join-Path $root 'jszip.min.js') $target
Copy-Item (Join-Path $root 'icons\*') (Join-Path $target 'icons') -Recurse -Force

Write-Output "Synced web assets to $target"
