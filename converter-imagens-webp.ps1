# =============================================================================
# PRIME PINTURA — Conversor de Imagens para WebP
# Requisito: instalar o "squoosh-cli" ou "sharp-cli" via npm, OU instalar
# o ImageMagick (https://imagemagick.org/script/download.php#windows)
# =============================================================================
# Como usar:
#   1. Instale o ImageMagick (versão com Q16-HDRI para Windows)
#   2. Abra o PowerShell nesta pasta
#   3. Execute: .\converter-imagens-webp.ps1
# =============================================================================

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Imagens que ainda precisam de versão WebP
$toConvert = @(
    # Logos (PNG -> WebP)
    @{ src = "assets\logo\logo.png";           dst = "assets\logo\logo.webp" },
    @{ src = "assets\logo\logo-light.png";     dst = "assets\logo\logo-light.webp" },
    @{ src = "assets\logo\favicon.png";        dst = "assets\logo\favicon.webp" },
    # Posters de vídeo (JPG -> WebP)
    @{ src = "assets\video\amarelo-poster.jpg"; dst = "assets\video\amarelo-poster.webp" },
    @{ src = "assets\video\laranja-poster.jpg"; dst = "assets\video\laranja-poster.webp" },
    @{ src = "assets\video\azul-poster.jpg";    dst = "assets\video\azul-poster.webp" },
    # Loading logo (JPG -> WebP)
    @{ src = "assets\img\loading-logo.jpg";    dst = "assets\img\loading-logo.webp" },
    # OG Cover (JPG -> WebP)
    @{ src = "assets\img\og-cover.jpg";        dst = "assets\img\og-cover.webp" }
)

foreach ($item in $toConvert) {
    $srcPath = Join-Path $baseDir $item.src
    $dstPath = Join-Path $baseDir $item.dst

    if (-not (Test-Path $srcPath)) {
        Write-Host "SKIP (not found): $($item.src)" -ForegroundColor Yellow
        continue
    }
    if (Test-Path $dstPath) {
        Write-Host "SKIP (already exists): $($item.dst)" -ForegroundColor Cyan
        continue
    }

    try {
        # Uses ImageMagick 'magick' command
        & magick $srcPath -quality 85 $dstPath
        $origKB  = [math]::Round((Get-Item $srcPath).Length / 1KB, 1)
        $newKB   = [math]::Round((Get-Item $dstPath).Length / 1KB, 1)
        $savings = [math]::Round((1 - $newKB / $origKB) * 100, 0)
        Write-Host "OK: $($item.src) → $($item.dst)  ($origKB KB → $newKB KB, -$savings%)" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR converting $($item.src): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Conversão concluída!" -ForegroundColor Green
Write-Host "Lembre-se: as tags <picture> já estão nos HTMLs com fallback JPG/PNG automatico." -ForegroundColor Cyan
