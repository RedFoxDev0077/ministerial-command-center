@echo off
echo ==========================================
echo   Deploying Updates to VPS
echo ==========================================
echo.

REM First, push the update script to the VPS
echo [1/3] Uploading deployment script...
scp -o StrictHostKeyChecking=no deployment/update-deployment.sh root@72.61.41.94:/var/www/ministerial-command-center/

echo.
echo [2/3] Making script executable...
ssh -o StrictHostKeyChecking=no root@72.61.41.94 "chmod +x /var/www/ministerial-command-center/update-deployment.sh"

echo.
echo [3/3] Running deployment script...
ssh -o StrictHostKeyChecking=no root@72.61.41.94 "/var/www/ministerial-command-center/update-deployment.sh"

echo.
echo ==========================================
echo   DEPLOYMENT COMPLETE!
echo ==========================================
echo.
echo Visit: http://72.61.41.94
echo.
pause
