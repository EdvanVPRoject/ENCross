Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background dark rounded rect #09090b
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 9, 9, 11))
$graphics.FillRectangle($bgBrush, 0, 0, $width, $height)

# Center circle
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$graphics.FillEllipse($whiteBrush, 224, 224, 64, 64)

# Radar arcs
$pen1 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 228, 228, 231), 28)
$pen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

# Inner arcs
$graphics.DrawArc($pen1, 151, 151, 210, 210, 315, 90)
$graphics.DrawArc($pen1, 151, 151, 210, 210, 135, 90)

# Outer arcs
$pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 161, 161, 170), 28)
$pen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$graphics.DrawArc($pen2, 70, 70, 372, 372, 315, 90)
$graphics.DrawArc($pen2, 70, 70, 372, 372, 135, 90)

$targetPath = Join-Path $PSScriptRoot "assets\icon.png"
$bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Successfully generated 512x512 icon at: $targetPath"
