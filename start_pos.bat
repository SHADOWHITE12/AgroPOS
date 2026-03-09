@echo off
TITLE POS Antigravity - Sistema de Ventas
echo ==========================================
echo    INICIANDO POS ANTIGRAVITY...
echo ==========================================
cd /d "c:\Users\EQUIPO 6\Documents\POS Antigravity"
echo Directorio: %cd%
echo Iniciando servidores (Frontend y Backend)...
npm run dev
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Hubo un problema al iniciar el sistema.
    pause
)
