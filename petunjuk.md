# 📖 Petunjuk Penggunaan — Bot WA (Railway Edition)

Perubahan yang sudah dilakukan dari script asli:

1. **`pair.html`** — halaman web untuk pairing pakai QR (atau kode, tergantung mode), jadi tidak perlu terminal.
2. **`server.js`** — web server kecil (Express) yang menyajikan `pair.html` + endpoint status + health check untuk Railway.
3. **Env var support** di `config.js` — nomor bot, apikey, mode koneksi, dll bisa diatur dari Railway Variables tanpa edit kode.
4. **`Procfile` + `railway.json`** — supaya Railway langsung tahu cara build & start.
5. Fitur, plugin, handler, dan sistem autoload plugin **tidak ada yang dihapus** — semua tetap seperti aslinya.

Autoload plugin **sudah bawaan script ini** (lihat `lib/plugins.js` & `lib/handler.js`) — jadi kamu tinggal taruh file `.js` baru di folder `plugins/` (boleh bikin subfolder kategori sendiri), dan bot akan otomatis memuatnya saat restart. Tidak perlu edit kode lain.

---

## 1. Deploy ke Railway

1. Push folder ini ke repo GitHub kamu (atau upload manual ke Railway).
2. Di Railway: **New Project > Deploy from GitHub repo**, pilih repo ini.
3. Railway otomatis mendeteksi Node.js dan menjalankan `npm install` lalu `node index.js` (sudah diatur di `Procfile` / `railway.json`).
4. Tunggu build selesai sampai log menunjukkan:
   ```
   [✅] Web pairing server jalan di port ...
   ```

## 2. WAJIB: Pasang Volume untuk sesi login

Tanpa ini, **setiap kali Railway restart/redeploy, bot akan logout dan kamu harus pairing ulang**, karena folder `session/` disimpan di disk lokal container yang bersifat sementara (ephemeral).

Cara pasang:
1. Buka project di Railway > tab **Volumes** > **New Volume**.
2. Set **Mount Path** ke: `/app/session`
   (sesuaikan `/app` jika root project kamu bukan `/app` — cek di Settings > Source).
3. Redeploy service.

Setelah ini, folder `session/` akan tersimpan permanen walau bot restart.

## 3. Atur nomor bot & pengaturan lain (opsional tapi disarankan)

Di Railway: **Settings > Variables**, tambahkan (semua opsional, ada default-nya):

| Variable | Fungsi | Contoh |
|---|---|---|
| `PHONE_NUMBER_BOT` | Nomor WA bot | `6281234567890` |
| `CONNECTION_TYPE` | `qr` atau `pairing` | `qr` |
| `PAIRING_CODE` | Kode custom (hanya jika `CONNECTION_TYPE=pairing`) | `RESBOTMD` |
| `APIKEY` | API key dari autoresbot.com (kalau punya) | - |
| `OWNER_NAME` | Nama tampilan bot | `Toko Nadya` |
| `BOT_DESTINATION` | `group` / `private` / `both` | `both` |
| `PORT` | Port web server (Railway isi otomatis) | - |

Kalau tidak diisi, bot tetap jalan pakai nilai default yang ada di `config.js`.

## 4. Pairing lewat browser

1. Buka domain Railway kamu (Settings > Networking > Generate Domain kalau belum ada), lalu tambahkan `/pair.html`.
   Contoh: `https://nama-project-kamu.up.railway.app/pair.html`
2. Halaman akan otomatis:
   - Menampilkan **QR code** kalau `CONNECTION_TYPE=qr` → scan pakai WhatsApp di HP (Perangkat Tertaut > Tautkan Perangkat).
   - Menampilkan **kode 8 digit** kalau `CONNECTION_TYPE=pairing` → masukkan di WhatsApp (Perangkat Tertaut > Tautkan dengan nomor telepon).
3. Halaman auto-refresh tiap 3 detik, jadi begitu bot berhasil connect, akan berubah jadi "Bot berhasil terhubung ✅" otomatis.
4. Setelah connect, kamu **tidak perlu buka pair.html lagi** kecuali logout / pairing ulang.

## 5. Menambahkan plugin baru (autoload)

1. Buat file `.js` baru di dalam folder `plugins/` (boleh langsung di root `plugins/`, atau di subfolder kategori seperti `plugins/TOOLS/`).
2. Ikuti format command plugin yang sudah ada di script ini (lihat contoh plugin lain di folder yang sama untuk strukturnya).
3. Restart service di Railway (Deploy ulang, atau restart via dashboard).
4. Plugin baru otomatis kebaca — tidak perlu daftar manual di file lain.

## 6. Cek status bot

- `https://domain-kamu/api/status` → JSON status koneksi (dipakai `pair.html`, tapi bisa kamu cek manual juga).
- `https://domain-kamu/health` → dipakai Railway untuk health check otomatis.

## 7. Kalau bot logout / mau pairing ulang

1. Hapus isi folder `session/` (lewat Railway Shell, atau hapus & buat ulang Volume-nya).
2. Restart service.
3. Buka lagi `/pair.html`, akan muncul QR/kode baru.

## 8. Catatan penting

- Script ini butuh **Node.js versi 20 ke atas** — Railway biasanya sudah pakai versi terbaru secara default, tidak perlu diatur manual kecuali kamu override.
- Jangan bagikan folder `session/` ke siapa pun — isinya kredensial login WhatsApp kamu, setara password.
- File `catatan.txt`, `catatan update.txt`, `developer.txt`, `README.md` dari script asli tetap dibiarkan apa adanya, berisi riwayat perubahan dari pembuat aslinya (Autoresbot / Azhari Creative) — berguna kalau butuh referensi.
