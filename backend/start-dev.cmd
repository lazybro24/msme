@echo off
set "PATH=C:\Users\HP\AppData\Local\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting backend at http://localhost:4000 ...
call npm run dev
