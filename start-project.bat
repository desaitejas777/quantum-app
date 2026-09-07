@echo off

cd /d "%~dp0"

echo Starting Backend...
start "QuantumLearn Backend" cmd /k "cd /d backend && npm install && node server.js"

timeout /t 5

echo Starting Frontend...
start "QuantumLearn Frontend" cmd /k "cd /d frontend && npm install && npm start"

timeout /t 10

echo Opening Website...
start chrome http://localhost:3000