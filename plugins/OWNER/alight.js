import mess from '../../strings.js';
import { getGroupMetadata } from '../../lib/cache.js';
import axios from 'axios';
import config from '../../config.js';

async function sendMessage(sock, remoteJid, text, message) {
  try {
    await sock.sendMessage(remoteJid, { text }, { quoted: message });
  } catch (error) {
    console.error(`Failed to send message: ${error.message}`);
  }
}

// ── Owner Check (STRIP QUOTE + FLEXIBLE) ───────────────
function isOwner(sender = '') {
  // Debug log
  console.log('[AMPREM DEBUG] Raw sender:', JSON.stringify(sender));

  // Bersihin sender dari quote/apapun
  let cleanSender = String(sender || '')
    .trim()
    .replace(/^["']+|["']+$/g, '') // buang quote di awal & akhir
    .toLowerCase();

  console.log('[AMPREM DEBUG] Clean sender:', cleanSender);

  const FORCE_OWNERS = [
    '264643620647015@lid',
    '264643620647015',
    '264643620647015@lid:0',
    '6287727703519',
    '6287727703519@s.whatsapp.net',
    '6287727703519:0',
  ];

  const configOwners = (config.owner_number || []).filter(Boolean);

  const allOwners = [
    ...FORCE_OWNERS,
    ...configOwners,
    config.owner_wa,
    config.owner_lid,
    config.phone_number_bot,
  ].filter(Boolean);

  // Ekstrak digit dari sender
  const senderDigits = cleanSender.match(/\d+/)?.[0] || '';

  for (const owner of allOwners) {
    const cleanOwner = String(owner)
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .toLowerCase();

    // Skip kalau kosong
    if (!cleanOwner) continue;

    const ownerDigits = cleanOwner.match(/\d+/)?.[0] || '';

    // Cek full
    if (cleanSender.includes(cleanOwner) || cleanOwner.includes(cleanSender)) {
      console.log('[AMPREM DEBUG] MATCH full:', cleanOwner);
      return true;
    }

    // Cek digit doang (cara paling anti gagal)
    if (senderDigits && ownerDigits && senderDigits === ownerDigits) {
      console.log('[AMPREM DEBUG] MATCH digits:', ownerDigits);
      return true;
    }

    // Cek sender tanpa @lid / @s.whatsapp.net
    const senderBare = cleanSender.replace(/@.*$/, '');
    const ownerBare = cleanOwner.replace(/@.*$/, '');
    if (senderBare && ownerBare && (senderBare === ownerBare || senderBare.includes(ownerBare) || ownerBare.includes(senderBare))) {
      console.log('[AMPREM DEBUG] MATCH bare:', ownerBare);
      return true;
    }
  }

  console.log('[AMPREM DEBUG] NO MATCH. Sender digits:', senderDigits);
  console.log('[AMPREM DEBUG] Owner digits:', allOwners.map(o => String(o).match(/\d+/)?.[0]).filter(Boolean));
  return false;
}

const API_URL = 'https://am.rafaelxd.my.id/api/v1';
const API_KEY = 'alight_live_5383dc6f4bcfc2cf454def15d8cdd57f';

async function handle(sock, messageInfo) {
  const { remoteJid, isGroup, message, sender } = messageInfo;

  console.log('[AMPREM] handle called | sender:', sender);

  if (!isOwner(sender)) {
    await sendMessage(sock, remoteJid, '❌ *Khusus owner.* Lu bukan owner, bro.', message);
    return;
  }

  if (isGroup) {
    await sendMessage(sock, remoteJid, '❌ *Khusus private chat.* Gunakan di DM bot.', message);
    return;
  }

  try {
    const body =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      '';
    const args = body.trim().split(/\s+/);
    args.shift();

    if (!args[0]) {
      const helpText = `🎬 *ᴀᴍᴘʀᴇᴍ ᴄʀᴇᴀᴛɪᴠᴇ ᴛᴏᴏʟs*

📋 *Perintah:*

✉️  *.amprem send <email>*
   Kirim magic link ke email

✅ *.amprem verify <email> <rawLink>*
   Verifikasi akun dengan magic link

👑 *.amprem apply <email> <idToken>*
   Apply premium ke akun

📌 *Contoh:*
   .amprem send user@gmail.com
   .amprem verify user@gmail.com https://alightcreative.com/auth/xxx
   .amprem apply user@gmail.com eyJhbGciOi...`;
      await sendMessage(sock, remoteJid, helpText, message);
      return;
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'send':
        await handleSendMagicLink(sock, remoteJid, message, args);
        break;
      case 'verify':
        await handleVerifyAccount(sock, remoteJid, message, args);
        break;
      case 'apply':
        await handleApplyPremium(sock, remoteJid, message, args);
        break;
      default:
        await sendMessage(sock, remoteJid, `❌ Sub-perintah *${subCommand}* tidak dikenal.\n\nGunakan: \`send\`, \`verify\`, atau \`apply\``, message);
    }
  } catch (error) {
    console.error(`Error in amprem handle: ${error.message}`);
    await sendMessage(sock, remoteJid, `❌ *Error:* ${error.message}`, message);
  }
}

// ── SEND MAGIC LINK ──
async function handleSendMagicLink(sock, remoteJid, message, args) {
  const email = args[1];
  if (!email) {
    await sendMessage(sock, remoteJid, `✉️ *sᴇɴᴅ ᴍᴀɢɪᴄ ʟɪɴᴋ*\n\n> Masukkan email tujuan\n\n\`Contoh: .amprem send user@gmail.com\``, message);
    return;
  }
  if (!email.includes('@') || !email.includes('.')) {
    await sendMessage(sock, remoteJid, `❌ Format email *${email}* tidak valid!`, message);
    return;
  }
  await sendMessage(sock, remoteJid, '⏳ *Mengirim magic link...*', message);

  try {
    const response = await axios.post(
      `${API_URL}/send-magiclink`,
      { email },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY }, timeout: 30000 }
    );
    const result = response.data;

    if (result?.success || result?.status === 'ok') {
      let caption = `✉️ *ᴍᴀɢɪᴄ ʟɪɴᴋ ᴛᴇʀᴋɪʀɪᴍ*\n\n`;
      caption += `📧 *Email:* ${email}\n`;
      caption += `📊 *Status:* ✅ Berhasil\n\n`;
      if (result?.message) caption += `💬 *Pesan:* ${result.message}\n\n`;
      caption += `📌 *Langkah selanjutnya:*\n`;
      caption += `   1. Cek inbox email *${email}*\n`;
      caption += `   2. Buka link verifikasi dari Alight\n`;
      caption += `   3. Copy URL-nya\n`;
      caption += `   4. Gunakan perintah:\n   \`.amprem verify ${email} <url>\``;
      await sendMessage(sock, remoteJid, caption, message);
    } else {
      const errMsg = result?.message || result?.error || 'Gagal mengirim magic link';
      await sendMessage(sock, remoteJid, `❌ *ɢᴀɢᴀʟ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
    }
  } catch (error) {
    console.error('Send MagicLink Error:', error?.response?.data || error.message);
    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error || error.message || 'Unknown error';
    await sendMessage(sock, remoteJid, `☢ *ᴇʀʀᴏʀ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
  }
}

// ── VERIFY ACCOUNT ──
async function handleVerifyAccount(sock, remoteJid, message, args) {
  const email = args[1];
  const rawLink = args[2];
  if (!email || !rawLink) {
    await sendMessage(sock, remoteJid, `✅ *ᴠᴇʀɪғʏ ᴀᴄᴄᴏᴜɴᴛ*\n\n> Masukkan email & raw link verifikasi\n\n📋 *Format:*\n\`.amprem verify <email> <rawLink>\`\n\n📌 *Contoh:*\n\`.amprem verify user@gmail.com https://alightcreative.com/auth/xxxx\``, message);
    return;
  }
  await sendMessage(sock, remoteJid, '⏳ *Memverifikasi akun...*', message);

  try {
    const response = await axios.post(
      `${API_URL}/verify-account`,
      { email, rawLink },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY }, timeout: 30000 }
    );
    const result = response.data;

    if (result?.success || result?.status === 'ok') {
      const idToken = result?.data?.idToken || result?.idToken || 'Tidak tersedia';
      let caption = `✅ *ᴀᴋᴜɴ ᴛᴇʀᴠᴇʀɪғɪᴋᴀsɪ*\n\n`;
      caption += `📧 *Email:* ${email}\n`;
      caption += `🔑 *ID Token:* \`\`\`${idToken}\`\`\`\n`;
      caption += `📊 *Status:* ✅ Berhasil\n\n`;
      if (result?.message) caption += `💬 *Pesan:* ${result.message}\n\n`;
      caption += `📌 *Langkah selanjutnya:*\n   Gunakan ID Token untuk apply premium:\n   \`.amprem apply ${email} ${idToken}\``;
      await sendMessage(sock, remoteJid, caption, message);
    } else {
      const errMsg = result?.message || result?.error || 'Gagal verifikasi akun';
      await sendMessage(sock, remoteJid, `❌ *ɢᴀɢᴀʟ ᴠᴇʀɪғɪᴋᴀsɪ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
    }
  } catch (error) {
    console.error('Verify Account Error:', error?.response?.data || error.message);
    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error || error.message || 'Unknown error';
    await sendMessage(sock, remoteJid, `☢ *ᴇʀʀᴏʀ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
  }
}

// ── APPLY PREMIUM ──
async function handleApplyPremium(sock, remoteJid, message, args) {
  const email = args[1];
  const idToken = args[2];
  if (!email || !idToken) {
    await sendMessage(sock, remoteJid, `👑 *ᴀᴘᴘʟʏ ᴘʀᴇᴍɪᴜᴍ*\n\n> Masukkan email & ID Token dari verifikasi\n\n📋 *Format:*\n\`.amprem apply <email> <idToken>\`\n\n📌 *Contoh:*\n\`.amprem apply user@gmail.com eyJhbGciOi...\``, message);
    return;
  }
  await sendMessage(sock, remoteJid, '⏳ *Mengaplikasikan premium...*', message);

  try {
    const response = await axios.post(
      `${API_URL}/apply-premium`,
      { email, idToken },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY }, timeout: 30000 }
    );
    const result = response.data;

    if (result?.success || result?.status === 'ok') {
      let caption = `👑 *ᴘʀᴇᴍɪᴜᴍ ʙᴇʀʜᴀsɪʟ*\n\n`;
      caption += `📧 *Email:* ${email}\n`;
      caption += `🌟 *Status:* ✅ Premium Applied\n\n`;
      if (result?.expired || result?.expiry) caption += `📅 *Expired:* ${result.expired || result.expiry}\n\n`;
      if (result?.message) caption += `💬 *Pesan:* ${result.message}\n`;
      caption += `\n🎉 _Selamat! Akun kamu sudah premium!_`;
      await sendMessage(sock, remoteJid, caption, message);
    } else {
      const errMsg = result?.message || result?.error || 'Gagal apply premium';
      await sendMessage(sock, remoteJid, `❌ *ɢᴀɢᴀʟ ᴘʀᴇᴍɪᴜᴍ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
    }
  } catch (error) {
    console.error('Apply Premium Error:', error?.response?.data || error.message);
    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error || error.message || 'Unknown error';
    await sendMessage(sock, remoteJid, `☢ *ᴇʀʀᴏʀ*\n\n📧 *Email:* ${email}\n💬 *Pesan:* ${errMsg}`, message);
  }
}

export default {
  handle,
  Commands: ['amprem', 'am', 'premium'],
  OnlyPremium: false,
  OnlyOwner: true,
};