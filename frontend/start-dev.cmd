@echo off
set "PATH=C:\Users\HP\AppData\Local\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting frontend at http://localhost:3000 ...
call npm run dev
