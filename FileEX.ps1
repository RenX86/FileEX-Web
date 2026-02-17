#!/usr/bin/env pwsh
# FileEX Docker Compose Manager
# Run this script from anywhere to manage your FileEX container

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "logs", "status", "build", "pull")]
    [string]$Action = "up"
)

# Set the directory where your docker-compose.yaml is located
# Uses the script's own directory to ensure it works regardless of where it's called from
$ComposeDir = "C:\Users\Master\Documents\GitHub\FileEX-Web"

# Change to the compose directory
Push-Location $ComposeDir  

try {
    switch ($Action) {
        "up" {
            Write-Host "Starting FileEX..." -ForegroundColor Green
            docker compose up -d
            Write-Host "`nFileEX is running at http://localhost:6979" -ForegroundColor Cyan
        }
        "down" {
            Write-Host "Stopping FileEX..." -ForegroundColor Yellow
            docker compose down
        }
        "restart" {
            Write-Host "Restarting FileEX..." -ForegroundColor Yellow
            docker compose restart
        }
        "logs" {
            Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
            docker compose logs -f
        }
        "status" {
            Write-Host "FileEX Status:" -ForegroundColor Cyan
            docker compose ps
        }
        "build" {
            Write-Host "Building FileEX..." -ForegroundColor Green
            docker compose build
        }
        "pull" {
            Write-Host "Pulling latest image..." -ForegroundColor Green
            docker compose pull
        }
    }
} finally {
    # Return to original directory
    Pop-Location
}
