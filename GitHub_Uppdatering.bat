@echo off
REM Dubbelklicka denna fil for att skicka uppdaterade filer till GitHub.
REM Ligg filen i repo-mappen (samma mapp som index.html, css/, js/).

cd /d "%~dp0"

echo ============================================
echo   Kontrollerar att filerna ligger ratt...
echo ============================================
if not exist index.html (
    echo.
    echo FEL: index.html hittas inte i den har mappen!
    echo Kopiera in filerna hit innan du kor detta skript.
    echo.
    pause
    exit /b 1
)

echo index.html hittad.
echo.

echo ============================================
echo   Git status (vad som kommer andras)
echo ============================================
git status

echo.
echo ============================================
set /p CONFIRM="Se ovanstaende ut som ratt? Fortsatt? (j/n): "
if /i not "%CONFIRM%"=="j" (
    echo Avbrutet.
    pause
    exit /b 0
)

echo.
echo === Lagger till andringar ===
git add .

echo.
set /p MSG="Skriv en kort beskrivning av andringen: "
if "%MSG%"=="" set MSG=Uppdatering

git commit -m "%MSG%"

echo.
echo === Skickar till GitHub ===
git push

echo.
echo ============================================
echo   Klart! Kolla https://github.com/Boulen/Minnesbank
echo   och https://boulen.github.io/Minnesbank/
echo   (kan ta nagon minut innan sidan uppdateras)
echo ============================================
pause