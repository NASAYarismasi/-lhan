@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=node.exe"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"

"%NODE_EXE%" --version >nul 2>&1
if errorlevel 1 (
    echo Node.js bulunamadi. Node.js kurulumunu kontrol et.
    pause
    exit /b 1
)

if not exist "gorev-simulasyonu.mjs" (
    echo gorev-simulasyonu.mjs dosyasi bulunamadi.
    echo BASLAT.cmd ve gorev-simulasyonu.mjs ayni klasorde olmali.
    pause
    exit /b 1
)

"%NODE_EXE%" --input-type=module -e "import { simulateMission } from './gorev-simulasyonu.mjs'; const input = { days: 3, imagesPerDay: 4 }; const standard = simulateMission(input); const fast = simulateMission({ ...input, antenna: 'highRate' }); console.log('AY HARITALAMA DEMOSU'); console.log('Standart anten: ' + standard.deliveredImages + '/12 goruntu ulasti - hedef eksik.'); console.log('Yuksek hizli anten: ' + fast.deliveredImages + '/12 goruntu ulasti - gorev basarili.');"
set "RUN_RESULT=%errorlevel%"
echo.
pause
exit /b %RUN_RESULT%
