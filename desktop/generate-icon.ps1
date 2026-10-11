Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Solid Black background (#000000) with slight corner rounding
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

$targetPath = Join-Path $PSScriptRoot "assets\icon.png"
$bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Successfully generated 512x512 ENCS icon at: $targetPath"
