#!/usr/bin/env bash
set -eu

echo "== Node version =="
node -v

echo "== PM2 status =="
pm2 status

echo "== Backend health =="
curl -fsS http://127.0.0.1:3001/health
echo

echo "== API health =="
curl -fsS http://127.0.0.1:3001/api/health
echo

echo "== Frontend build artifact =="
test -f /var/www/lkp-parduli-rasa/current/apps/web/dist/index.html
echo "apps/web/dist/index.html found"

echo
echo "== Public landing =="
curl -fsS http://127.0.0.1:3001/api/v1/public/landing | head -c 200
echo

echo "== Auth /me endpoint =="
curl -fsS -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:3001/api/v1/auth/me
echo

echo "== Smoke check complete. =="
