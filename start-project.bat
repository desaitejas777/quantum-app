@echo off

echo Starting Backend...
start cmd /k "cd /d quantum-app\backend && npm install && node server.js"

timeout /t 5

echo Starting Frontend...
start cmd /k "cd /d quantum-app\frontend && npm install && npm start"

timeout /t 10

echo Opening Website...
start chrome http://localhost:3000