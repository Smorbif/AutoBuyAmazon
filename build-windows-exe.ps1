$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $projectRoot 'src\KeepaBuyerLauncher.cs'
$target = Join-Path $projectRoot 'KeepaBuyer.exe'

Add-Type -TypeDefinition (Get-Content -LiteralPath $source -Raw) `
  -OutputAssembly $target `
  -OutputType WindowsApplication `
  -ReferencedAssemblies @('System.Windows.Forms.dll', 'System.Drawing.dll')

Write-Host "Creato: $target"
