@echo off
setlocal
cd /d "%~dp0"

echo Refreshing the Sol starter package with prepared reference bodies...
echo.

call npm run reference:publish-sol-starter
if errorlevel 1 (
  echo.
  echo Sol starter refresh failed. Review the error above.
  pause
  exit /b 1
)

echo.
echo Sol starter refreshed successfully.
echo Refresh Parchment Worlds, then use the Sol starter button.
pause
endlocal
