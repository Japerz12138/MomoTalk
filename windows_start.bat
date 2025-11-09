@echo off
echo Starting MomoTalk...
echo.

if not exist .env (
    echo Error: .env file does not exist
    echo Please copy env.template to .env and fill in the configuration information
    pause
    exit /b 1
)

docker-compose up --build


