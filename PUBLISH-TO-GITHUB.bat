@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "REPO=https://github.com/WizzleOfOZ/after-hours.git"
echo ================================================================
echo             AFTER HOURS - GITHUB PUBLISHER
 echo ================================================================
echo This will publish the contents of this folder to:
echo   %REPO%
echo IMPORTANT: This repository is currently PUBLIC.
echo Confirm no personal secrets or private files are in this folder.
echo .env and data/rooms.json are ignored by .gitignore.
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install Git for Windows from https://git-scm.com/downloads/win
  echo Reopen this window, then retry.
  pause
  exit /b 1
)
if not exist "package.json" (
  echo Cannot locate package.json. Keep this script in the extracted project folder.
  pause
  exit /b 1
)
if not exist ".git" (
  git init -b main
  if errorlevel 1 goto fail
)
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin %REPO%
  if errorlevel 1 goto fail
) else (
  for /f "delims=" %%R in ('git remote get-url origin') do set "ORIGIN=%%R"
  if /i not "!ORIGIN!"=="%REPO%" (
    echo Existing origin is not the expected repository:
    echo    !ORIGIN!
    echo For safety, no files have been pushed.
    pause
    exit /b 1
  )
)
git add .
if errorlevel 1 goto fail
echo.
echo Staged files:
git diff --cached --stat
if errorlevel 1 goto fail
echo.
choice /c YN /n /m "Publish these files to your PUBLIC GitHub repository? [Y/N] "
if errorlevel 2 (
  echo Cancelled. No changes were published.
  pause
  exit /b 0
)
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Deploy After Hours V2 multiplayer date night"
  if errorlevel 1 (
    echo Commit failed. If Git asks for your identity, run:
    echo   git config --global user.name "Your Name"
    echo   git config --global user.email "your-github-email@example.com"
    goto fail
  )
)
git branch -M main
if errorlevel 1 goto fail
git push -u origin main
if errorlevel 1 (
  echo.
  echo Push failed. Check your GitHub sign-in and repository permissions.
  echo No force-push was attempted. Existing remote history was not overwritten.
  goto fail
)
echo.
echo SUCCESS: project published at https://github.com/WizzleOfOZ/after-hours
pause
exit /b 0
:fail
echo.
echo Publish was not completed. Check the error above.
pause
exit /b 1
