Add-Type -AssemblyName System.Drawing

$configs = @(
    @{ Folder = "mipmap-mdpi";    IconSize = 48;  FgSize = 108 },
    @{ Folder = "mipmap-hdpi";    IconSize = 72;  FgSize = 162 },
    @{ Folder = "mipmap-xhdpi";   IconSize = 96;  FgSize = 216 },
    @{ Folder = "mipmap-xxhdpi";  IconSize = 144; FgSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; IconSize = 192; FgSize = 432 }
)

$baseDir = "client\android\app\src\main\res"

function Draw-TwoLineLogo {
    param (
        [System.Drawing.Graphics]$g,
        [float]$width,
        [float]$height,
        [float]$fontScale,
        [float]$yOffsetRatio
    )
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $fontSize = [Math]::Max(10, [int]($height * $fontScale))
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $lineH = $height * 0.40
    $y1 = ($height * $yOffsetRatio)
    $y2 = $y1 + $lineH * 0.95

    $rectEN = New-Object System.Drawing.RectangleF(0, $y1, $width, $lineH)
    $rectCS = New-Object System.Drawing.RectangleF(0, $y2, $width, $lineH)

    $g.DrawString("EN", $font, $brush, $rectEN, $format)
    $g.DrawString("CS", $font, $brush, $rectCS, $format)

    $brush.Dispose()
    $font.Dispose()
    $format.Dispose()
}

foreach ($c in $configs) {
    $dir = Join-Path $baseDir $c.Folder
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # 1. ic_launcher.png (Square / Rounded)
    $size = $c.IconSize
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.FillRectangle($blackBrush, 0, 0, $size, $size)
    $blackBrush.Dispose()
    Draw-TwoLineLogo -g $g -width $size -height $size -fontScale 0.32 -yOffsetRatio 0.10
    $g.Dispose()
    $savePath = Join-Path $dir "ic_launcher.png"
    $bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # 2. ic_launcher_round.png (Circular)
    $bmpRound = New-Object System.Drawing.Bitmap($size, $size)
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gRound.Clear([System.Drawing.Color]::Transparent)
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $gRound.FillEllipse($circleBrush, 0, 0, $size, $size)
    $circleBrush.Dispose()
    Draw-TwoLineLogo -g $gRound -width $size -height $size -fontScale 0.30 -yOffsetRatio 0.11
    $gRound.Dispose()
    $saveRoundPath = Join-Path $dir "ic_launcher_round.png"
    $bmpRound.Save($saveRoundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()

    # 3. ic_launcher_foreground.png (Safe area is central 66%)
    $fgSize = $c.FgSize
    $bmpFg = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.Clear([System.Drawing.Color]::Transparent)
    # Target central safe viewport
    Draw-TwoLineLogo -g $gFg -width $fgSize -height $fgSize -fontScale 0.22 -yOffsetRatio 0.29
    $gFg.Dispose()
    $saveFgPath = Join-Path $dir "ic_launcher_foreground.png"
    $bmpFg.Save($saveFgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Output "Generated icons for $($c.Folder): ${size}x${size} icon, ${fgSize}x${fgSize} foreground"
}

Write-Output "Android mipmap launcher icons generation completed successfully!"
