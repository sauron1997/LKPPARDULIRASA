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
test -f /var/www/lkp-parduli-rasa/current/dist/index.html
echo "dist/index.html found"
