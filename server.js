/*
─────────────────────────────────────────────
server.js — Web server untuk pairing QR & health check
─────────────────────────────────────────────
Dibuat supaya bot bisa dipasangkan (pairing) ke WhatsApp lewat browser,
karena di Railway tidak ada terminal interaktif untuk scan QR text biasa.

Menyediakan:
  GET /            -> redirect ke /pair.html
  GET /pair.html   -> halaman web untuk scan QR / lihat kode pairing
  GET /api/status  -> status koneksi bot (JSON, dipoll otomatis oleh pair.html)
  GET /health       -> health check sederhana (dipakai Railway)

Server ini TIDAK dibuat dari file baileys/connection.js apapun,
jadi aman dijalankan berdampingan dengan bot tanpa mengganggu proses WhatsApp.
*/

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function startWebServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.redirect('/pair.html');
  });

  app.get('/pair.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
  });

  // Status dipoll oleh pair.html setiap beberapa detik
  app.get('/api/status', (req, res) => {
    const status = global.pairingStatus || {
      qrDataUrl: null,
      pairingCode: null,
      connected: false,
      updatedAt: null,
    };

    res.json({
      connected: !!status.connected,
      qrDataUrl: status.qrDataUrl || null,
      pairingCode: status.pairingCode || null,
      updatedAt: status.updatedAt || null,
      botNumber: global.phone_number_bot || null,
    });
  });

  // Dipakai Railway untuk cek apakah service masih hidup
  app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`[✅] Web pairing server jalan di port ${PORT}`);
    console.log(`[ℹ️] Buka /pair.html di browser untuk pairing (QR / kode).`);
  });
}

export { startWebServer };
