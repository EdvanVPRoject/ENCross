Add-Type -AssemblyName System.Drawing

function Draw-ENCS-Logo {
    param (
        [System.Drawing.Graphics]$g,
        [float]$width,
        [float]$height,
        [float]$logoBoxSize
    )
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $boxX = ($width - $logoBoxSize) / 2
    $boxY = ($height - $logoBoxSize) / 2

    # Draw rounded-corner black badge with subtle border
    $badgeRect = New-Object System.Drawing.RectangleF($boxX, $boxY, $logoBoxSize, $logoBoxSize)
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 39, 39, 42), [Math]::Max(1, $logoBoxSize * 0.02))

    $g.FillRectangle($badgeBrush, $boxX, $boxY, $logoBoxSize, $logoBoxSize)
    $g.DrawRectangle($borderPen, $boxX, $boxY, $logoBoxSize, $logoBoxSize)

    # Draw 2 lines: EN (top) and CS (bottom) in pure white
    $fontSize = [Math]::Max(8, [int]($logoBoxSize * 0.32))
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $lineH = $logoBoxSize * 0.42
    $y1 = $boxY + ($logoBoxSize * 0.10)
    $y2 = $y1 + ($lineH * 0.95)

    $rectEN = New-Object System.Drawing.RectangleF($boxX, $y1, $logoBoxSize, $lineH)
    $rectCS = New-Object System.Drawing.RectangleF($boxX, $y2, $logoBoxSize, $lineH)

    $g.DrawString("EN", $font, $whiteBrush, $rectEN, $format)
    $g.DrawString("CS", $font, $whiteBrush, $rectCS, $format)

    $badgeBrush.Dispose()
    $borderPen.Dispose()
    $whiteBrush.Dispose()
    $font.Dispose()
    $format.Dispose()
}

# 1. Generate PWA Icons (192, 512, apple-touch)
$publicDir = "client\public"
$pwaSizes = @(
    @{ Name = "icon-192.png"; Size = 192 },
    @{ Name = "icon-512.png"; Size = 512 },
    @{ Name = "apple-touch-icon.png"; Size = 180 }
)

foreach ($item in $pwaSizes) {
    $s = $item.Size
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    Draw-ENCS-Logo -g $g -width $s -height $s -logoBoxSize ($s * 0.90)
    $g.Dispose()

    $p = Join-Path $publicDir $item.Name
    $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated PWA icon: $p"
}

# 2. Generate Android Launcher Icons
$resDir = "client\android\app\src\main\res"
$launcherConfigs = @(
    @{ Folder = "mipmap-mdpi";    IconSize = 48;  FgSize = 108 },
    @{ Folder = "mipmap-hdpi";    IconSize = 72;  FgSize = 162 },
    @{ Folder = "mipmap-xhdpi";   IconSize = 96;  FgSize = 216 },
    @{ Folder = "mipmap-xxhdpi";  IconSize = 144; FgSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; IconSize = 192; FgSize = 432 }
)

foreach ($c in $launcherConfigs) {
    $dir = Join-Path $resDir $c.Folder

    # ic_launcher.png (Square / Legacy)
    $size = $c.IconSize
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    Draw-ENCS-Logo -g $g -width $size -height $size -logoBoxSize ($size * 0.92)
    $g.Dispose()
    $savePath = Join-Path $dir "ic_launcher.png"
    $bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # ic_launcher_round.png (Circular)
    $bmpRound = New-Object System.Drawing.Bitmap($size, $size)
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gRound.Clear([System.Drawing.Color]::Transparent)
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $gRound.FillEllipse($circleBrush, 0, 0, $size, $size)
    $circleBrush.Dispose()
    Draw-ENCS-Logo -g $gRound -width $size -height $size -logoBoxSize ($size * 0.85)
    $gRound.Dispose()
    $saveRoundPath = Join-Path $dir "ic_launcher_round.png"
    $bmpRound.Save($saveRoundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()

    # ic_launcher_foreground.png (Adaptive icon foreground, safe area inside central 66%)
    $fgSize = $c.FgSize
    $bmpFg = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.Clear([System.Drawing.Color]::Transparent)
    # Target safe central circle (diameter 66% of fgSize)
    $safeSize = $fgSize * 0.64
    Draw-ENCS-Logo -g $gFg -width $fgSize -height $fgSize -logoBoxSize $safeSize
    $gFg.Dispose()
    $saveFgPath = Join-Path $dir "ic_launcher_foreground.png"
    $bmpFg.Save($saveFgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Output "Generated launcher icons for $($c.Folder)"
}

# 3. Generate Android Splash Screens (Deep Black Background with centered White ENCS Logo)
$splashConfigs = @(
    @{ Folder = "drawable";               W = 480;  H = 320;  Box = 140 },
    @{ Folder = "drawable-land-mdpi";      W = 480;  H = 320;  Box = 140 },
    @{ Folder = "drawable-land-hdpi";      W = 800;  H = 480;  Box = 180 },
    @{ Folder = "drawable-land-xhdpi";     W = 1280; H = 720;  Box = 240 },
    @{ Folder = "drawable-land-xxhdpi";    W = 1600; H = 960;  Box = 300 },
    @{ Folder = "drawable-land-xxxhdpi";   W = 1920; H = 1280; Box = 360 },
    @{ Folder = "drawable-port-mdpi";      W = 320;  H = 480;  Box = 140 },
    @{ Folder = "drawable-port-hdpi";      W = 480;  H = 800;  Box = 180 },
    @{ Folder = "drawable-port-xhdpi";     W = 720;  H = 1280; Box = 240 },
    @{ Folder = "drawable-port-xxhdpi";    W = 960;  H = 1600; Box = 300 },
    @{ Folder = "drawable-port-xxxhdpi";   W = 1280; H = 1920; Box = 360 }
)

foreach ($sc in $splashConfigs) {
    $dir = Join-Path $resDir $sc.Folder
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bmp = New-Object System.Drawing.Bitmap($sc.W, $sc.H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    # Solid Black (#000000)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))

    # Draw centered ENCS Logo
    Draw-ENCS-Logo -g $g -width $sc.W -height $sc.H -logoBoxSize $sc.Box
    $g.Dispose()

    $splashPath = Join-Path $dir "splash.png"
    $bmp.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Output "Generated splash screen: $splashPath ($($sc.W)x$($sc.H))"
}

Write-Output "All mobile assets generated successfully!"
