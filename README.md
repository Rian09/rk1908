# Bot WhatsApp Pengaduan & Aspirasi — YONIF TP 953/HARIMAU RAWA

Bot ini menggunakan WhatsApp Web melalui `whatsapp-web.js`, bukan WhatsApp Cloud API.

## Fitur
- Pesan pembuka portal
- Menu 1–6
- Form pengaduan/aspirasi/informasi
- Nomor tiket otomatis
- Cek status tiket
- Lampiran media
- Dashboard admin
- Ubah status dan catatan
- Notifikasi pengaduan baru ke nomor admin
- Login WhatsApp menggunakan QR

## Persyaratan
- Node.js 18+ (disarankan versi LTS)
- WhatsApp pada ponsel
- Komputer/server yang dapat menjalankan Chromium/Puppeteer

## Instalasi
1. Ekstrak ZIP.
2. Buka terminal di folder proyek.
3. Jalankan:
   npm install
4. Salin `.env.example` menjadi `.env` dan isi `ADMIN_NUMBER`.
   Jika tidak memakai notifikasi admin, boleh dikosongkan.
5. Jalankan:
   npm start
6. QR akan muncul di terminal. Buka WhatsApp > Perangkat tertaut > Tautkan perangkat, lalu scan QR.
7. Setelah muncul `Bot WhatsApp aktif`, buka:
   http://localhost:3000

## Catatan
- Sesi WhatsApp tersimpan di folder auth/ sehingga biasanya tidak perlu scan QR setiap kali restart.
- Database disimpan di `data/complaints.json`.
- Untuk produksi, dashboard sebaiknya diberi login/password dan HTTPS.
- Gunakan akun WhatsApp khusus layanan agar tidak mengganggu akun pribadi.
- WhatsApp Web automation bukan WhatsApp Cloud API dan dapat terpengaruh perubahan pada WhatsApp.
