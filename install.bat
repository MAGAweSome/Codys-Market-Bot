@echo off
TITLE Codys Market Bot Installer

echo ===================================================
echo 🛒 STARTING CODYS MARKET BOT DEPENDENCY INSTALLER
echo ===================================================
echo.

:: Check if Node.js is installed on the computer
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js was not found on your system!
    echo Please download and install Node.js from https://nodejs.org/ before running this installer.
    echo.
    pause
    exit
)

echo 🟢 Node.js environment detected successfully.
echo 📦 Fetching background packages (discord.js)...
echo Please wait, this may take a moment depending on your internet connection...
echo.

:: Run the dependency installation command
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Something went wrong during the installation process.
    echo Please make sure your internet connection is active and try again.
) else (
    echo.
    echo ===================================================
    echo 🎉 SUCCESS: All dependencies have been installed!
    echo You can now configure your .env file and run the bot.
    echo ===================================================
)

echo.
pause