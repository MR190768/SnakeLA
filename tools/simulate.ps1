# simulate.ps1 - Descarga CLI de Battlesnake y corre una simulación local 4v4
$ErrorActionPreference = "Stop"

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $toolsDir
Set-Location $projectDir

# 1. Asegurarnos que el CLI de Battlesnake esté descargado
if (-not (Test-Path "$toolsDir\battlesnake.exe")) {
    Write-Host "Descargando Battlesnake CLI..."
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/BattlesnakeOfficial/rules/releases/latest"
    $asset = $release.assets | Where-Object { $_.name -match "Windows_x86_64.tar.gz" } | Select-Object -First 1
    
    $downloadUrl = $asset.browser_download_url
    $tempFile = "$toolsDir\battlesnake.tar.gz"
    
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile
    
    Write-Host "Extrayendo CLI..."
    Set-Location $toolsDir
    tar -xzf battlesnake.tar.gz
    Set-Location $projectDir
    
    Remove-Item $tempFile -Force
    Write-Host "CLI descargado exitosamente."
}

# 2. Compilar el proyecto
Write-Host "Compilando proyecto (npm run build)..."
npm run build

# 3. Iniciar el servidor de la serpiente en segundo plano
Write-Host "Iniciando servidor de Battlesnake local..."
$serverJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    npm start
} -ArgumentList $projectDir

# Esperar unos segundos a que el servidor se levante
Start-Sleep -Seconds 4

# 4. Correr la partida local 4v4
Write-Host "Iniciando partida 4v4..."
$cliPath = "$toolsDir\battlesnake.exe"

# Ejecutar el comando para 4 serpientes locales
& $cliPath play -W 11 -H 11 `
    --name "Bot1" --url "http://localhost:8080" `
    --name "Bot2" --url "http://localhost:8080" `
    --name "Bot3" --url "http://localhost:8080" `
    --name "Bot4" --url "http://localhost:8080" `
    -g standard

Write-Host "Partida terminada."

# 5. Detener el servidor
Write-Host "Deteniendo servidor local..."
Stop-Job $serverJob
Remove-Job $serverJob

Write-Host "Logs recolectados. Puedes verlos en data/telemetry_logs.jsonl"
