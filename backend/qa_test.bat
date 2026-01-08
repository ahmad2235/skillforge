@echo off
REM QA REST API Tests
REM Start server first manually: php artisan serve --port=8000

timeout /t 5 /nobreak

REM Test 1: Student creates conversation
echo [TEST 1] Student creates conversation with Business Owner
curl -X POST http://127.0.0.1:8000/api/chat/conversations -H "Authorization: Bearer 300|9JsHrQSe3BUJVdLeeWSjsupCKgsCJGsmai2L5qcX279946a2" -H "Content-Type: application/json" -d "{\"target_user_id\":58}" -s -o test1_response.json
echo.

REM Test 2: Business fetches conversations
echo [TEST 2] Business owner fetches conversations
curl -X GET http://127.0.0.1:8000/api/chat/conversations -H "Authorization: Bearer 301|PIz5qrIOza5500CW4lWWlTOJVHWhLJXHyaS3xSJ0527f9eae" -s -o test2_response.json
echo.

REM Test 3: Admin forbidden
echo [TEST 3] Admin attempts to fetch (expect 403)
curl -X GET http://127.0.0.1:8000/api/chat/conversations -H "Authorization: Bearer 302|w9b538dLtC0ljKpreHDNQCTWB0CUF4OyFYXnw2XIe84fa631" -s -i -o test3_response.txt
echo.

echo Done. Check test*_response.* files.
