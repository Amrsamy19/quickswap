$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pkgRoot = Split-Path -Parent $scriptDir
$sourcePath = Join-Path $pkgRoot "native-src\SecurityHelper.cs"
$binDir = Join-Path $pkgRoot "bin"
$outExe = Join-Path $binDir "QuickswapSecHelper.exe"
$legacyExe = Join-Path $binDir "AccountHubSecHelper.exe"

if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$cscPaths = @(
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

$csc = $cscPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $csc) {
    Write-Error "C# compiler csc.exe not found on system."
    exit 1
}

# Stop any running helper processes before compilation
Get-Process -Name "*SecHelper*" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Compiling QuickswapSecHelper with $csc..."
& $csc /nologo /optimize+ /target:exe /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll /out:$outExe $sourcePath

if ($LASTEXITCODE -eq 0 -and (Test-Path $outExe)) {
    Write-Host "QuickswapSecHelper compiled successfully at: $outExe"
    Copy-Item $outExe $legacyExe -Force
} else {
    Write-Error "Failed to compile QuickswapSecHelper."
    exit 1
}
