@echo off
setlocal EnableExtensions
title Switchboard Designer Launcher

cd /d "%~dp0" || goto :directory_error

set "APP_URL=http://127.0.0.1:5173/"
set "APP_MARKER=MULTI-CB-V2"

where node.exe >nul 2>&1 || goto :node_error
where npm.cmd >nul 2>&1 || goto :npm_error

if not exist "package.json" goto :project_error
if not exist "node_modules\vite\bin\vite.js" goto :dependency_error

call :probe_port
if %errorlevel%==0 goto :open_existing
if %errorlevel%==2 goto :occupied_port

echo Starting Switchboard Designer...
start "Switchboard Designer Vite" /D "%CD%" cmd.exe /k "npm run dev -- --host 127.0.0.1"

echo Waiting for Vite at %APP_URL% ...
for /L %%I in (1,1,60) do (
    call :is_ready
    if not errorlevel 1 goto :server_ready
    timeout /t 1 /nobreak >nul
)

echo.
echo ERROR: Vite did not become ready within 60 seconds.
echo Review the "Switchboard Designer Vite" window for npm or Vite errors.
goto :failure

:occupied_port
echo Port 5173 is already in use. Waiting briefly in case Vite is still starting...
for /L %%I in (1,1,20) do (
    call :is_ready
    if not errorlevel 1 goto :open_existing
    timeout /t 1 /nobreak >nul
)
echo.
echo ERROR: Port 5173 is occupied, but it is not serving Switchboard Designer.
echo Close the program using port 5173, then run this launcher again.
goto :failure

:server_ready
echo Vite is ready. Opening %APP_URL%
start "" "%APP_URL%"
exit /b 0

:open_existing
echo Switchboard Designer is already running. Opening %APP_URL%
start "" "%APP_URL%"
exit /b 0

:probe_port
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%'; $marker='%APP_MARKER%'; try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match [regex]::Escape($marker)) { exit 0 }; exit 2 } catch { $c=[Net.Sockets.TcpClient]::new(); try { $t=$c.ConnectAsync('127.0.0.1',5173); if ($t.Wait(500) -and $c.Connected) { exit 2 } } catch {} finally { $c.Dispose() }; exit 1 }"
exit /b %errorlevel%

:is_ready
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match [regex]::Escape('%APP_MARKER%')) { exit 0 } } catch {}; exit 1"
exit /b %errorlevel%

:directory_error
echo ERROR: The project folder could not be opened.
echo Expected launcher folder: %~dp0
goto :failure

:node_error
echo ERROR: Node.js was not found in PATH.
echo Install Node.js, reopen Windows, and run this launcher again.
goto :failure

:npm_error
echo ERROR: npm was not found in PATH.
echo Repair or reinstall Node.js, then run this launcher again.
goto :failure

:project_error
echo ERROR: package.json is missing from:
echo %CD%
goto :failure

:dependency_error
echo ERROR: Required dependencies are missing.
echo Open PowerShell in this folder and run: npm install
echo Then run this launcher again.
goto :failure

:failure
echo.
pause
exit /b 1
