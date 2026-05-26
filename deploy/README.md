# Hostinger VPS Deploy

Deploy target untuk repo ini adalah `Ubuntu 24.04 + Nginx + PM2 + PostgreSQL` dengan topologi same-origin:

- frontend Vite static diserve oleh `Nginx`
- backend Express berjalan di `127.0.0.1:3001`
- `Nginx` me-reverse-proxy `/api`, `/api/auth`, dan `/health`
- `PostgreSQL` berjalan lokal di VPS

## Prasyarat

- VPS Hostinger Ubuntu 24.04
- Domain sudah mengarah ke VPS
- Paket terpasang: `node`, `npm`, `nginx`, `postgresql`, `pm2`, `certbot`
- Build lokal sudah hijau: `npm run build`

## Struktur Direktori Rekomendasi

- release app: `/var/www/lkp-parduli-rasa/current`
- frontend build: `/var/www/lkp-parduli-rasa/current/dist`
- upload persisten: `/var/lib/lkp-parduli-rasa/uploads`
- backup: `/var/backups/lkp-parduli-rasa`

## Env Produksi

Salin [deploy/env/.env.production.example](/D:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/deploy/env/.env.production.example) menjadi file `.env` di folder release, lalu isi nilai sebenarnya.

Catatan:

- `VITE_API_BASE_URL` dikosongkan untuk same-origin production.
- `DATABASE_SSL_MODE=disable` cocok untuk PostgreSQL lokal di VPS yang sama.
- `BETTER_AUTH_URL` harus memakai origin HTTPS final, misalnya `https://domain-anda/api/auth`.

## Urutan Deploy

1. Upload source repo ke folder release.
2. Jalankan `npm ci`.
3. Siapkan file `.env` produksi.
4. Jalankan migrasi database yang dibutuhkan.
5. Jalankan `npm run build`.
6. Start backend dengan PM2 memakai [deploy/pm2/ecosystem.config.cjs](/D:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/deploy/pm2/ecosystem.config.cjs).
7. Pasang konfigurasi Nginx dari [deploy/nginx/lkp-parduli-rasa.conf.example](/D:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/deploy/nginx/lkp-parduli-rasa.conf.example).
8. Aktifkan SSL dengan Certbot.
9. Jalankan smoke check dari [deploy/scripts/post-deploy-checklist.sh](/D:/DATA%20FERRY%20PENTING/LKP%20Parduli%20Rasa/deploy/scripts/post-deploy-checklist.sh).

## Konfigurasi Nginx

Template Nginx ini mengasumsikan:

- `root` menunjuk ke folder `dist`
- route SPA menggunakan `try_files $uri $uri/ /index.html`
- backend private di `127.0.0.1:3001`

Setelah menyalin config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## PM2

Start backend:

```bash
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

## Smoke Check

Verifikasi minimum:

- `curl http://127.0.0.1:3001/health`
- `curl http://127.0.0.1:3001/api/health`
- `curl -I https://domain-anda/`
- `curl https://domain-anda/api/health`
- refresh langsung ke route SPA non-root tidak menghasilkan 404

## Catatan Risiko

- Repo ini masih punya pekerjaan lanjutan untuk persistence bisnis penuh; artefak deploy ini menyiapkan jalur VPS, bukan menyelesaikan seluruh hardening aplikasi.
- Attachment/file upload butuh storage durable yang konsisten dengan `UPLOADS_DIR`.
