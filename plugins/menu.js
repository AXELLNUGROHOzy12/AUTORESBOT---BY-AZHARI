// plugins/menu.js — NadyaStore Bot | Tema Sakura

import { loadMenuOnce } from '../database/menu.js';
import config from '../config.js';

import { readFileAsBuffer } from '../lib/fileHelper.js';

import { reply, style, getCurrentDate, readMore } from '../lib/utils.js';

import { isOwner, isPremiumUser } from '../lib/users.js';

import fs from 'fs/promises';
import path from 'path';

import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from 'baileys';

/* =========================
   IDENTITAS BOT
========================= */

const BOT_NAME = 'NadyaStore Bot';

/* =========================
   CONFIG
========================= */

const GROUP_LINK = 'https://www.whatsapp.com/channel/0029VaDSRuf05MUekJbazP1D';

const ENABLE_MENU_AUDIO = true;

const MENU_MEDIA_FILE = '@assets/allmenu.jpg';

const AUDIO_PATH = path.join(process.cwd(), 'database', 'audio');

const AUDIO_FILES = {
  pagi: 'pagi.opus',
  siang: 'siang.opus',
  sore: 'sore.opus',
  petang: 'petang.opus',
  malam: 'malam.opus',
};

/* =========================
   TEMA SAKURA (dekorasi non-emoji)
========================= */

const DECO = {
  cornerL: '⟡',
  cornerR: '⟡',
  line: '─',
  bullet: '⌁',
  star: '✧',
  diamond: '◈',
  wave: '〜',
};

function sakuraHeader(title) {
  return `╭${DECO.line}${DECO.line}${DECO.cornerL}${DECO.line}${DECO.line}◜ *${title.toUpperCase()}* ◝${DECO.line}${DECO.line}${DECO.cornerR}${DECO.line}${DECO.line}╮`;
}

function sakuraFooter() {
  return `╰${DECO.line.repeat(6)}${DECO.diamond}${DECO.line.repeat(6)}╯`;
}

function sakuraDivider() {
  return `┈${DECO.wave}${DECO.star}${DECO.wave}┈${DECO.wave}${DECO.star}${DECO.wave}┈`;
}

/* =========================
   USER ROLE
========================= */

function getUserRole(sender) {
  if (isOwner(sender)) {
    return 'Owner';
  }

  if (isPremiumUser(sender)) {
    return 'Premium';
  }

  return 'User';
}

/* =========================
   GREETING AUDIO
========================= */

function getGreetingFile() {
  const now = new Date();

  const wibHours = (now.getUTCHours() + 7) % 24;

  if (wibHours >= 5 && wibHours <= 10) {
    return AUDIO_FILES.pagi;
  }

  if (wibHours >= 11 && wibHours < 15) {
    return AUDIO_FILES.siang;
  }

  if (wibHours >= 15 && wibHours <= 18) {
    return AUDIO_FILES.sore;
  }

  if (wibHours > 18 && wibHours <= 19) {
    return AUDIO_FILES.petang;
  }

  return AUDIO_FILES.malam;
}

async function getGreetingAudio() {
  try {
    const file = getGreetingFile();

    return await fs.readFile(path.join(AUDIO_PATH, file));
  } catch (err) {
    console.error('Error reading audio:', err);

    return null;
  }
}

/* =========================
   MENU FORMAT (Tema Sakura)
========================= */

function formatMenu(title, items) {
  const formattedItems = items.map((item) => {
    if (typeof item === 'string') {
      return `┃ ${DECO.bullet} ${item}`;
    }

    if (typeof item === 'object' && item.command && item.description) {
      return `┃ ${DECO.bullet} ${item.command} — ${item.description}`;
    }

    return `┃ ${DECO.bullet} [Invalid item]`;
  });

  return `${sakuraHeader(title)}
┃
${formattedItems.join('\n')}
┃
${sakuraFooter()}`;
}

function buildMainMenu(menuData) {
  return `
${sakuraHeader('Menu Utama')}
┃
${Object.keys(menuData)
  .map((key) => `┃ ${DECO.diamond} ${key}`)
  .join('\n')}
┃
${sakuraFooter()}

_Ketik nama kategori untuk melihat isinya._
_Contoh: *.menu tools* atau *.allmenu* untuk menampilkan semua menu_`;
}

function buildAllMenu(pushName, roleUser, date, menuData) {
  return `
╭${DECO.line.repeat(3)}${DECO.cornerL} *${BOT_NAME}* ${DECO.cornerR}${DECO.line.repeat(3)}
│ ᴺᵃᵐᵉ  : *${pushName || 'Unknown'}*
│ ˢᵗᵃᵗᵘˢ : *${roleUser}*
│ ᴰᵃᵗᵉ   : *${date}*
╰${DECO.line.repeat(18)}

${readMore()}

${sakuraDivider()}

${Object.keys(menuData)
  .map((key) => formatMenu(key, menuData[key]))
  .join('\n\n')}

${sakuraDivider()}`;
}

/* =========================
   SEND AUDIO
========================= */

async function sendMenuAudio(sock, jid, quoted) {
  if (!ENABLE_MENU_AUDIO) {
    return;
  }

  const audio = await getGreetingAudio();

  if (!audio) {
    return;
  }

  await sock.sendMessage(
    jid,
    {
      audio,
      mimetype: 'audio/mp4',
      ptt: true,
    },
    {
      quoted,
    },
  );
}

/* =========================
   TOMBOL GRUP: All Menu + Owner
========================= */

async function sendGroupButtons(sock, jid, quoted, pushName, imageBuffer) {
  const text = style(`
${sakuraHeader(BOT_NAME)}
┃
┃ Halo ${DECO.star} *${pushName || 'Kak'}*
┃ Silakan pilih salah satu tombol
┃ di bawah untuk melanjutkan.
┃
${sakuraFooter()}
`);

  try {
    const media = await prepareWAMessageMedia(
      { image: imageBuffer },
      { upload: sock.waUploadToServer },
    );

    const msg = generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text }),

              footer: proto.Message.InteractiveMessage.Footer.create({
                text: `${BOT_NAME} ${DECO.star} v${global.version}`,
              }),

              header: proto.Message.InteractiveMessage.Header.create({
                title: `${DECO.diamond} ${BOT_NAME} ${DECO.diamond}`,
                hasMediaAttachment: true,
                imageMessage: media.imageMessage,
              }),

              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: `${DECO.diamond} All Menu`,
                      id: '.allmenu',
                    }),
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: `${DECO.diamond} Owner`,
                      id: '.owner',
                    }),
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Join Channel',
                      url: GROUP_LINK,
                    }),
                  },
                ],
              }),
            }),
          },
        },
      },
      { quoted },
    );

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });

    return msg;
  } catch (err) {
    console.error('Group Button Menu Error:', err);

    return await sock.sendMessage(jid, { image: imageBuffer, caption: text }, { quoted });
  }
}

/* =========================
   TOMBOL PRIVATE: List Pilihan Kategori
========================= */

async function sendPrivateMenuList(sock, jid, quoted, pushName, menuData, imageBuffer) {
  const text = style(`
${sakuraHeader(BOT_NAME)}
┃
┃ Halo ${DECO.star} *${pushName || 'Kak'}*
┃ Tekan tombol "Pilih Menu" lalu
┃ pilih kategori yang ingin dilihat.
┃
${sakuraFooter()}
`);

  const rows = Object.keys(menuData).map((key) => ({
    title: `${DECO.diamond} ${key.toUpperCase()}`,
    description: `Lihat semua perintah di kategori ${key}`,
    id: `.menu ${key}`,
  }));

  try {
    const media = imageBuffer
      ? await prepareWAMessageMedia({ image: imageBuffer }, { upload: sock.waUploadToServer })
      : null;

    const headerContent = media
      ? { title: `${DECO.diamond} ${BOT_NAME} ${DECO.diamond}`, hasMediaAttachment: true, imageMessage: media.imageMessage }
      : { title: `${DECO.diamond} ${BOT_NAME} ${DECO.diamond}`, hasMediaAttachment: false };

    const msg = generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text }),

              footer: proto.Message.InteractiveMessage.Footer.create({
                text: `${BOT_NAME} ${DECO.star} v${global.version}`,
              }),

              header: proto.Message.InteractiveMessage.Header.create(headerContent),

              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                      title: `${DECO.diamond} Pilih Menu`,
                      sections: [
                        {
                          title: `Kategori ${BOT_NAME}`,
                          rows,
                        },
                      ],
                    }),
                  },
                ],
              }),
            }),
          },
        },
      },
      { quoted },
    );

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });

    return msg;
  } catch (err) {
    console.error('Private Menu List Error:', err);

    // fallback ke menu teks biasa kalau list button gagal
    return await sock.sendMessage(jid, { text }, { quoted });
  }
}

/* =========================
   MAIN HANDLER
========================= */

async function handle(sock, messageInfo) {
  const { m, remoteJid, pushName, sender, senderLid, content, command, message, isGroup } =
    messageInfo;

  const roleUser = getUserRole(senderLid);

  const date = getCurrentDate();

  const category = (content || '').toLowerCase();

  const menuData = await loadMenuOnce();

  let result;

  /* =========================
     CATEGORY MENU
  ========================= */

  if (category && menuData[category]) {
    const response = formatMenu(category, menuData[category]);

    result = await reply(m, style(response));
  } else if (command === 'menu' && !category) {
    /* =========================
       MENU UTAMA
       - Grup    -> tombol All Menu + Owner
       - Private -> tombol pilihan kategori (single_select)
    ========================= */

    let buffer = null;

    try {
      buffer = await readFileAsBuffer(MENU_MEDIA_FILE);
    } catch (e) {
      buffer = null;
    }

    if (isGroup) {
      if (buffer) {
        result = await sendGroupButtons(sock, remoteJid, message, pushName, buffer);
      } else {
        const response = buildMainMenu(menuData);
        result = await reply(m, style(response));
      }
    } else {
      result = await sendPrivateMenuList(sock, remoteJid, message, pushName, menuData, buffer);
    }
  } else if (command === 'allmenu') {
    const response = buildAllMenu(pushName, roleUser, date, menuData);

    const buffer = await readFileAsBuffer(MENU_MEDIA_FILE);

    const caption = `
${style(response)}

${sakuraDivider()}
${DECO.star} SALURAN:
${GROUP_LINK}
`;

    const msg = {
      caption,
    };

    const lowerFile = MENU_MEDIA_FILE.toLowerCase();

    if (lowerFile.endsWith('.mp4')) {
      msg.video = buffer;
    } else if (lowerFile.endsWith('.gif')) {
      msg.video = buffer;
      msg.gifPlayback = true;
    } else {
      msg.image = buffer;
    }

    result = await sock.sendMessage(remoteJid, msg, {
      quoted: message,
    });
  }

  /* =========================
     SEND AUDIO
  ========================= */

  if (command === 'allmenu' || (command === 'menu' && !category)) {
    await sendMenuAudio(sock, remoteJid, result);
  }
}

/* =========================
   EXPORT
========================= */

export default {
  Commands: ['menu', 'allmenu'],

  OnlyPremium: false,

  OnlyOwner: false,

  handle,
};
