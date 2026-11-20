Add-Type -AssemblyName System.Drawing

function Draw-QuickswapIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 512.0

    # Background Squircle
    $rect = New-Object System.Drawing.RectangleF(
        (24.0 * $scale), (24.0 * $scale), (464.0 * $scale), (464.0 * $scale)
    )
    $cornerRad = 108.0 * $scale
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $cornerRad, $cornerRad, 180, 90)
    $path.AddArc($rect.Right - $cornerRad, $rect.Y, $cornerRad, $cornerRad, 270, 90)
    $path.AddArc($rect.Right - $cornerRad, $rect.Bottom - $cornerRad, $cornerRad, $cornerRad, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $cornerRad, $cornerRad, $cornerRad, 90, 90)
    $path.CloseFigure()

    # Fill background gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new($size, $size),
        [System.Drawing.Color]::FromArgb(255, 22, 32, 50),
        [System.Drawing.Color]::FromArgb(255, 11, 15, 23)
    )
    $g.FillPath($bgBrush, $path)

    # Squircle border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), [Math]::Max(1.0, 4.0 * $scale))
    $g.DrawPath($borderPen, $path)

    # Outer Shield Outline
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p1 = [System.Drawing.PointF]::new(256.0 * $scale, 82.0 * $scale)
    $p2 = [System.Drawing.PointF]::new(398.0 * $scale, 112.0 * $scale)
    $p3 = [System.Drawing.PointF]::new(398.0 * $scale, 244.0 * $scale)
    $p4 = [System.Drawing.PointF]::new(256.0 * $scale, 420.0 * $scale)
    $p5 = [System.Drawing.PointF]::new(114.0 * $scale, 244.0 * $scale)
    $p6 = [System.Drawing.PointF]::new(114.0 * $scale, 112.0 * $scale)

    $shieldPath.AddLines(@($p1, $p2, $p3, $p4, $p5, $p6))
    $shieldPath.CloseFigure()

    $shieldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 8, 13, 23))
    $g.FillPath($shieldBrush, $shieldPath)

    $shieldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 59, 130, 246), [Math]::Max(1.5, 10.0 * $scale))
    $shieldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($shieldPen, $shieldPath)

    # Top-Right Chevron (Cyan Arrow)
    $topArrPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $topArrPath.AddPolygon(@(
        [System.Drawing.PointF]::new(216.0 * $scale, 160.0 * $scale),
        [System.Drawing.PointF]::new(336.0 * $scale, 160.0 * $scale),
        [System.Drawing.PointF]::new(336.0 * $scale, 230.0 * $scale),
        [System.Drawing.PointF]::new(366.0 * $scale, 230.0 * $scale),
        [System.Drawing.PointF]::new(316.0 * $scale, 296.0 * $scale),
        [System.Drawing.PointF]::new(266.0 * $scale, 230.0 * $scale),
        [System.Drawing.PointF]::new(296.0 * $scale, 230.0 * $scale),
        [System.Drawing.PointF]::new(296.0 * $scale, 200.0 * $scale),
        [System.Drawing.PointF]::new(216.0 * $scale, 200.0 * $scale)
    ))
    $cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $g.FillPath($cyanBrush, $topArrPath)

    # Bottom-Left Chevron (Indigo/Blue Arrow)
    $botArrPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $botArrPath.AddPolygon(@(
        [System.Drawing.PointF]::new(296.0 * $scale, 352.0 * $scale),
        [System.Drawing.PointF]::new(176.0 * $scale, 352.0 * $scale),
        [System.Drawing.PointF]::new(176.0 * $scale, 282.0 * $scale),
        [System.Drawing.PointF]::new(146.0 * $scale, 282.0 * $scale),
        [System.Drawing.PointF]::new(196.0 * $scale, 216.0 * $scale),
        [System.Drawing.PointF]::new(246.0 * $scale, 282.0 * $scale),
        [System.Drawing.PointF]::new(216.0 * $scale, 282.0 * $scale),
        [System.Drawing.PointF]::new(216.0 * $scale, 312.0 * $scale),
        [System.Drawing.PointF]::new(296.0 * $scale, 312.0 * $scale)
    ))
    $blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 79, 70, 229))
    $g.FillPath($blueBrush, $botArrPath)

    # Center Vault Core (Keyhole Dot)
    $coreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 6, 182, 212))
    $coreRad = 16.0 * $scale
    $g.FillEllipse($coreBrush, (256.0 * $scale - $coreRad/2), (242.0 * $scale - $coreRad/2), $coreRad, $coreRad)

    $g.Dispose()
    return $bmp
}

$desktopDir = Join-Path $PSScriptRoot "..\apps\desktop"
$resDir = Join-Path $desktopDir "resources"
$buildDir = Join-Path $desktopDir "build"
$publicDir = Join-Path $desktopDir "public"

foreach ($dir in @($resDir, $buildDir, $publicDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 1. Generate 512x512 High-Res PNG
$bmp512 = Draw-QuickswapIcon 512
$png512Path = Join-Path $resDir "icon.png"
$bmp512.Save($png512Path, [System.Drawing.Imaging.ImageFormat]::Png)
Copy-Item $png512Path (Join-Path $publicDir "icon.png") -Force
Copy-Item $png512Path (Join-Path $buildDir "icon.png") -Force
Write-Host "Created: $png512Path"

# 2. Generate multi-resolution Windows ICO file (256, 128, 64, 48, 32, 16)
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $sizes) {
    $bmp = Draw-QuickswapIcon $sz
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += @{ Size = $sz; Bytes = $ms.ToArray() }
    $bmp.Dispose()
}

function Save-IcoFile([string]$path, $streams) {
    $fs = [System.IO.File]::Create($path)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # Header: Reserved (0), Type (1 for ICO), Count
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$streams.Count)

    # Directory entries (16 bytes each)
    $offset = 6 + ($streams.Count * 16)
    foreach ($entry in $streams) {
        $w = if ($entry.Size -ge 256) { 0 } else { [byte]$entry.Size }
        $h = if ($entry.Size -ge 256) { 0 } else { [byte]$entry.Size }
        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0)   # Colors
        $bw.Write([byte]0)   # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32)# Bits per pixel
        $bw.Write([uint32]$entry.Bytes.Length)
        $bw.Write([uint32]$offset)
        $offset += $entry.Bytes.Length
    }

    # Write image data
    foreach ($entry in $streams) {
        $bw.Write($entry.Bytes)
    }

    $bw.Flush()
    $fs.Close()
    Write-Host "Created Windows ICO: $path"
}

$icoPath1 = Join-Path $resDir "icon.ico"
$icoPath2 = Join-Path $buildDir "icon.ico"
$icoPath3 = Join-Path $publicDir "favicon.ico"

Save-IcoFile $icoPath1 $pngStreams
Copy-Item $icoPath1 $icoPath2 -Force
Copy-Item $icoPath1 $icoPath3 -Force
