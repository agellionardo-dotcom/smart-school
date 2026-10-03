@echo off
chcp 65001 >nul
echo ========================================
echo   Smart School - التثبيت الأولي
echo ========================================
echo.

echo [1/4] تثبيت مكتبات Backend...
cd backend
call npm install
if errorlevel 1 (echo فشل! & pause & exit /b)

echo.
echo [2/4] التأكد من MongoDB...
net start MongoDB >nul 2>&1

echo.
echo [3/4] إنشاء قاعدة البيانات...
call node seed.js
cd ..

echo.
echo [4/4] تثبيت مكتبات Frontend...
cd frontend
call npm install
cd ..

echo.
echo ========================================
echo   تم التثبيت بنجاح
echo   شغّل "2-تشغيل.bat" الآن
echo ========================================
pause