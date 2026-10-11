Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Solid Black background (#000000)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
$graphics.FillRectangle($bgBrush, 0, 0, $width, $height)

# Pure White Text (#FFFFFF)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$font = New-Object System.Drawing.Font("Arial", 145, [System.Drawing.FontStyle]::Bold)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

# Two lines: EN (top) and CS (bottom)
$rectEN = New-Object System.Drawing.RectangleF(0, 45, $width, 210)
$rectCS = New-Object System.Drawing.RectangleF(0, 245, $width, 210)

$graphics.DrawString("EN", $font, $textBrush, $rectEN, $format)
$graphics.DrawString("CS", $font, $textBrush, $rectCS, $format)

$targetPng = Join-Path $PSScriptRoot "assets\icon.png"
$bitmap.Save($targetPng, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()

# Generate multi-resolution ICO for Windows Desktop & Taskbar
function Export-MultiResIco {
    param (
        [System.Drawing.Bitmap]$sourceBmp,
        [int[]]$sizes,
        [string]$outputPath
    )

    $pngList = [System.Collections.Generic.List[byte[]]]::new()
    $sizeList = [System.Collections.Generic.List[int]]::new()

    foreach ($s in $sizes) {
        $resized = New-Object System.Drawing.Bitmap($s, $s)
        $rg = [System.Drawing.Graphics]::FromImage($resized)
        $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $rg.DrawImage($sourceBmp, 0, 0, $s, $s)
        $rg.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngList.Add($ms.ToArray())
        $sizeList.Add($s)
        $ms.Dispose()
        $resized.Dispose()
    }

    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = Icon)
    $bw.Write([uint16]$pngList.Count) # Number of images

    $offset = 6 + (16 * $pngList.Count)

    # ICONDIRENTRY for each size
    for ($i = 0; $i -lt $pngList.Count; $i++) {
        $s = $sizeList[$i]
        $w = if ($s -ge 256) { [byte]0 } else { [byte]$s }
        $h = if ($s -ge 256) { [byte]0 } else { [byte]$s }

        $bw.Write($w) # Width
        $bw.Write($h) # Height
        $bw.Write([byte]0) # Color count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$pngList[$i].Length) # Image data size
        $bw.Write([uint32]$offset) # Offset

        $offset += $pngList[$i].Length
    }

    # Write PNG image data
    for ($i = 0; $i -lt $pngList.Count; $i++) {
        $bw.Write($pngList[$i])
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
}

$targetIco = Join-Path $PSScriptRoot "assets\icon.ico"
Export-MultiResIco -sourceBmp $bitmap -sizes @(256, 128, 64, 48, 32, 16) -outputPath $targetIco

# Also generate client/public/favicon.ico
$clientFaviconIco = Join-Path (Split-Path $PSScriptRoot -Parent) "client\public\favicon.ico"
Export-MultiResIco -sourceBmp $bitmap -sizes @(64, 32, 16) -outputPath $clientFaviconIco

$bitmap.Dispose()

Write-Output "Successfully generated:
- $targetPng
- $targetIco
- $clientFaviconIco"
