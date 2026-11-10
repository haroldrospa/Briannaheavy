New-Item -ItemType Directory -Force -Path 'build' | Out-Null
Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\public\pwa-512x512.png'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$size = 256
$squareBmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$ratio = [Math]::Min($size / $src.Width, $size / $src.Height)
$w = [int]($src.Width * $ratio)
$h = [int]($src.Height * $ratio)
$x = [int](($size - $w) / 2)
$y = [int](($size - $h) / 2)

$g.DrawImage($src, $x, $y, $w, $h)
$squareBmp.Save((Join-Path $PSScriptRoot '..\build\icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$iconHandle = $squareBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = New-Object System.IO.FileStream((Join-Path $PSScriptRoot '..\build\icon.ico'), [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()
$src.Dispose()
$squareBmp.Dispose()
$g.Dispose()

Write-Host "Icons generated successfully in build/"
