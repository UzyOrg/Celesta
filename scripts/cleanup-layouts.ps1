# Script temporal para eliminar layouts vacíos
Write-Host "Eliminando layouts problemáticos..." -ForegroundColor Cyan

$file1 = "src\app\demo\student\layout.tsx"
$file2 = "src\app\teacher\[classToken]\layout.tsx"

if (Test-Path $file1) {
    Remove-Item $file1 -Force
    Write-Host "✓ Eliminado: $file1" -ForegroundColor Green
} else {
    Write-Host "- No existe: $file1" -ForegroundColor Yellow
}

if (Test-Path $file2) {
    Remove-Item $file2 -Force
    Write-Host "✓ Eliminado: $file2" -ForegroundColor Green
} else {
    Write-Host "- No existe: $file2" -ForegroundColor Yellow
}

Write-Host "`nLimpieza completada. Ejecuta 'pnpm run build' de nuevo." -ForegroundColor Cyan
