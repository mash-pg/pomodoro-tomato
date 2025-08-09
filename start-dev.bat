@echo off
setlocal EnableExtensions

REM ===== settings =====
set "HOST=127.0.0.1"
set "PORT=3000"
set "OPEN_PATH=/"
set "MAX_WAIT=600"
REM ====================

title Next.js Dev Crash Catcher
color 0a
cls

echo [1/4] Kill existing %HOST%:%PORT% (if any)...
for /f "tokens=5" %%p in ('netstat -ano ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

echo [2/4] Run tests (foreground)...
call npm run test
if errorlevel 1 (
  echo Tests failed. See output above.
  pause
  goto END
)

echo [3/4] Build (foreground)...
call npm run build
if errorlevel 1 (
  echo Build failed. See output above.
  pause
  goto END
)

echo [4/4] Launch background opener and start dev (foreground)...
start "" powershell -NoProfile -WindowStyle Hidden -Command ^
  "$h='%HOST%'; $p=%PORT%; $u='http://%HOST%:%PORT%%OPEN_PATH%';" ^
  "for($i=0; $i -lt %MAX_WAIT%; $i++) {" ^
  "  $r = Test-NetConnection -ComputerName $h -Port $p -WarningAction SilentlyContinue;" ^
  "  if ($r.TcpTestSucceeded) { Start-Sleep -Seconds 1; Start-Process $u; break }" ^
  "  Start-Sleep -Seconds 1" ^
  "}"

set "NODE_OPTIONS=--trace-uncaught --trace-warnings"
npm run dev -- -H %HOST% -p %PORT%

echo.
echo dev exited. If it crashed, copy the last lines above.
pause
:END
endlocal
