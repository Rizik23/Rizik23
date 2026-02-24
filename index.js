// ============================================
// AUTOORDER BOT + USERBOT
// Telegram Bot + Telegram UserBot
// ============================================

require("./lib/myfunc.js");
const { Telegraf } = require("telegraf");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs");
const config = require("./config");

(async () => {
  console.log("=".repeat(50));
  console.log("AUTOORDER BOT + USERBOT STARTING");
  console.log("MODE : FULL (BOT + USERBOT)");
  console.log("=".repeat(50));

  let client = null;
  let bot = null;
  let botConnected = false;
  let userbotConnected = false;

  /* ================= USERBOT ================= */
  if (config.apiId && config.apiHash) {
    try {
      console.log("• Menghubungkan UserBot...");

      const savedSession = fs.existsSync(config.sessionFile)
        ? fs.readFileSync(config.sessionFile, "utf8")
        : "";

      const stringSession = new StringSession(savedSession);
      client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
        connectionRetries: 5,
        baseLogger: null // silent mode
      });

await client.start({
  phoneNumber: async () => {
    console.log("• Menggunakan nomor:", config.phoneNumber);
    return config.phoneNumber;
  },

  password: async () => {
    console.log("\n• Akun membutuhkan Password 2FA");
    console.log("• Silakan input password (kosongkan jika tidak ada)");
    return await input.text("> ");
  },

  phoneCode: async () => {
    console.log("\n• Kode verifikasi telah dikirim oleh Telegram");
    console.log("• Silakan cek Telegram (SMS / App)");
    return await input.text("Kode: ");
  },

  onError: (err) => console.log("• Error login:", err.message)
});

      fs.writeFileSync(config.sessionFile, client.session.save());
      console.log("• UserBot Connected");
      userbotConnected = true;

      // Optional: get dialogs to ensure connection is alive
      await client.getDialogs({}).catch(() => {});

    } catch (err) {
      console.log("• UserBot gagal:", err.message);
      console.log("• Lanjut tanpa UserBot");
      client = null;
    }
  } else {
    console.log("• Tidak ada API ID / Hash, skip UserBot");
  }

  /* ================= BOT ================= */
  if (!config.botToken) {
    console.log("• Bot token tidak ditemukan");
    process.exit(1);
  }

  try {
    console.log("• Menghubungkan Bot Telegram");

    bot = new Telegraf(config.botToken);
    bot.launch();

    const userCommands = [
      { command: "ping", description: "Mᴇʟɪʜᴀᴛ ~Sᴛᴀᴛᴜs Bᴏᴛ Fᴜʟʟ ™Tᴀᴍᴘɪʟᴀɴ 🧸" },
      { command: "start", description: "Tᴀᴍᴘɪʟ'Kᴀɴ Mᴇɴᴜ Uᴛᴀᴍᴀ Kᴀᴇʟʟ 🍁" },
      { command: "menu", description: "Kᴀᴇʟʟ Gᴀɴᴛᴇɴɢ Tʜᴇ Rᴏᴡʀʀ 🦄" },
      { command: "help", description: "Cᴀʀᴀ Mᴇɴɢ-Gᴜɴᴀᴋᴀɴ Bᴏᴛ 🆘" }
    ];
    
    const ownerCommands = [
      { command: "backup", description: "Bᴀᴄᴋᴜᴘ Dᴀᴛᴀʙᴀsᴇ Bᴏᴛ Sᴇᴄᴀʀᴀ Aᴍᴀɴ 🗂️" },
      { command: "broadcast", description: "Kɪʀɪᴍ PᴇsᴀΠ Kᴇ Sᴇʟᴜʀᴜʜ Uꜱᴇʀ 📣" },
      { command: "addscript", description: "Tᴀᴍʙᴀʜ Sᴛᴏᴋ Sᴄʀɪᴘᴛ Bᴀʀᴜ 📜" },
      { command: "getscript", description: "Lɪʜᴀᴛ -Dᴀғᴛᴀʀ Sᴄʀɪᴘᴛ 📂" },
      { command: "delscript", description: "^Hᴀᴘᴜs Sᴛᴏᴋ Sᴄʀɪᴘᴛ 🗑️" },
      { command: "addstock", description: "Tᴀᴍʙᴀʜ Sᴛᴏᴋ Aᴘᴘꜱ 📦" },
      { command: "delstock", description: "Hᴀᴘᴜs Sᴛᴏᴋ Aᴘᴘꜱ ❌" },
      { command: "getstock", description: "Cᴇᴋ Sᴛᴏᴋ Aᴘᴘꜱ 🔎" },
      { command: "addstockdo", description: "Tᴀᴍʙᴀʜ ~Sᴛᴏᴋ Dɪɢɪᴛᴀʟ Oᴄᴇᴀɴ 🌊" },
      { command: "delstockdo", description: "Hᴀᴘᴜ`s Sᴛᴏᴋ Dɪɢɪᴛᴀʟ Oᴄᴇᴀɴ 🚫" },
      { command: "getstockdo", description: "Cᴇᴋ Sᴛᴏᴋ Dɪɢɪᴛᴀʟ Oᴄᴇᴀɴ 🔍" },
      { command: "addprompt", description: "Tᴀᴍ'ʙᴀʜ Sᴛᴏᴋ Pʀᴏᴍᴘᴛ ✍️" },
      { command: "delprompt", description: "Hᴀᴘᴜs Sᴛ★ᴋ Pʀᴏᴍᴘᴛ 🗑️" },
      { command: "getprompt", description: "L↓ʜᴀᴛ Sᴛᴏᴋ Pʀᴏᴍᴘᴛ 📖" },
      { command: "addsaldo", description: "Tᴀᴍʙᴀʜ Sᴀʟᴅᴏ ≠Uꜱᴇʀ 💳" },
      { command: "delsaldo", description: "Kᴜʀᴀɴɢɪ Sᴀʟᴅᴏ Uꜱᴇʀ 💸" },
      { command: "userlist", description: "Dᴀғᴛᴀʀ »Sᴇʟᴜʀᴜʜ Uꜱᴇʀ 👥" },
      { command: "cekipbot", description: "Lɪʜᴀᴛ IP Bᴏᴛ 🌐" },
      { command: "lihatallsaldo", description: "Lɪʜᴀᴛ Sᴇᴍᴜᴀ Sᴀʟᴅᴏ Uꜱᴇʀ 📊" },
      { command: "deleteallsaldo", description: "Hᴀᴘᴜs Sᴇᴍ·ᴜᴀ Sᴀʟᴅᴏ Uꜱᴇʀ ⚠️" },
      { command: "adddistributor", description: "Mᴇɴᴀᴍʙᴀʜ R★ʟʟᴇ Dɪs†ʀᴏ 🪙" },
      { command: "addregular", description: "Mᴇɴᴀᴍʙᴀʜ ≈ʀᴏʟʟᴇ Rᴇɢᴜʟᴀʀ 💰" },
      { command: "addvip", description: "Mᴇɴᴀᴍʙᴀʜ Vɪᴘ 💎" },
      { command: "delrole", description: "Mᴇɴɢʜᴀᴘᴜs Rᴏʟʟᴇ ≈Usᴇʀ ♣" },
      { command: "addvoucher", description: "Mᴇᴍʙᴜᴀᴛ Rᴇғᴇʀʀᴀʟ Sᴀʟᴅᴏ Dᴀɴ Kᴜᴏᴛᴀ 🪔" }
    ];

    await bot.telegram.setMyCommands(userCommands);
    console.log("• User commands diatur");

    if (config.ownerId) {
      await bot.telegram.setMyCommands(
        [...userCommands, ...ownerCommands],
        { scope: { type: "chat", chat_id: config.ownerId } }
      );
      console.log("• Owner commands diatur");
    }

    // Load bot handlers
    require("./bot")(bot);

    // Load userbot handlers if available
    if (userbotConnected && client) {
      try {
        require("./userbot")(client, bot);
        console.log("• UserBot handlers loaded");
      } catch (e) {
        console.log("• UserBot handlers tidak ditemukan atau error:", e.message);
      }
    }

    botConnected = true;
    console.log("• Bot Connected");

  } catch (err) {
    console.log("• Bot gagal:", err.message);
    process.exit(1);
  }

  /* ================= STATUS ================= */
  console.log("=".repeat(50));
  console.log("STATUS KONEKSI");
  console.log(`• UserBot : ${userbotConnected ? "AKTIF" : "TIDAK AKTIF"}`);
  console.log(`• Bot     : ${botConnected ? "AKTIF" : "TIDAK AKTIF"}`);
  console.log("=".repeat(50));
  console.log("• Sistem siap digunakan");
  console.log("• Gunakan /menu di bot");
  console.log("=".repeat(50));

  /* ================= SHUTDOWN ================= */
  const shutdown = async (signal) => {
    console.log(`• Menerima sinyal ${signal}, menghentikan...`);
    if (bot) await bot.stop().catch(() => {});
    if (client) await client.disconnect().catch(() => {});
    console.log("• Shutdown selesai");
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
})();
