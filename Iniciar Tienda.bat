@echo off
chcp 65001 >nul
title Tienda WoW - Portal
cd /d "%~dp0"

echo ==================================================
echo    TIENDA WOW - Portal web
echo ==================================================
echo.

REM --- Verificar que Node.js este instalado ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js. Instalalo desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM --- Verificar que exista el archivo .env ---
if not exist ".env" (
    echo [ERROR] No se encontro el archivo .env en esta carpeta.
    echo         El portal lo necesita para conectarse a MySQL y a SOAP.
    echo.
    pause
    exit /b 1
)

REM --- Instalar dependencias si falta node_modules ---
if not exist "node_modules" (
    echo No se encontro la carpeta node_modules. Instalando dependencias...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo.
)

:iniciar
echo [%date% %time:~0,8%] Iniciando portal...
echo Para detenerlo: cierra esta ventana o presiona Ctrl+C
echo --------------------------------------------------
echo.

node app.js

echo.
echo --------------------------------------------------
echo [%date% %time:~0,8%] El portal se detuvo.
echo Si fue por un error, revisa los mensajes de arriba.
echo.
choice /c RS /n /m "Presiona R para reiniciar o S para salir: "
if errorlevel 2 exit /b 0
cls
goto iniciar
