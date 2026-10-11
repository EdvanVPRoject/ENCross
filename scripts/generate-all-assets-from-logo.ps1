Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\edvan\.gemini\antigravity\brain\b64990bc-93fb-468c-8d64-20d103e7e1af\.user_uploaded\media_1791722065770_460e0c8a.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source logo file not found: $srcPath"
    exit 1
}

$root = $PSScriptRoot | Split-Path -Parent
$clientDir = Join-Path $root "client"
$desktopDir = Join-Path $root "desktop"
$androidRes = Join-Path $clientDir "android\app\src\main\res"

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

function Save-Resized-Png {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [string]$outputPath,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent,
        [double]$scaleFactor = 1.0,
        [bool]$isCircle = $false,
        [bool]$isRoundSquare = $false
    )

    $parentDir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $parentDir)) {
        [System.IO.Directory]::CreateDirectory($parentDir) | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        if ($isCircle) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $brush = New-Object System.Drawing.SolidBrush($bgColor)
            $g.FillEllipse($brush, 0, 0, $targetWidth, $targetHeight)
            $brush.Dispose()
        } elseif ($isRoundSquare) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $radius = [int]($targetWidth * 0.22)
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $diameter = $radius * 2
            $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
            $path.AddArc($targetWidth - $diameter, 0, $diameter, $diameter, 270, 90)
            $path.AddArc($targetWidth - $diameter, $targetHeight - $diameter, $diameter, $diameter, 0, 90)
            $path.AddArc(0, $targetHeight - $diameter, $diameter, $diameter, 90, 90)
            $path.CloseFigure()
            $brush = New-Object System.Drawing.SolidBrush($bgColor)
            $g.FillPath($brush, $path)
            $brush.Dispose()
            $path.Dispose()
        } else {
            $g.Clear($bgColor)
        }
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Calculate centered bounding box for the logo
    $drawW = [int]($targetWidth * $scaleFactor)
    $drawH = [int]($targetHeight * $scaleFactor)

    # Maintain 1:1 aspect ratio
    $boxSize = [Math]::Min($drawW, $drawH)
    $destX = [int](($targetWidth - $boxSize) / 2)
    $destY = [int](($targetHeight - $boxSize) / 2)

    $g.DrawImage($source, $destX, $destY, $boxSize, $boxSize)
    $g.Dispose()

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
}

function Save-Ico-File {
    param(
        [System.Drawing.Bitmap]$source,
        [string]$outputPath
    )

    $sizes = @(16, 32, 48, 64, 128, 256)
    $pngStreams = @()

    foreach ($sz in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($source, 0, 0, $sz, $sz)
        $g.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngStreams += $ms
        $bmp.Dispose()
    }

    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = ICO)
    $bw.Write([uint16]$sizes.Count) # Image count

    $offset = 6 + ($sizes.Count * 16)

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $sz = $sizes[$i]
        $len = $pngStreams[$i].Length

        $bw.Write([byte]$(if ($sz -ge 256) { 0 } else { $sz })) # Width
        $bw.Write([byte]$(if ($sz -ge 256) { 0 } else { $sz })) # Height
        $bw.Write([byte]0) # Colors
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Planes
        $bw.Write([uint16]32) # Bit count
        $bw.Write([uint32]$len) # Bytes in resource
        $bw.Write([uint32]$offset) # Image offset

        $offset += $len
    }

    # Write PNG payloads
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bytes = $pngStreams[$i].ToArray()
        $bw.Write($bytes, 0, $bytes.Length)
        $pngStreams[$i].Dispose()
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
}

$colTransparent = [System.Drawing.Color]::Transparent
$colDark = [System.Drawing.Color]::FromArgb(255, 9, 9, 11) # #09090b

# High-res master logo in client/public
Copy-Item $srcPath -Destination (Join-Path $clientDir "public\logo.png") -Force
Write-Output "Saved client\public\logo.png"

Save-Resized-Png -source $srcBmp -targetWidth 512 -targetHeight 512 -outputPath (Join-Path $clientDir "public\icon-512.png") -bgColor $colTransparent -scaleFactor 1.0
Save-Resized-Png -source $srcBmp -targetWidth 192 -targetHeight 192 -outputPath (Join-Path $clientDir "public\icon-192.png") -bgColor $colTransparent -scaleFactor 1.0
Save-Resized-Png -source $srcBmp -targetWidth 180 -targetHeight 180 -outputPath (Join-Path $clientDir "public\apple-touch-icon.png") -bgColor $colDark -scaleFactor 0.85 -isCircle $false -isRoundSquare $true
Save-Resized-Png -source $srcBmp -targetWidth 512 -targetHeight 512 -outputPath (Join-Path $clientDir "public\icon.png") -bgColor $colTransparent -scaleFactor 1.0
Write-Output "Saved PWA icons"

Write-Output "--- 2. Generating Desktop Assets ---"
Save-Resized-Png -source $srcBmp -targetWidth 512 -targetHeight 512 -outputPath (Join-Path $desktopDir "assets\icon.png") -bgColor $colTransparent -scaleFactor 1.0
Save-Ico-File -source $srcBmp -outputPath (Join-Path $desktopDir "assets\icon.ico")
Save-Ico-File -source $srcBmp -outputPath (Join-Path $clientDir "public\favicon.ico")
Write-Output "Saved desktop icon.png, icon.ico, and favicon.ico"

Write-Output "--- 3. Generating Android Launcher Icons ---"
$densities = @{
    "mdpi" = 48
    "hdpi" = 72
    "xhdpi" = 96
    "xxhdpi" = 144
    "xxxhdpi" = 192
}

foreach ($density in $densities.Keys) {
    $size = $densities[$density]
    $dir = Join-Path $androidRes "mipmap-$density"

    # Square / Squircle launcher icon (with #09090b background)
    Save-Resized-Png -source $srcBmp -targetWidth $size -targetHeight $size -outputPath (Join-Path $dir "ic_launcher.png") -bgColor $colDark -scaleFactor 0.85 -isCircle $false -isRoundSquare $true

    # Round launcher icon
    Save-Resized-Png -source $srcBmp -targetWidth $size -targetHeight $size -outputPath (Join-Path $dir "ic_launcher_round.png") -bgColor $colDark -scaleFactor 0.85 -isCircle $true -isRoundSquare $false

    # Adaptive icon foreground (transparent, ~68% size so safe zone is respected)
    Save-Resized-Png -source $srcBmp -targetWidth $size -targetHeight $size -outputPath (Join-Path $dir "ic_launcher_foreground.png") -bgColor $colTransparent -scaleFactor 0.68

    Write-Output "Generated launcher icons for mipmap-$density ($size x $size)"
}

Write-Output "--- 4. Generating Android Splash Screens ---"
$splashes = @{
    "drawable\splash.png" = @{ w = 480; h = 320; scale = 0.55 }
    "drawable-land-mdpi\splash.png" = @{ w = 480; h = 320; scale = 0.55 }
    "drawable-land-hdpi\splash.png" = @{ w = 800; h = 480; scale = 0.55 }
    "drawable-land-xhdpi\splash.png" = @{ w = 1280; h = 720; scale = 0.55 }
    "drawable-land-xxhdpi\splash.png" = @{ w = 1600; h = 960; scale = 0.55 }
    "drawable-land-xxxhdpi\splash.png" = @{ w = 1920; h = 1280; scale = 0.55 }
    "drawable-port-mdpi\splash.png" = @{ w = 320; h = 480; scale = 0.55 }
    "drawable-port-hdpi\splash.png" = @{ w = 480; h = 800; scale = 0.55 }
    "drawable-port-xhdpi\splash.png" = @{ w = 720; h = 1280; scale = 0.55 }
    "drawable-port-xxhdpi\splash.png" = @{ w = 960; h = 1600; scale = 0.55 }
    "drawable-port-xxxhdpi\splash.png" = @{ w = 1280; h = 1920; scale = 0.55 }
}

foreach ($relPath in $splashes.Keys) {
    $spec = $splashes[$relPath]
    $outPath = Join-Path $androidRes $relPath
    Save-Resized-Png -source $srcBmp -targetWidth $spec.w -targetHeight $spec.h -outputPath $outPath -bgColor $colDark -scaleFactor $spec.scale
    Write-Output "Generated splash: $relPath ($($spec.w)x$($spec.h))"
}

$srcBmp.Dispose()
Write-Output "ALL ASSETS GENERATED SUCCESSFULLY!"
