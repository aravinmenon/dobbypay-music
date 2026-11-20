Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\Aravindhan.a\.gemini\antigravity-ide\scratch\spotify-clone\src\assets\dobbypay-logo.png"
$resDir = "c:\Users\Aravindhan.a\.gemini\antigravity-ide\scratch\spotify-clone\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source logo file not found at $srcPath"
    exit 1
}

$origImage = [System.Drawing.Image]::FromFile($srcPath)

$densities = @(
    @{ folder="mipmap-mdpi";    size=48;  fgSize=108 },
    @{ folder="mipmap-hdpi";    size=72;  fgSize=162 },
    @{ folder="mipmap-xhdpi";   size=96;  fgSize=216 },
    @{ folder="mipmap-xxhdpi";  size=144; fgSize=324 },
    @{ folder="mipmap-xxxhdpi"; size=192; fgSize=432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resDir $d.folder
    if (-not (Test-Path $dir)) { 
        New-Item -ItemType Directory -Path $dir -Force | Out-Null 
    }

    $s = $d.size
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0A0A0E")
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $s, $s)
    
    $maxW = $s * 0.85
    $maxH = $s * 0.85
    $scale = [Math]::Min($maxW / $origImage.Width, $maxH / $origImage.Height)
    $drawW = [int]($origImage.Width * $scale)
    $drawH = [int]($origImage.Height * $scale)
    $posX = [int](($s - $drawW) / 2)
    $posY = [int](($s - $drawH) / 2)
    
    $g.DrawImage($origImage, $posX, $posY, $drawW, $drawH)
    $bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()

    # Round icon
    $bmpR = New-Object System.Drawing.Bitmap($s, $s)
    $gR = [System.Drawing.Graphics]::FromImage($bmpR)
    $gR.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gR.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $s, $s)
    $gR.SetClip($path)
    $gR.FillRectangle($brush, 0, 0, $s, $s)
    $gR.DrawImage($origImage, $posX, $posY, $drawW, $drawH)
    $bmpR.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $gR.Dispose()
    $bmpR.Dispose()

    # Foreground icon for adaptive icons
    $fgS = $d.fgSize
    $bmpFG = New-Object System.Drawing.Bitmap($fgS, $fgS)
    $gFG = [System.Drawing.Graphics]::FromImage($bmpFG)
    $gFG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gFG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $maxW_FG = $fgS * 0.65
    $maxH_FG = $fgS * 0.65
    $scaleFG = [Math]::Min($maxW_FG / $origImage.Width, $maxH_FG / $origImage.Height)
    $drawW_FG = [int]($origImage.Width * $scaleFG)
    $drawH_FG = [int]($origImage.Height * $scaleFG)
    $posX_FG = [int](($fgS - $drawW_FG) / 2)
    $posY_FG = [int](($fgS - $drawH_FG) / 2)

    $gFG.DrawImage($origImage, $posX_FG, $posY_FG, $drawW_FG, $drawH_FG)
    $bmpFG.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $gFG.Dispose()
    $bmpFG.Dispose()
}

$origImage.Dispose()
Write-Host "Icons successfully generated in all density folders!"
