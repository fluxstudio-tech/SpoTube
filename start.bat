@echo off
color 0a
echo ========================================================
echo AuralVault Premium - Baslatma Aracı
echo ========================================================
echo.

echo 1. Sunucu (Backend) baslatiliyor...
start cmd /k "title AuralVault Backend && cd /d %~dp0server && npm run dev"
timeout /t 3 > nul

echo 2. Arayuz (Frontend - Vite) baslatiliyor...
start cmd /k "title AuralVault Frontend && cd /d %~dp0client-desktop && npm run dev"
timeout /t 3 > nul

echo 3. Masaustu Uygulamasi (Electron) baslatiliyor...
cd /d %~dp0client-desktop
npm run start:electron
