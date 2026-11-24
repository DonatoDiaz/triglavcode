#Requires -Version 5.1
<#
.SYNOPSIS
  Собирает Windows-установщик TriglavCode (Setup .exe) через Inno Setup 6.

.EXAMPLE
  # Сначала соберите бинарник (на Windows):
  #   bun run --cwd packages/opencode script/build.ts --single --skip-install
  # Затем:
  pwsh ./installer/windows/build-installer.ps1 -Version 1.19.0-triglav.1
#>
param(
  [string]$Version = "1.19.0-triglav.1",
  [string]$SourceExe = "..\..\packages\opencode\dist\triglavcode-windows-x64\bin\triglavcode.exe",
  [string]$OutDir = "dist"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-Iscc {
  $cmd = Get-Command iscc.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    (Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe")
  )
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}

$iscc = Find-Iscc
if (-not $iscc) {
  Write-Host "Inno Setup не найден — пробую установить..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    try {
      winget install --id JRSoftware.InnoSetup -e --silent `
        --accept-package-agreements --accept-source-agreements | Out-Null
    } catch { Write-Host "winget: $($_.Exception.Message)" }
  }
  $iscc = Find-Iscc
}
if (-not $iscc -and (Get-Command choco -ErrorAction SilentlyContinue)) {
  try { choco install innosetup -y --no-progress | Out-Null } catch { Write-Host "choco: $($_.Exception.Message)" }
  $iscc = Find-Iscc
}
if (-not $iscc) {
  throw "ISCC.exe не найден. Установите Inno Setup 6: https://jrsoftware.org/isdl.php"
}

$resolvedExe = $null
if (Test-Path -LiteralPath $SourceExe) {
  $resolvedExe = (Resolve-Path -LiteralPath $SourceExe).Path
} elseif (Test-Path -LiteralPath (Join-Path $here $SourceExe)) {
  $resolvedExe = (Resolve-Path -LiteralPath (Join-Path $here $SourceExe)).Path
}
if (-not $resolvedExe) {
  throw "Не найден собранный бинарник: $SourceExe. Сначала: bun run --cwd packages/opencode script/build.ts --single --skip-install"
}

$outPath = Join-Path $here $OutDir
$iss = Join-Path $here "triglavcode.iss"

Write-Host "ISCC: $iscc"
Write-Host "Exe : $resolvedExe"
Write-Host "Версия: $Version"

& $iscc "/DMyAppVersion=$Version" "/DSourceExe=$resolvedExe" "/DOutDir=$outPath" $iss
if ($LASTEXITCODE -ne 0) { throw "ISCC завершился с кодом $LASTEXITCODE" }

$setup = Join-Path $outPath "TriglavCode-Setup-$Version.exe"
if (-not (Test-Path -LiteralPath $setup)) { throw "Готовый установщик не найден: $setup" }
Write-Host "Готово: $setup"
