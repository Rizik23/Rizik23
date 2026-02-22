require("./lib/myfunc.js");
const config = require("./config");
const { createAdmin, createPanel, createPayment, cekPaid, createVPSDroplet, getDropletInfo, vpsImages, vpsRegions, vpsSpecs, generateStrongPassword, getOSAdditionalCost, validateOSForRegion } = require("./lib/myfunc2.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const prefix = config.prefix || ".";
const scriptDir = path.join(__dirname, "scripts");
const scriptDB = path.join(__dirname, "/db/scripts.json");
const userDB = path.join(__dirname, "/db/users.json");
const stockDB = path.join(__dirname, "/db/stocks.json");
const hargaPanel = require("./price/panel.js");
const hargaAdminPanel = require("./price/adminpanel.js");
const vpsPackages = require("./price/vps.js");
const doDB = path.join(__dirname, "/db/digitalocean.json");
const orders = {};

// Inisialisasi database
if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir);
if (!fs.existsSync(scriptDB)) fs.writeFileSync(scriptDB, "[]");
if (!fs.existsSync(userDB)) fs.writeFileSync(userDB, "[]");
if (!fs.existsSync(stockDB)) fs.writeFileSync(stockDB, "{}");
if (!fs.existsSync(doDB)) fs.writeFileSync(doDB, "{}");

// Load database
const loadScripts = () => JSON.parse(fs.readFileSync(scriptDB));
const saveScripts = (d) => fs.writeFileSync(scriptDB, JSON.stringify(d, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(userDB));
const saveUsers = (d) => fs.writeFileSync(userDB, JSON.stringify(d, null, 2));
const loadStocks = () => JSON.parse(fs.readFileSync(stockDB));
const saveStocks = (d) => fs.writeFileSync(stockDB, JSON.stringify(d, null, 2));
const loadDO = () => JSON.parse(fs.readFileSync(doDB));
const saveDO = (d) => fs.writeFileSync(doDB, JSON.stringify(d, null, 2));

// ===================== FUNGSI UTILITAS =====================

const USERS_PER_PAGE = 10;

// Fungsi untuk escape karakter html khusus
function escapeMarkdown(text) {
    if (!text) return '';
    return String(text)
        .replace(/_/g, '\\_')
        .replace(/\*/g, '\\*')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\./g, '\\.')
        .replace(/!/g, '\\!');
}

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}


// Fungsi untuk generate random fee
function generateRandomFee() {
    return Math.floor(Math.random() * 200) + 100; // 100-300
}

function isPanelReady() {
  return config.domain && config.apikey && config.capikey;
}

// Fungsi random number
function randomNumber(length) {
    let result = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const getBotStats = (db) => {
  const totalUser = db.length

  let totalTransaksi = 0
  let totalPemasukan = 0

  for (const user of db) {
    totalPemasukan += user.total_spent || 0
    totalTransaksi += user.history?.length || 0
  }

  return {
    totalUser,
    totalTransaksi,
    totalPemasukan
  }
}

async function broadcastNewProduct(ctx, type, name, description, price, cmds) {
  const users = loadUsers();

  const now = new Date();
  const waktu = now.toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).replace(".", ":");

  const text = `
🎉 <b>Produk Baru Telah Ditambahkan!</b>

📦 <b>Type:</b> ${escapeHTML(type)}
📛 <b>Nama:</b> ${escapeHTML(name)}${description ? " (" + escapeHTML(description) + ")" : ""}
💰 <b>Harga:</b> Rp${Number(price).toLocaleString("id-ID")}

👤 <b>Ditambahkan Oleh:</b> @${escapeHTML(config.ownerUsername)}
🕒 <b>Waktu:</b> ${waktu}

Ketik <code>${escapeHTML(cmds)}</code> untuk membeli produknya!
`.trim();

  for (const u of users) {
    try {
      await ctx.telegram.sendMessage(u.id, text, {
        parse_mode: "HTML"
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      // Skip error
    }
  }
}

const os = require("os");
const start = process.hrtime.bigint();
const end = process.hrtime.bigint();
const speed = Number(end - start) / 1e6; // ms
const used = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);
const total = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

const menuTextUbot = () => `
 <blockquote><b># Bot - Information</b></blockquote>
 ▢ Speed: ${speed}ms
 ▢ Runtime: ${runtime(process.uptime())}
 ▢ Ram: ${used}GB/${total}GB
 
 <blockquote><b># Main - Menu</b></blockquote>
 ${config.prefix}me
 ${config.prefix}tourl
 ${config.prefix}tourl2
 ${config.prefix}npmdl
 ${config.prefix}ping

 <blockquote><b># Shop - Menu</b></blockquote>
 ${config.prefix}buypanel
 ${config.prefix}buyadmin
 ${config.prefix}buyscript
 ${config.prefix}buyapp
 ${config.prefix}buydo
 ${config.prefix}buyvps

 <blockquote><b># Store - Menu</b></blockquote>
 ${config.prefix}cfd
 ${config.prefix}bl
 ${config.prefix}delbl
 ${config.prefix}proses
 ${config.prefix}pay

 <blockquote><b># Panel - Menu</b></blockquote>
 ${config.prefix}1gb - ${config.prefix}unli
 ${config.prefix}listpanel
 ${config.prefix}delpanel
 ${config.prefix}cadmin
 ${config.prefix}listadmin
 ${config.prefix}deladmin
 ${config.prefix}subdo
 ${config.prefix}installpanel

 <blockquote><b># Owner - Menu</b></blockquote>
 ${config.prefix}backup
 ${config.prefix}restart
`;

const menuTextBot = (ctx) => {
  let db = loadUsers();
  const firstName = ctx.from?.first_name || "-";
  const lastName = ctx.from?.last_name || "";
  const userId = ctx.from?.id;
  const { totalUser, totalTransaksi, totalPemasukan } = getBotStats(db);

  // Cari user di database untuk mengecek saldo
  const user = db.find(u => u.id === userId);
  
  // Ambil saldo, jika user baru/belum ada balance, jadikan 0
  const saldo = user ? (user.balance || 0) : 0;
  
  // Definisi variabel profile yang sebelumnya kurang
  const fullName = firstName + (lastName ? ' ' + lastName : '');
  const userUsername = ctx.from?.username ? '@' + ctx.from.username : 'Tidak ada';

  return `
<blockquote><b>🚀 AUTO ORDER KAELL</b></blockquote>
Halo <b>${escapeHTML(firstName)} ${escapeHTML(lastName)}</b> 👋  
Selamat datang di layanan transaksi otomatis 24/7 Jam Nonstop.
<blockquote><b>🤖 Version Bot: 1.0</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>🪪 PROFILE KAMU</b></blockquote>
<b>🆔 User ID:</b> <code>${userId}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>💳 Saldo:</b> Rp${saldo.toLocaleString("id-ID")}
━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>📊 STATISTIK BOT</b></blockquote>
<b>🖥 Waktu Run:</b> ${runtime(process.uptime())}
<b>👥 Total User Bot:</b> ${totalUser}
<b>🛒 Total Transaksi:</b> ${totalTransaksi}
<b>💰 Total Pemasukan:</b> Rp${escapeHTML(totalPemasukan.toLocaleString("id-ID"))}
━━━━━━━━━━━━━━━━━━━━━━
<i>Gunakan menu di bawah untuk mulai bertransaksi 💎</i>
`;
};


const textOrder = (name, price, fee) => {
  const total = price + fee;

  return `
<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>
<blockquote>🧾 <b>Informasi Pesanan</b>
• Produk          : ${escapeHTML(name)}
• Harga           : Rp${toRupiah(price)}
• Biaya Layanan   : Rp${toRupiah(fee)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
<blockquote>💳 <b>Total Pembayaran</b> : Rp${toRupiah(total)}</blockquote>
<blockquote>⏳ <b>Batas Waktu Pembayaran</b>
QRIS aktif selama <b>6 menit</b>.
Setelah melewati batas waktu, kode QR otomatis tidak berlaku.</blockquote>
<blockquote>📲 <b>Cara Pembayaran</b>
1. Scan kode QRIS di atas
2. Pastikan nominal sesuai
3. Selesaikan pembayaran sebelum waktu habis</blockquote>
<blockquote>🔄 Status pembayaran akan diverifikasi otomatis oleh sistem.
Tidak perlu mengirim bukti transfer.</blockquote>
<blockquote>Terima kasih telah bertransaksi 🙏
━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
`;
};

// Fungsi untuk membuat text konfirmasi (HTML safe)
function createConfirmationText(productType, productName, price, fee, details = {}) {
  let detailText = "";
  const now = new Date();
  const waktu = now.toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).replace(".", ":");

  if (productType === "panel") {
    detailText = `👤 Username: ${escapeHTML(details.username)}
💾 Ram: ${/unli/i.test(details.ram || "") ? "Unlimited" : escapeHTML(details.ram || "-")}`;
  } else if (productType === "admin") {
    detailText = `👤 Username: ${escapeHTML(details.username)}`;
  } else if (productType === "script") {
    detailText = `📦 Nama Script: ${escapeHTML(productName)}
📝 Deskripsi: ${escapeHTML(details.description || "-")}`;
  } else if (productType === "app") {
    detailText = `📱 Kategori: ${escapeHTML(details.category)}
📝 Deskripsi: ${escapeHTML(details.description || "-")}`;
  } else if (productType === "do") {
    detailText = `🌊 Kategori: ${escapeHTML(details.category)}
📝 Deskripsi: ${escapeHTML(details.description || "-")}`;
  } else if (productType === "vps") {
    detailText = `💻 Spesifikasi: ${escapeHTML(details.specName || "-")}
🖥️ OS: ${escapeHTML(details.osName || "-")}
🌍 Region: ${escapeHTML(details.regionName || "-")}`;
  }

  return `📝 <b>Konfirmasi Pemesanan</b>

📦 Produk: ${escapeHTML(productName)}
💰 Harga: Rp${toRupiah(price)}
🕒 Waktu: ${waktu}

${detailText}

⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?
`;
}

async function sendUserPage(ctx, page = 0) {
    const users = loadUsers();
    if (!users || users.length === 0) {
        return ctx.reply("📭 Belum ada user terdaftar.");
    }

    const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;

    let userText = `<b>📊 TOTAL USERS: ${users.length}</b>\n`;
    userText += `<b>📄 PAGE ${page + 1} / ${totalPages}</b>\n\n`;

    users.slice(start, end).forEach((u, i) => {
        const fullName =
            (u.first_name || "") +
            (u.last_name ? " " + u.last_name : "");

        const username = u.username ? "@" + u.username : "-";

        userText += `<b>${start + i + 1}. ${escapeHTML(fullName || "No Name")}</b>\n`;
        userText += `🆔 <code>${u.id}</code>\n`;
        userText += `👤 ${escapeHTML(username)}\n`;
        userText += `💰 Rp${toRupiah(u.total_spent || 0)}\n`;
        userText += `📅 ${u.join_date ? new Date(u.join_date).toLocaleDateString("id-ID") : "-"}\n\n`;
    });

    const buttons = [];

    if (page > 0) {
        buttons.push({
            text: "⬅️ Prev",
            callback_data: `userpage_${page - 1}`
        });
    }

    if (page < totalPages - 1) {
        buttons.push({
            text: "➡️ Next",
            callback_data: `userpage_${page + 1}`
        });
    }

    const keyboard = {
        inline_keyboard: buttons.length > 0 ? [buttons] : []
    };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(userText, {
            parse_mode: "HTML",
            reply_markup: keyboard
        });
    } else {
        await ctx.reply(userText, {
            parse_mode: "HTML",
            reply_markup: keyboard
        });
    }
}

const isOwner = (ctx) => {
    const fromId = ctx.from?.id || ctx.callbackQuery?.from?.id || ctx.inlineQuery?.from?.id;
    return fromId.toString() == config.ownerId;
}

// Cari kode ini:
function addUser(userData) {
    const users = loadUsers();
    const existingUser = users.find(u => u.id === userData.id);
    if (!existingUser) {
        const userToAdd = {
            ...userData,
            username: userData.username ? escapeHTML(userData.username) : "",
            first_name: userData.first_name ? escapeHTML(userData.first_name) : "",
            last_name: userData.last_name ? escapeHTML(userData.last_name) : "",
            balance: 0 // <--- TAMBAHKAN BARIS INI
        };
        users.push(userToAdd);
        saveUsers(users);
    }
}


// Fungsi untuk update user history
function updateUserHistory(userId, orderData, details = {}) {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        if (!users[userIndex].history) users[userIndex].history = [];
        
        const transaction = {
            product: orderData.name,
            amount: orderData.amount,
            type: orderData.type,
            timestamp: new Date().toISOString()
        };
        
        switch (orderData.type) {
            case "panel":
                transaction.details = `Username: ${orderData.username}, RAM: ${orderData.ram === "unli" ? "Unlimited" : orderData.ram + "GB"}`;
                break;
            case "admin":
                transaction.details = `Username: ${orderData.username}`;
                break;
            case "script":
                transaction.details = `Script: ${orderData.name}`;
                break;
            case "app":
                transaction.details = `${orderData.category} - ${orderData.description}`;
                break;
            case "do":
                transaction.details = `${orderData.category} - ${orderData.description}`;
                break;
            case "vps":
                transaction.details = `${orderData.spec.ramCpu.name} - ${orderData.spec.os.name} - ${orderData.spec.region.name}`;
                break;
            default:
                transaction.details = details.description || "-";
        }
        
        users[userIndex].history.push(transaction);
        saveUsers(users);
    }
}

// Fungsi untuk mengirim notifikasi ke owner saat order berhasil (HTML safe)
async function notifyOwner(ctx, orderData, buyerInfo) {
  try {
    const now = new Date();
    const waktu = now.toLocaleString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).replace(".", ":");

    let productDetails = "";
    switch (orderData.type) {
      case "panel":
        productDetails = `👤 Username: ${escapeHTML(orderData.username)}
💾 RAM: ${orderData.ram === "unli" ? "Unlimited" : escapeHTML(orderData.ram + "GB")}`;
        break;
      case "admin":
        productDetails = `👤 Username: ${escapeHTML(orderData.username)}`;
        break;
      case "script":
        productDetails = `📦 Script: ${escapeHTML(orderData.name)}`;
        break;
      case "app":
        productDetails = `📱 Kategori: ${escapeHTML(orderData.category)}
📝 Deskripsi: ${escapeHTML(orderData.description || "-")}`;
        break;
      case "do":
        productDetails = `🌊 Kategori: ${escapeHTML(orderData.category)}
📝 Deskripsi: ${escapeHTML(orderData.description || "-")}`;
        break;
      case "vps":
        productDetails = `💻 Spesifikasi: ${escapeHTML(orderData.spec.ramCpu.name)}
🖥️ OS: ${escapeHTML(orderData.spec.os.name)}
🌍 Region: ${escapeHTML(orderData.spec.region.name)}`;
        break;
    }

    const buyerUsername = buyerInfo.username ? escapeHTML(buyerInfo.username) : "Tidak ada";
    const buyerName = escapeHTML(buyerInfo.name);

    const notificationText = `
<blockquote>💰 <b>ORDER BERHASIL DIPROSES!</b></blockquote>
<blockquote>━━━━━━━━━━━━━━━━━━━━━━
🕒 Waktu: ${waktu}
📦 Produk: ${escapeHTML(orderData.name)}
💰 Total: Rp${toRupiah(orderData.amount)}
👤 Buyer: ${buyerName}
🆔 User ID: <code>${buyerInfo.id}</code>
📱 Username: ${buyerInfo.username ? "@" + buyerUsername : "Tidak ada"}
━━━━━━━━━━━━━━━━━━━━━━</blockquote>
<blockquote>📋 Detail Produk:
${productDetails}
━━━━━━━━━━━━━━━</blockquote>
<blockquote>📊 Total Pembelian User: Rp${toRupiah(buyerInfo.totalSpent)}</blockquote>`.trim();

    const contactButton = {
      text: "📞 BELANJA PRODUK",
      url: config.botUsername
    };

    await ctx.telegram.sendMessage(config.ownerId, notificationText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [contactButton]
        ]
      }
    });

  } catch (error) {
    console.error("Error notifying owner:", error);
  }
}

module.exports = (bot) => {
  // Global error handler biar bot tidak crash kalau ada error Telegram API
  bot.catch((err, ctx) => {
    console.error('Telegraf error:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UnhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('UncaughtException:', err);
  });


// ####### HANDLE USERBOT MENU ##### //
  // NOTE:
  // - InlineQuery *harus* selalu dijawab (minimal empty array), kalau tidak userbot akan kena BOT_RESPONSE_TIMEOUT.
  // - Hindari proses berat (fetch panel API) di inline query biar respons selalu cepat.

  bot.on("inline_query", async (ctx) => {
    const body = (ctx.inlineQuery?.query || "").trim();

    // Kalau inline query kosong / bukan command, jawab empty biar gak timeout
    if (!body || !body.startsWith(prefix)) {
      return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });
    }

    const parts = body.slice(prefix.length).trim().split(/ +/);
    const command = (parts.shift() || "").toLowerCase();
    const text = parts.join(" ");

    try {
      switch (command) {
        case "menu": {
          return ctx.answerInlineQuery([{
            type: "photo",
            id: "menu-1",
            photo_url: config.menuImage,
            thumb_url: config.menuImage,
            caption: menuTextUbot(),
            parse_mode: "html",
            reply_markup: {
              inline_keyboard: [[
                { text: "📢 Join Channel", url: config.channelLink },
                { text: "🧩 Contact Owner", url: `tg://user?id=${config.ownerId}` }
              ]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        case "payment": {
          const caption = `💳 <b>PAYMENT</b>

▢ Dana: <code>${escapeHTML(config.payment?.dana || "-")}</code>
▢ Ovo: <code>${escapeHTML(config.payment?.ovo || "-")}</code>
▢ Gopay: <code>${escapeHTML(config.payment?.gopay || "-")}</code>

<i>Scan QRIS untuk pembayaran.</i>`;

          return ctx.answerInlineQuery([{
            type: "photo",
            id: "payment-1",
            photo_url: config.payment?.qris,
            thumb_url: config.payment?.qris,
            caption,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[
                { text: "💬 Order Via Bot", url: `https://t.me/${config.botUsername}` }
              ]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        case "proses": {
          return ctx.answerInlineQuery([{
            type: "article",
            id: "proses-1",
            title: "📦 Proses",
            description: escapeHTML(text || "Pesanan diproses"),
            input_message_content: {
              message_text: `✅ Pesanan sedang diproses\n\n📦 ${escapeHTML(text || "-")}\n⏰ ${global.tanggal(Date.now())}\n\n<i>Thank you for purchasing 🕊️</i>`,
              parse_mode: "HTML"
            },
            reply_markup: {
              inline_keyboard: [[{ text: "💬 Join Channel", url: config.channelLink }]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        case "buy": {
          return ctx.answerInlineQuery([{
            type: "article",
            id: "buy-1",
            title: "📦 Buy",
            description: "Order via bot otomatis",
            input_message_content: {
              message_text: "Silahkan order produk via bot otomatis 🚀",
              parse_mode: "HTML",
              disable_web_page_preview: true
            },
            reply_markup: {
              inline_keyboard: [[{ text: "💬 Order Via Bot", url: `https://t.me/${config.botUsername}` }]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        // Result message dari proses create panel/admin (diposting oleh userbot)
        case "cpanel-result": {
          if (!isOwner(ctx)) return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });

          const parts = (text || "").split("|");
          if (parts.length < 7) return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });

          const [username, password, serverId, ram, disk, cpu, domain] = parts;

          const ramText = ram === "0" ? "Unlimited" : `${Number(ram) / 1000}GB`;
          const diskText = disk === "0" ? "Unlimited" : `${Number(disk) / 1000}GB`;
          const cpuText = cpu === "0" ? "Unlimited" : `${cpu}%`;

          const teks = `✅ <b>Panel Berhasil Dibuat!</b>

👤 Username: <code>${escapeHTML(username)}</code>
🔐 Password: <code>${escapeHTML(password)}</code>
📦 Server ID: <code>${escapeHTML(serverId)}</code>
🌐 Panel: <span class="tg-spoiler">https://${escapeHTML(domain)}</span>

⚙️ <b>Spesifikasi</b>
- RAM: ${ramText}
- Disk: ${diskText}
- CPU: ${cpuText}`;

          return ctx.answerInlineQuery([{
            type: "article",
            id: "cpanel-result-1",
            title: "📦 cPanel Result",
            description: `Panel ${escapeHTML(username)} dibuat!`,
            input_message_content: {
              message_text: teks,
              parse_mode: "HTML",
              disable_web_page_preview: true
            },
            reply_markup: {
              inline_keyboard: [[{ text: "🌐 Login Web Panel", url: `https://${domain}/auth/login` }]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        case "cadmin-result": {
          if (!isOwner(ctx)) return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });

          const parts = (text || "").split("|");
          if (parts.length < 3) return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });

          const [username, password, domain] = parts;

          const teks = `✅ <b>Akun Admin Panel Berhasil Dibuat!</b>

👤 Username: <code>${escapeHTML(username)}</code>
🔐 Password: <code>${escapeHTML(password)}</code>
🌐 Panel: <span class="tg-spoiler">https://${escapeHTML(domain)}</span>`;

          return ctx.answerInlineQuery([{
            type: "article",
            id: "cadmin-result-1",
            title: "📦 Admin Panel Result",
            description: `Admin ${escapeHTML(username)} berhasil dibuat!`,
            input_message_content: {
              message_text: teks,
              parse_mode: "HTML",
              disable_web_page_preview: true
            },
            reply_markup: {
              inline_keyboard: [[{ text: "🌐 Login Web Panel", url: `https://${domain}/auth/login` }]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        // Command owner-only yang dulu fetch API di inline query sering bikin timeout.
        // Sekarang kita arahkan ke chat bot utama biar aman.
        case "delpanel":
        case "deladmin": {
          if (!isOwner(ctx)) return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });
          return ctx.answerInlineQuery([{
            type: "article",
            id: `${command}-1`,
            title: command === "delpanel" ? "🗑️ Delete Panel" : "🗑️ Delete Admin",
            description: "Buka bot untuk melanjutkan",
            input_message_content: {
              message_text: `✅ Silahkan lanjutkan di bot utama: https://t.me/${config.botUsername}\n\nKetik: ${prefix}${command}`,
              parse_mode: "HTML",
              disable_web_page_preview: true
            },
            reply_markup: {
              inline_keyboard: [[{ text: "➡️ Buka Bot", url: `https://t.me/${config.botUsername}` }]]
            }
          }], { cache_time: 0, is_personal: true });
        }

        default:
          return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });
      }
    } catch (e) {
      console.log("❌ inline_query error:", e);
      return ctx.answerInlineQuery([], { cache_time: 0, is_personal: true });
    }
  });

// ####### HANDLE USERBOT MENU ##### //
bot.action(/delpanel\|(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
  const serverId = ctx.match[1];

  try {
    const [serverRes, userRes] = await Promise.all([
      fetch(`${config.domain}/api/application/servers/${serverId}`, {
        method: "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
      }),
      fetch(`${config.domain}/api/application/users`, {
        method: "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
      })
    ]);

    const server = (await serverRes.json()).attributes;
    const users = (await userRes.json()).data || [];

    if (!server)
      return ctx.editMessageText(`❌ Server ID ${escapeHTML(serverId)} tidak ditemukan`, { parse_mode: "HTML" });

    await fetch(`${config.domain}/api/application/servers/${serverId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
    });

    const serverNameLower = server.name.toLowerCase();
    const user = users.find(u => u.attributes.first_name?.toLowerCase() === serverNameLower);
    if (user) {
      await fetch(`${config.domain}/api/application/users/${user.attributes.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
      });
    }

    return ctx.editMessageText(
      `✅ Server <b>${escapeHTML(server.name)}</b> (ID: <code>${escapeHTML(serverId)}</code>) berhasil dihapus!`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Back To List Server", callback_data: "delpanel-back" }]]
        }
      }
    );
  } catch (err) {
    return ctx.editMessageText(
      `❌ Gagal hapus server!\n<code>${escapeHTML(err.message)}</code>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔄 Back To List Server", callback_data: "delpanel-back" }]]
        }
      }
    );
  }
});

bot.action("delpanel-back", async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

  const serverRes = await fetch(`${config.domain}/api/application/servers`, {
    method: "GET",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
  });

  const servers = (await serverRes.json()).data || [];
  if (!servers.length)
    return ctx.answerCbQuery('Tidak Ada Server Panel!');

  const buttons = servers.map(s => ([{
    text: `📡 ${escapeHTML(s.attributes.name)} (ID: ${escapeHTML(s.attributes.id)})`,
    callback_data: `delpanel|${s.attributes.id}`
  }]));

  return ctx.editMessageText(
    `⚠️ <b>Hapus User & Server Panel</b>\n\nPilih server yang ingin dihapus:`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    }
  );
});


bot.action(/subdo\|(.+?)\|(.+?)\|(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

  const [meki, domain, host, ip] = ctx.match[0].split("|");
  const api = config.subdomain[domain];
  if (!api) return ctx.answerCbQuery("❌ Domain tidak valid!");

  const cleanHost = host.replace(/[^a-z0-9.-]/gi, "").toLowerCase();
  const cleanIp = ip.replace(/[^0-9.]/g, "");
  const rand = Math.floor(100 + Math.random() * 900);

  const panel = `${cleanHost}.${domain}`;
  const node = `node${rand}.${cleanHost}.${domain}`;

  try {
    const createSub = async (name) => {
      const res = await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${api.zone}/dns_records`,
        { type: "A", name, content: cleanIp, ttl: 3600, proxied: false },
        { headers: { Authorization: `Bearer ${api.apitoken}`, "Content-Type": "application/json" } }
      );
      if (!res.data.success) throw new Error("Gagal membuat subdomain");
    };

    await createSub(panel);
    await createSub(node);

    return ctx.editMessageText(
      `✅ <b>Subdomain berhasil dibuat!</b>\n\n` +
      `🌐 Panel: <code>${escapeHTML(panel)}</code>\n` +
      `🌐 Node: <code>${escapeHTML(node)}</code>\n` +
      `📌 IP: <code>${escapeHTML(cleanIp)}</code>`,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    return ctx.editMessageText(
      `❌ <b>Gagal membuat subdomain!</b>\n${escapeHTML(e.message)}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "🔄 Buat Ulang Subdomain", callback_data: `retry|${host}|${ip}` }
          ]]
        }
      }
    );
  }
});


bot.action(/retry\|(.+?)\|(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
  const [, host, ip] = ctx.match;

  const buttons = Object.keys(config.subdomain).map(dom => ([{
    text: `🌐 ${escapeHTML(dom)}`, 
    callback_data: `subdo|${dom}|${host}|${ip}`
  }]));

  return ctx.editMessageText(
`🚀 <b>Subdomain Creator</b>

Hostname: <code>${escapeHTML(host)}</code>
IP: <code>${escapeHTML(ip)}</code>

Pilih domain:`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
  );
});


bot.action(/deladmin\|(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
  const userId = ctx.match[1];

  try {
    const res = await fetch(`${config.domain}/api/application/users`, {
      method: "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
    });
    const users = (await res.json()).data || [];

    const target = users.find(u => u.attributes.id == userId && u.attributes.root_admin);
    if (!target) throw new Error("Admin tidak ditemukan!");

    await fetch(`${config.domain}/api/application/users/${userId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
    });

    return ctx.editMessageText(
`✅ Admin <b>${escapeHTML(target.attributes.username)}</b> berhasil dihapus!`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Back To List Admin", callback_data: "deladmin-back" }]]
        }
      }
    );
  } catch (err) {
    return ctx.editMessageText(
`❌ Gagal hapus admin!\n<code>${escapeHTML(err.message)}</code>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔄 Back To List Admin", callback_data: "deladmin-back" }]]
        }
      }
    );
  }
});


bot.action("deladmin-back", async (ctx) => {
  await ctx.answerCbQuery();
  if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

  const res = await fetch(`${config.domain}/api/application/users`, {
    method: "GET",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.apikey}` }
  });
  const users = (await res.json()).data || [];

  const admins = users.filter(u => u.attributes.root_admin);
  if (!admins.length)
    return ctx.answerCbQuery('Tidak Ada Admin Panel!');

  const buttons = admins.map(a => ([{
    text: `🗑️ ${escapeHTML(a.attributes.username)} (ID: ${a.attributes.id})`,
    callback_data: `deladmin|${a.attributes.id}`
  }]));

  return ctx.editMessageText(
`⚠️ <b>Hapus Admin Panel</b>\n\nPilih admin yang ingin dihapus:`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
  );
});


    // #### HANDLE STORE BOT MENU ##### //
    bot.on("text", async (ctx) => {
        const msg = ctx.message;
        const prefix = config.prefix;

        const body = (msg.text || "").trim();
        const isCmd = body.startsWith(prefix);
        const args = body.split(/ +/).slice(1);
        const text = args.join(" ");
        const command = isCmd
            ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : body.toLowerCase();
        const fromId = ctx.from.id;
        const userName = ctx.from.username || `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;

        fromId ? addUser({
            id: fromId,
            username: userName,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name || "",
            join_date: new Date().toISOString(),
            total_spent: 0,
            history: []
        }) : ""

        switch (command) {
            // ===== MENU / START =====
            case "menu":
            case "start": {
	                return ctx.replyWithPhoto(config.menuImage, {
	                    caption: menuTextBot(ctx),
	                    // menuTextBot() menghasilkan HTML (<b>...</b>)
	                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🛍️ Katalog Produk", callback_data: "katalog"  }
                            ], 
                            [
                                { text: "👤 Cek Profil", callback_data: "profile" },
                                { text: "📮 Cek History", callback_data: "history" }
                            ], 
                            [
                                { text: "📢 Channel", url: config.channelLink  }, 
                                { text: "📞 Developer", url: "https://t.me/"+config.ownerUsername  }
                            ]
                        ]
                    }
                });
            }

            case "ownermenu":
            case "ownmenu": {
                return ctx.replyWithPhoto(config.menuImage, {
                    caption: menuTextOwn(),
                    parse_mode: "html",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "📢 Channel", url: config.channelLink }
                            ]
                        ]
                    }
                });
            }

// ===== FITUR SALDO & DEPOSIT =====
case "deposit":
case "topup": {
    const amountStr = args[0];
    if (!amountStr) return ctx.reply(`Ketik ${config.prefix}deposit nominal\nContoh: ${config.prefix}deposit 20000`);
    
    // Hilangkan karakter non-angka (seperti Rp atau titik)
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount < 1000) return ctx.reply("❌ Minimal deposit adalah Rp1.000");

    const fee = generateRandomFee();
    const price = amount + fee;
    const paymentType = config.paymentGateway;
    const pay = await createPayment(paymentType, price, config);

    orders[fromId] = {
        type: "deposit",
        name: `Deposit Saldo Rp${amount.toLocaleString('id-ID')}`,
        amount: price,
        depositAmount: amount, // Jumlah bersih yang masuk ke saldo
        fee,
        orderId: pay.orderId || null,
        paymentType: paymentType,
        chatId: ctx.chat.id,
        expireAt: Date.now() + 6 * 60 * 1000
    };

    const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
    const qrMsg = await ctx.replyWithPhoto(photo, {
        caption: textOrder(`Deposit Saldo`, amount, fee),
        parse_mode: "html",
        reply_markup: {
            inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]]
        }
    });

    orders[fromId].qrMessageId = qrMsg.message_id;
    startCheck(fromId, ctx);
    break;
}

case "ceksaldo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    if (!targetId) return ctx.reply("Masukkan ID User!");
    
    const users = loadUsers();
    const user = users.find(u => u.id == targetId);
    if (!user) return ctx.reply("❌ User tidak ditemukan di database.");
    
    return ctx.reply(`💰 Saldo User ID <code>${targetId}</code>:\nRp${(user.balance || 0).toLocaleString('id-ID')}`, { parse_mode: "HTML" });
}

case "addsaldo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    const amountStr = args[1];
    
    if (!targetId || !amountStr) return ctx.reply(`Format salah!\nContoh: ${config.prefix}addsaldo 1402991119 2000`);
    
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return ctx.reply("Nominal harus berupa angka!");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan.");

    users[userIndex].balance = (users[userIndex].balance || 0) + amount;
    saveUsers(users);

    ctx.telegram.sendMessage(targetId, `🎉 <b>SELAMAT!</b>\nSaldo Anda telah ditambahkan sebesar Rp${amount.toLocaleString('id-ID')} oleh Admin.`, { parse_mode: "HTML" });
    return ctx.reply(`✅ Berhasil menambahkan Rp${amount.toLocaleString('id-ID')} ke user ${targetId}. Saldo sekarang: Rp${users[userIndex].balance.toLocaleString('id-ID')}`);
}

case "delsaldo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    const amountStr = args[1];
    
    if (!targetId || !amountStr) return ctx.reply(`Format salah!\nContoh: ${config.prefix}delsaldo 1402991119 2000`);
    
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return ctx.reply("Nominal harus berupa angka!");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan.");

    users[userIndex].balance = Math.max(0, (users[userIndex].balance || 0) - amount);
    saveUsers(users);

    return ctx.reply(`✅ Berhasil mengurangi Rp${amount.toLocaleString('id-ID')} dari user ${targetId}. Saldo sekarang: Rp${users[userIndex].balance.toLocaleString('id-ID')}`);
}


// ===== PROFILE USER =====
case "profile": {
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);
    if (!user) return ctx.reply("❌ User tidak ditemukan.");

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';
    if (user.history && user.history.length > 0) {
        lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
            const product = escapeHTML(t.product);
            const amount = toRupiah(t.amount);
            const date = new Date(t.timestamp).toLocaleDateString('id-ID');
            return `${i + 1}. ${product} - Rp${amount} (${date})`;
        }).join('\n');
    }

    const profileText = `
<blockquote><b>🪪 Profile Kamu</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>👤 Nama Depan:</b> <code>${escapeHTML(firstName)}</code>
<b>👥 Nama Belakang:</b> <code>${escapeHTML(lastName)}</code>
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}
━━━━━━━━━━━━━━━━━━━━━━
<b>📋 Last 3 Transactions:</b>\n
${lastTransactions}</blockquote>
    `.trim();

    return ctx.reply(profileText, { parse_mode: "HTML", disable_web_page_preview: true });
}

// ===== HISTORY USER =====
case "history": {
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);
    if (!user || !user.history || user.history.length === 0) {
        return ctx.reply("📭 Belum ada riwayat transaksi.");
    }

    let historyText = `<b>📋 Riwayat Transaksi</b>\n\n`;
    user.history.slice().reverse().forEach((t, i) => {
        historyText += `<b>${i + 1}. ${escapeHTML(t.product)}</b>\n`;
        historyText += `💰 Harga: Rp${toRupiah(t.amount)}\n`;
        historyText += `📅 Tanggal: ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${new Date(t.timestamp).toLocaleTimeString('id-ID')}\n`;
        historyText += `📦 Tipe: ${escapeHTML(t.type)}\n`;
        if (t.details) historyText += `📝 Detail: ${escapeHTML(t.details)}\n`;
        historyText += `\n`;
    });

    return ctx.reply(historyText, { parse_mode: "HTML" });
}

// ===== USERLIST (OWNER ONLY) =====
case "userlist": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    return sendUserPage(ctx, 0);
}

// ===== ADD SCRIPT =====
case "addscript": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (!ctx.message.reply_to_message?.document)
        return ctx.reply(`Reply ZIP dengan:\n${escapeHTML(config.prefix)}addscript nama|deskripsi|harga`, { parse_mode: "HTML" });

    const doc = ctx.message.reply_to_message.document;
    if (!doc.file_name.endsWith(".zip")) return ctx.reply("Harus file .zip");

    if (!text.includes("|")) return ctx.reply(`Format: ${escapeHTML(config.prefix)}addscript nama|deskripsi|harga`, { parse_mode: "HTML" });
    const [name, desk, price] = text.split("|").map(v => v.trim());
    if (!name || isNaN(price) || !desk) return ctx.reply("Data tidak valid.");

    const scripts = loadScripts();
    if (scripts.find(s => s.name.toLowerCase() === name.toLowerCase()))
        return ctx.reply("Script sudah ada.");

    const link = await ctx.telegram.getFileLink(doc.file_id);
    const res = await axios.get(link.href, { responseType: "arraybuffer" });
    const savePath = path.join(scriptDir, doc.file_name);
    fs.writeFileSync(savePath, res.data);

    scripts.push({ name, desk, price: Number(price), file: `scripts/${doc.file_name}`, added_date: new Date().toISOString() });
    saveScripts(scripts);

    await ctx.reply(`✅ Script ${escapeHTML(name)} berhasil ditambahkan.`, { parse_mode: "HTML" });
    return broadcastNewProduct(ctx, "SCRIPT", name, null, price, "/buyscript");
}

            // ===== BROADCAST MESSAGE (OWNER ONLY) =====
            case "broadcast": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

                const users = loadUsers();
                if (users.length === 0) {
                    return ctx.reply("📭 Tidak ada user untuk di-broadcast.");
                }

                const replyMsg = ctx.message.reply_to_message;
                let broadcastMessage = "";
                let photoFileId = null;
                let hasPhoto = false;

                if (replyMsg) {
                    if (replyMsg.photo && replyMsg.photo.length > 0) {
                        hasPhoto = true;
                        const photo = replyMsg.photo[replyMsg.photo.length - 1];
                        photoFileId = photo.file_id;
                        broadcastMessage = replyMsg.caption || "";
                    } else if (replyMsg.text) {
                        broadcastMessage = replyMsg.text;
                    } else {
                        return ctx.reply("❌ Format tidak valid! Reply pesan dengan teks atau foto.");
                    }
                } else if (text) {
                    broadcastMessage = text;
                } else {
                    return ctx.reply(`Contoh penggunaan:\n${config.prefix}broadcast [pesan]\n\nAtau\n\nReply pesan/foto dengan ketik ${config.prefix}broadcast`);
                }

                if (!broadcastMessage.trim() && !hasPhoto) {
                    return ctx.reply("❌ Pesan broadcast tidak boleh kosong!");
                }

                const startMsg = await ctx.reply(`🚀 *MEMULAI BROADCAST*\n\n` +
                    `📊 Total User: ${users.length}\n` +
                    `⏳ Estimasi waktu: ${Math.ceil(users.length / 10)} detik\n` +
                    `🔄 Mengirim... 0/${users.length}`,
                    { parse_mode: "html" });

                startBroadcast(ctx, users, broadcastMessage, hasPhoto, photoFileId, startMsg.message_id);
                break;
            }

// ===== BACKUP SCRIPT =====
case "backupsc":
case "bck":
case "backup": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

    try {
        await ctx.reply("🔄 Backup Processing...");

        const archiver = require('archiver');

        const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tgl = new Date();
        const tanggal = tgl.getDate().toString().padStart(2, "0");
        const bulan = bulanIndo[tgl.getMonth()];
        const name = `Tele-Autoorder-${tanggal}-${bulan}-${tgl.getFullYear()}`;

        const exclude = ["node_modules", "package-lock.json", "yarn.lock", ".npm", ".cache", ".git"];
        const filesToZip = fs.readdirSync(".").filter((f) =>
            !exclude.includes(f) &&
            !f.startsWith('.') &&
            f !== ""
        );

        if (!filesToZip.length) {
            return ctx.reply("❌ Tidak ada file yang dapat di backup!");
        }

        const output = fs.createWriteStream(`./${name}.zip`);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log(`Backup created: ${archive.pointer()} total bytes`);

            try {
                await ctx.telegram.sendDocument(
                    config.ownerId,
                    { source: `./${name}.zip` },
                    {
                        caption: `✅ <b>Backup Script selesai!</b>\n📁 ${escapeHTML(name)}.zip`,
                        parse_mode: "HTML"
                    }
                );

                fs.unlinkSync(`./${name}.zip`);

                if (ctx.chat.id.toString() !== config.ownerId.toString()) {
                    await ctx.reply(
                        `✅ <b>Backup script selesai!</b>\n📁 File telah dikirim ke chat pribadi owner.`,
                        { parse_mode: "HTML" }
                    );
                }

            } catch (err) {
                console.error("Gagal kirim file backup:", err);
                await ctx.reply("❌ Error! Gagal mengirim file backup.");
            }
        });

        archive.on('error', async (err) => {
            console.error("Archive Error:", err);
            await ctx.reply("❌ Error! Gagal membuat file backup.");
        });

        archive.pipe(output);

        for (let file of filesToZip) {
            const stat = fs.statSync(file);
            if (stat.isDirectory()) {
                archive.directory(file, file);
            } else {
                archive.file(file, { name: file });
            }
        }

        await archive.finalize();

    } catch (err) {
        console.error("Backup Error:", err);
        await ctx.reply("❌ Error! Terjadi kesalahan saat proses backup.");
    }
    break;
}

// ===== GET SCRIPT =====
case "delscript":
case "getscript": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only.");
    const allScripts = loadScripts();
    if (!allScripts.length) return ctx.reply("📭 Belum ada script.");

    const buttons = allScripts.map((s, i) => ([
        { text: `📂 ${escapeHTML(s.name)} - Rp${s.price}`, callback_data: `getscript_detail|${i}` }
    ]));

    return ctx.reply(`<b>📦 DAFTAR SCRIPT</b>\n\nPilih Script untuk melihat detail:`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
    });
}

// ===== ADD STOCK (OWNER ONLY) =====
case "addstock": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (!text.includes("|")) return ctx.reply(`Format: ${config.prefix}addstock kategori|keterangan|data akun|harga\n\nContoh: ${config.prefix}addstock netflix|1 Bulan|email: xxx@gmail.com pass: xxx123|25000`);

    const parts = text.split("|").map(v => v.trim());
    if (parts.length < 4) {
        return ctx.reply("Format tidak valid! Gunakan: kategori|keterangan|data akun|harga");
    }

    const [category, description, accountData, priceStr] = parts;
    const price = parseInt(priceStr);

    if (!category || !description || !accountData || isNaN(price)) {
        return ctx.reply("Data tidak valid! Pastikan semua field terisi dan harga berupa angka.");
    }

    const stocks = loadStocks();

    if (!stocks[category]) {
        stocks[category] = [];
    }

    let itemAdded = false;
    let existingGroup = null;
    let groupIndex = -1;

    for (let i = 0; i < stocks[category].length; i++) {
        const item = stocks[category][i];
        if (item.description.toLowerCase() === description.toLowerCase() &&
            item.price === price) {
            existingGroup = item;
            groupIndex = i;
            break;
        }
    }

    if (existingGroup) {
        const accountExists = existingGroup.accounts.some(acc => acc === accountData);

        if (!accountExists) {
            existingGroup.accounts.push(accountData);
            existingGroup.stock += 1;
            itemAdded = true;
        } else {
            return ctx.reply(`⚠️ Akun ini sudah ada dalam database!\n\n📁 Kategori: <b>${escapeHTML(category)}</b>\n📝 Keterangan: <b>${escapeHTML(description)}</b>\n💰 Harga: Rp${toRupiah(price)}\n\nTidak perlu ditambahkan lagi.`,
                { parse_mode: "HTML" });
        }
    } else {
        stocks[category].push({
            description: description,
            price: price,
            stock: 1,
            accounts: [accountData],
            added_date: new Date().toISOString()
        });
        itemAdded = true;
        groupIndex = stocks[category].length - 1;
    }

    saveStocks(stocks);

    if (itemAdded) {
        const totalItemsInCategory = stocks[category].reduce((sum, item) => sum + item.accounts.length, 0);
        const totalItemsInGroup = existingGroup ? existingGroup.accounts.length : 1;

        let responseText = `✅ Stock berhasil ditambahkan!\n\n`;
        responseText += `📁 Kategori: <b>${escapeHTML(category)}</b>\n`;
        responseText += `📝 Keterangan: <b>${escapeHTML(description)}</b>\n`;
        responseText += `💰 Harga: Rp${toRupiah(price)}\n`;
        responseText += `🔑 Data Akun: <b>${escapeHTML(accountData.substring(0, 30))}...</b>\n\n`;

        if (existingGroup) {
            responseText += `📊 <b>Informasi Grouping:</b>\n`;
            responseText += `├ Total akun dalam group: ${totalItemsInGroup}\n`;
            responseText += `└ Index group: ${groupIndex + 1}\n\n`;
        } else {
            responseText += `📊 <b>Grouping baru dibuat</b>\n`;
            responseText += `└ Group ke: ${groupIndex + 1} dalam kategori\n\n`;
        }

        responseText += `📈 <b>Statistik Kategori ${escapeHTML(category.toUpperCase())}</b>\n`;
        responseText += `├ Total group: ${stocks[category].length}\n`;
        responseText += `└ Total item: ${totalItemsInCategory}`;

        await ctx.reply(responseText, { parse_mode: "HTML" });
        return broadcastNewProduct(ctx, "APPS PREMIUM", category, description, price, "/buyapps");
    }

    break;
}

// ===== ADD STOCK DIGITAL OCEAN (OWNER ONLY) =====
case "addstockdo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (!text.includes("|")) return ctx.reply(`Format: ${config.prefix}addstockdo kategori|keterangan|data akun|harga\n\nContoh: ${config.prefix}addstockdo 3 Droplet|1 Bulan|email: xxx@gmail.com pass: xxx123|120000`);

    const parts = text.split("|").map(v => v.trim());
    if (parts.length < 4) {
        return ctx.reply("Format tidak valid! Gunakan: kategori|keterangan|data akun|harga");
    }

    const [category, description, accountData, priceStr] = parts;
    const price = parseInt(priceStr);

    if (!category || !description || !accountData || isNaN(price)) {
        return ctx.reply("Data tidak valid! Pastikan semua field terisi dan harga berupa angka.");
    }

    const doData = loadDO();

    if (!doData[category]) {
        doData[category] = [];
    }

    let itemAdded = false;
    let existingGroup = null;
    let groupIndex = -1;

    for (let i = 0; i < doData[category].length; i++) {
        const item = doData[category][i];
        if (item.description.toLowerCase() === description.toLowerCase() &&
            item.price === price) {
            existingGroup = item;
            groupIndex = i;
            break;
        }
    }

    if (existingGroup) {
        const accountExists = existingGroup.accounts.some(acc => acc === accountData);

        if (!accountExists) {
            existingGroup.accounts.push(accountData);
            existingGroup.stock += 1;
            itemAdded = true;
        } else {
            return ctx.reply(`⚠️ Akun ini sudah ada dalam database!\n\n📁 Kategori: <b>${escapeHTML(category)}</b>\n📝 Keterangan: <b>${escapeHTML(description)}</b>\n💰 Harga: Rp${toRupiah(price)}\n\nTidak perlu ditambahkan lagi.`,
                { parse_mode: "HTML" });
        }
    } else {
        doData[category].push({
            description: description,
            price: price,
            stock: 1,
            accounts: [accountData],
            added_date: new Date().toISOString()
        });
        itemAdded = true;
        groupIndex = doData[category].length - 1;
    }

    saveDO(doData);

    if (itemAdded) {
        const totalItemsInCategory = doData[category].reduce((sum, item) => sum + item.accounts.length, 0);
        const totalItemsInGroup = existingGroup ? existingGroup.accounts.length : 1;

        let responseText = `✅ Stock Digital Ocean berhasil ditambahkan!\n\n`;
        responseText += `📁 Kategori: <b>${escapeHTML(category)}</b>\n`;
        responseText += `📝 Keterangan: <b>${escapeHTML(description)}</b>\n`;
        responseText += `💰 Harga: Rp${toRupiah(price)}\n`;
        responseText += `🔑 Data Akun: <b>${escapeHTML(accountData.substring(0, 30))}...</b>\n\n`;

        if (existingGroup) {
            responseText += `📊 <b>Informasi Grouping:</b>\n`;
            responseText += `├ Total akun dalam group: ${totalItemsInGroup}\n`;
            responseText += `└ Index group: ${groupIndex + 1}\n\n`;
        } else {
            responseText += `📊 <b>Grouping baru dibuat</b>\n`;
            responseText += `└ Group ke: ${groupIndex + 1} dalam kategori\n\n`;
        }

        responseText += `📈 <b>Statistik Kategori ${escapeHTML(category.toUpperCase())}</b>\n`;
        responseText += `├ Total group: ${doData[category].length}\n`;
        responseText += `└ Total item: ${totalItemsInCategory}`;

        await ctx.reply(responseText, { parse_mode: "HTML" });
        return broadcastNewProduct(ctx, "DIGITAL OCEAN", category, description, price, "/buydo");
    }

    break;
}

// ===== GET/DEL STOCK (OWNER ONLY) =====
case "getstock":
case "delstock":
case "getstockdo":
case "delstockdo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    const isDO = command.includes("do");
    const data = isDO ? loadDO() : loadStocks();
    const categories = Object.keys(data);

    if (categories.length === 0) {
        return ctx.reply(`📭 Tidak ada stok ${isDO ? 'Digital Ocean' : 'apps'} tersedia.`);
    }

    const categoryButtons = categories.map(cat => [
        {
            text: `📁 ${escapeHTML(cat.toUpperCase())} (${data[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
            callback_data: `${isDO ? 'do' : 'view'}_category|${cat}`
        }
    ]);

    return ctx.reply(
        `📊 <b>DAFTAR KATEGORI STOCK ${isDO ? 'DIGITAL OCEAN' : 'APPS'}</b>\n\nPilih kategori untuk ${command.includes('del') ? 'menghapus' : 'melihat'} stock:`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: categoryButtons }
        }
    );
}

            case "buypanel": {
    if (!text) return ctx.reply(`Ketik ${config.prefix}buypanel username untuk membeli panel.`);
    if (text.includes(" ")) return ctx.reply("Format username dilarang memakai spasi!");
    const user = text;
    const panelButtons = [];
    const dataPanel = Object.keys(hargaPanel)

    for (let i of dataPanel) {
        const key = `${i}`;
        panelButtons.push([
            { text: `⚡ ${i.toUpperCase()} - Rp${hargaPanel[i].toLocaleString("id-ID")}`, callback_data: `panel_ram|${key}|${user}` }
        ]);
    }

    return ctx.reply("Pilih Ram Panel Pterodactyl:", {
        reply_markup: { inline_keyboard: panelButtons }
    });
}

            // ===== BUY ADMIN =====
           case "buyadp":  
           case "buyadmin": {
                if (!text)
                    return ctx.reply(`Ketik ${config.prefix}buyadmin username untuk membeli admin panel.`);
                if (text.includes(" "))
                    return ctx.reply("Format username dilarang memakai spasi!");

                const fee = generateRandomFee();
                const price = hargaAdminPanel
                const name = "Admin Panel";
                const user = text;

                // Menampilkan konfirmasi dulu sebelum ke pembayaran
                return ctx.reply(createConfirmationText("admin", name, price, fee, { username: user }), {
                    parse_mode: "html",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Lanjut Pembayaran", callback_data: `confirm_admin|${user}` },
                                { text: "❌ Batalkan", callback_data: "cancel_order" }
                            ]
                        ]
                    }
                });
            }
            
            default: {
                break;
            }
        }
    });

bot.action("buyscript", async (ctx) => {
    const scriptsList = loadScripts();

    if (!scriptsList.length)
        return ctx.answerCbQuery("Stok script kosong", { show_alert: true });

    await ctx.answerCbQuery().catch(() => {});

    const scriptButtons = scriptsList.map(s => [
        {
            text: `🗂 ${escapeHTML(s.name)} - Rp${s.price}`,
            callback_data: `script|${s.name}` 
        }
    ]);

    scriptButtons.push([
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }
    ]);

    ctx.reply("<b>Pilih Nama Script:</b>", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: scriptButtons }
    }).catch(() => {});

    ctx.deleteMessage().catch(() => {});
});


bot.action("buyapp", async (ctx) => {
    const stocks = loadStocks();
    const categories = Object.keys(stocks);

    if (!categories.length)
        return ctx.answerCbQuery("Stok apps kosong", { show_alert: true });

    await ctx.answerCbQuery().catch(() => {});

    const categoryButtons = categories.map(cat => [
        {
            text: `📱 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            callback_data: `app_category|${cat}`
        }
    ]);

    categoryButtons.push([
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }
    ]);

    ctx.reply(
        "<b>Pilih Kategori Apps Premium:</b>",
        {
            parse_mode: "html",
            reply_markup: { inline_keyboard: categoryButtons }
        }
    ).catch(() => {});

    ctx.deleteMessage().catch(() => {});
});

// ===== PROFILE USER (ACTION) =====
bot.action("profile", async (ctx) => {
    const fromId = ctx.from.id;

    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    if (!user) {
        return ctx.answerCbQuery("❌ User tidak ditemukan", { show_alert: true });
    }

    await ctx.answerCbQuery().catch(() => {});

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';

    if (user.history && user.history.length > 0) {
        lastTransactions = user.history
            .slice(-3)
            .reverse()
            .map((t, i) => {
                const product = escapeHTML(t.product);
                const amount = toRupiah(t.amount);
                const date = new Date(t.timestamp).toLocaleDateString('id-ID');
                return `${i + 1}. ${product} - Rp${amount} (${date})`;
            })
            .join('\n');
    }

    const profileText = `
<blockquote><b>🪪 Profile Kamu</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>👤 Nama Depan:</b> <code>${escapeHTML(firstName)}</code>
<b>👥 Nama Belakang:</b> <code>${escapeHTML(lastName)}</code>
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}
━━━━━━━━━━━━━━━━━━━━━━
<b>📋 Last 3 Transactions:</b>\n
${lastTransactions}</blockquote>
    `.trim();

    ctx.reply(profileText, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }]
            ]
        }
    }).catch(() => {});

    ctx.deleteMessage().catch(() => {});
});

// ===== HISTORY USER (ACTION) =====
bot.action("history", async (ctx) => {
    const fromId = ctx.from.id;

    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    if (!user || !user.history || user.history.length === 0) {
        return ctx.answerCbQuery("📭 Belum ada riwayat transaksi", { show_alert: true });
    }

    await ctx.answerCbQuery().catch(() => {});

    let historyText = `<b>📋 Riwayat Transaksi</b>\n\n`;

    user.history.slice().reverse().forEach((t, i) => {
        historyText += `<b>${i + 1}. ${escapeHTML(t.product)}</b>\n`;
        historyText += `💰 Harga: Rp${toRupiah(t.amount)}\n`;
        historyText += `📅 Tanggal: ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${new Date(t.timestamp).toLocaleTimeString('id-ID')}\n`;
        historyText += `📦 Tipe: ${escapeHTML(t.type)}\n`;
        if (t.details) {
            historyText += `📝 Detail: ${escapeHTML(t.details)}\n`;
        }
        historyText += `\n`;
    });

    ctx.reply(historyText, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }]
            ]
        }
    }).catch(() => {});

    ctx.deleteMessage().catch(() => {});
});

bot.action("buydo", async (ctx) => {
  const doData = loadDO();
  const categories = Object.keys(doData);

  if (!categories.length)
    return ctx.answerCbQuery("Stok DO kosong", { show_alert: true });

  await ctx.answerCbQuery().catch(() => {});

  const categoryButtons = categories.map(cat => [
    {
      text: `🌊 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      callback_data: `do_category_buy|${cat}`
    }
  ]);

  categoryButtons.push([
    { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }
  ]);

  ctx.reply(
    "<b>Pilih Kategori Akun Digital Ocean:</b>",
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: categoryButtons }
    }
  ).catch(() => {});

  ctx.deleteMessage().catch(() => {});
});

bot.action("buyvps", async (ctx) => {
  if (!config.apiDigitalOcean)
    return ctx.answerCbQuery("Fitur VPS belum tersedia", { show_alert: true });

  await ctx.answerCbQuery().catch(() => {});

  const packageButtons = vpsPackages.map(pkg => [
    {
      text: `${escapeHTML(pkg.label)} - Rp${toRupiah(pkg.price)}`,
      callback_data: `vps_step1|${pkg.key}`
    }
  ]);

  packageButtons.push([
    { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }
  ]);

  ctx.reply(
    "<b>Pilih Paket RAM & CPU VPS:</b>",
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: packageButtons }
    }
  ).catch(() => {});

  ctx.deleteMessage().catch(() => {});
});
    
bot.action("buypanel", async (ctx) => {
  // 🔴 CEK PANEL
  if (!isPanelReady()) {
    return ctx.answerCbQuery(
      "❌ Stok panel sedang kosong, silakan tunggu restock.",
      { show_alert: true }
    ).catch(() => {});
  }

  await ctx.answerCbQuery().catch(() => {});

  ctx.reply(
    `<blockquote>🖥️ <b>BUY PANEL</b>\n\n` +
    `Ketik:\n<code><b>${config.prefix}buypanel username</b></code>\n\n` +
    `Contoh:\n<code><b>${config.prefix}buypanel KaellVirex</b></code>\n\n` +
    `Lanjutkan dengan mengetik perintah di chat.</blockquote>`,
    {
      parse_mode: "html",
      reply_markup: {
        inline_keyboard: [
          [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }]
        ]
      }
    }
  ).catch(() => {});

  // 🔥 delete jalan di background (biar cepet)
  ctx.deleteMessage().catch(() => {});
});

bot.action("buyadmin", async (ctx) => {
  if (!isPanelReady()) {
    return ctx.answerCbQuery(
      "❌ Stok admin panel kosong",
      { show_alert: true }
    ).catch(() => {});
  }

  await ctx.answerCbQuery().catch(() => {});

  ctx.reply(
    `<blockquote>👑 <b>BUY ADMIN PANEL</b>\n\n` +
    `Ketik:\n<code><b>${config.prefix}buyadmin username</b></code>\n\n` +
    `Contoh:\n<code><b>${config.prefix}buyadmin KaellVirex</b></code>\n\n` +
    `Lanjutkan dengan mengetik perintah di chat.</blockquote>`,
    {
      parse_mode: "html",
      reply_markup: {
        inline_keyboard: [
          [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }]
        ]
      }
    }
  );

  // 🔥 delete jalan di background (UX lebih cepat)
  ctx.deleteMessage().catch(() => {});
});

bot.action("cancel_order", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const order = orders[userId];

    if (order) {
        try {
            if (order.qrMessageId) {
                await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId);
            }
        } catch (e) {}
    }

    delete orders[userId];

    ctx.telegram.sendMessage(
        ctx.chat.id,
        "✅ <b>Order berhasil dibatalkan.</b>\n\nSilakan order ulang atau pilih produk lain melalui tombol di bawah.",
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🛍️ Katalog Produk", callback_data: "katalog"  }
                    ],
                    [
                        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }
                    ]
                ]
            }
        }
    ).catch(() => {});

    ctx.deleteMessage().catch(() => {});
});

bot.action("back_to_main_menu", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  await ctx.editMessageMedia(
    {
      type: "photo",
      media: config.menuImage,
      caption: menuTextBot(ctx),
      parse_mode: "HTML"
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍️ Katalog Produk", callback_data: "katalog" }],
          [
            { text: "👤 Cek Profil", callback_data: "profile" },
            { text: "📮 Cek History", callback_data: "history" }
          ],
          [
            { text: "📢 Channel", url: config.channelLink },
            { text: "📞 Developer", url: "https://t.me/" + config.ownerUsername }
          ]
        ]
      }
    }
  ).catch(() => {});
});
    
bot.action("katalog", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  const storeMenuKeyboard = {
    inline_keyboard: [
      [
        { text: "📡 ☇ 𝐏𝐀𝐍𝐄𝐋", callback_data: "buypanel" },
        { text: "👑 ☇ 𝐀𝐃𝐏", callback_data: "buyadmin" }
      ],
      [
        { text: "🖥 ☇ 𝐕𝐏𝐒", callback_data: "buyvps" },
        { text: "🌐 ☇ 𝐀𝐊𝐔𝐍 𝐃𝐎", callback_data: "buydo" }
      ],
      [
        { text: "📱 ☇ 𝐀𝐏𝐏𝐒", callback_data: "buyapp" },
        { text: "🗂 ☇ 𝐒𝐂𝐑𝐈𝐏𝐓", callback_data: "buyscript" }
      ],
      [
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }
      ]
    ]
  };

  const captionText = `
<blockquote>🛍️ 𝗗𝗔𝗙𝗧𝗔𝗥 𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 𝗕𝗢𝗧
━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih kategori produk yang ingin dibeli:</blockquote>
`;

  try {
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config.katalogImage, // bisa beda foto
        caption: captionText,
        parse_mode: "HTML"
      },
      {
        reply_markup: storeMenuKeyboard
      }
    );
  } catch (err) {
    if (!err.description?.includes("message is not modified")) {
      console.error(err);
    }
  }
});

bot.action(/userpage_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);

    if (!isOwner(ctx)) {
        return ctx.answerCbQuery("❌ Owner Only!", { show_alert: true });
    }

    await sendUserPage(ctx, page);
});

// ===== STOCK CATEGORY VIEW =====
bot.action(/view_category\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const category = ctx.match[1];
    const stocks = loadStocks();
    const items = stocks[category];

    if (!items || items.length === 0) {
        return ctx.editMessageText(
            `❌ Tidak ada stock di kategori <b>${escapeHTML(category)}</b>.`,
            { parse_mode: "HTML" }
        );
    }

    let allItems = [];
    let globalIndex = 0;

    items.forEach((item, itemIdx) => {
        item.accounts.forEach((account, accIdx) => {
            allItems.push({
                category: category,
                description: item.description,
                price: item.price,
                account: account,
                globalIndex: globalIndex,
                itemIndex: itemIdx,
                accountIndex: accIdx,
                added_date: item.added_date,
                totalInGroup: item.accounts.length,
                stockInGroup: item.stock
            });
            globalIndex++;
        });
    });

    const itemsPerPage = 8;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    let currentPage = 0;

    const createPage = (page) => {
        const startIdx = page * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
        const pageItems = allItems.slice(startIdx, endIdx);

        const buttons = pageItems.map((item, idx) => [
            {
                text: `📦 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)}`,
                callback_data: `stock_detail|${category}|${item.itemIndex}|${item.accountIndex}`
            }
        ]);

        const navButtons = [];
        if (totalPages > 1) {
            if (page > 0) {
                navButtons.push({ text: "◀️ Prev", callback_data: `category_page|${category}|${page - 1}` });
            }
            navButtons.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
            if (page < totalPages - 1) {
                navButtons.push({ text: "Next ▶️", callback_data: `category_page|${category}|${page + 1}` });
            }
        }

        const actionButtons = [
            [
                { text: "🗑️ Hapus Kategori", callback_data: `del_category|${category}` },
                { text: "↩️ Back Kategori", callback_data: "back_to_categories" }
            ]
        ];

        if (navButtons.length > 0) {
            buttons.push(navButtons);
        }
        buttons.push(...actionButtons);

        return {
            text: `📊 <b>STOCK KATEGORI: ${escapeHTML(category.toUpperCase())}</b>\n\n` +
                `📝 Total Item: ${allItems.length}\n` +
                `📅 Halaman: ${page + 1}/${totalPages}\n\n` +
                `Pilih item untuk melihat detail:`,
            keyboard: { inline_keyboard: buttons }
        };
    };

    const pageData = createPage(currentPage);
    return ctx.editMessageText(pageData.text, {
        parse_mode: "HTML",
        reply_markup: pageData.keyboard
    });
});

// === DIGITAL OCEAN CATEGORY VIEW ===
bot.action(/do_category\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const category = ctx.match[1];
    const doData = loadDO();
    const items = doData[category];

    if (!items || items.length === 0) {
        return ctx.editMessageText(
            `❌ Tidak ada stock di kategori <b>${escapeHTML(category)}</b>.`,
            { parse_mode: "HTML" }
        );
    }

    let allItems = [];
    let globalIndex = 0;

    items.forEach((item, itemIdx) => {
        item.accounts.forEach((account, accIdx) => {
            allItems.push({
                category: category,
                description: item.description,
                price: item.price,
                account: account,
                globalIndex: globalIndex,
                itemIndex: itemIdx,
                accountIndex: accIdx,
                added_date: item.added_date,
                totalInGroup: item.accounts.length,
                stockInGroup: item.stock
            });
            globalIndex++;
        });
    });

    const itemsPerPage = 8;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    let currentPage = 0;

    const createPage = (page) => {
        const startIdx = page * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
        const pageItems = allItems.slice(startIdx, endIdx);

        const buttons = pageItems.map((item, idx) => [
            {
                text: `🌊 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)}`,
                callback_data: `do_detail|${category}|${item.itemIndex}|${item.accountIndex}`
            }
        ]);

        const navButtons = [];
        if (totalPages > 1) {
            if (page > 0) {
                navButtons.push({ text: "◀️ Prev", callback_data: `do_category_page|${category}|${page - 1}` });
            }
            navButtons.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
            if (page < totalPages - 1) {
                navButtons.push({ text: "Next ▶️", callback_data: `do_category_page|${category}|${page + 1}` });
            }
        }

        const actionButtons = [
            [
                { text: "🗑️ Hapus Kategori", callback_data: `del_do_category|${category}` },
                { text: "↩️ Back Kategori", callback_data: "back_to_do_categories" }
            ]
        ];

        if (navButtons.length > 0) {
            buttons.push(navButtons);
        }
        buttons.push(...actionButtons);

        return {
            text: `🌊 <b>DIGITAL OCEAN KATEGORI: ${escapeHTML(category.toUpperCase())}</b>\n\n` +
                `📝 Total Item: ${allItems.length}\n` +
                `📅 Halaman: ${page + 1}/${totalPages}\n\n` +
                `Pilih item untuk melihat detail:`,
            keyboard: { inline_keyboard: buttons }
        };
    };

    const pageData = createPage(currentPage);
    return ctx.editMessageText(pageData.text, {
        parse_mode: "HTML",
        reply_markup: pageData.keyboard
    });
});

// == DIGITAL OCEAN BUY CATEGORY ===
bot.action(/do_category_buy\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const category = ctx.match[1];
    const doData = loadDO();
    const items = doData[category];

    if (!items || items.length === 0) {
        return ctx.editMessageText(
            `❌ Stok untuk kategori <b>${escapeHTML(category)}</b> sedang kosong.`,
            { parse_mode: "HTML" }
        );
    }

    const itemButtons = items.map((item, index) => [
        {
            text: `🌊 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)} (stok ${item.stock})`,
            callback_data: `do_item_buy|${category}|${index}`
        }
    ]);

    itemButtons.push([
        {
            text: `↩️ Kembali ke Kategori`,
            callback_data: `back_do_buy_category`
        }
    ]);

    return ctx.editMessageText(
        `📦 Kategori DO: <b>${escapeHTML(category.toUpperCase())}</b>\n\n<b>Pilih Stock Akun:</b>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: itemButtons }
        }
    );
});

    bot.action("back_do_buy_category", async (ctx) => {
        await ctx.answerCbQuery();
        const doData = loadDO();
        const categories = Object.keys(doData);

        if (categories.length === 0) {
            return ctx.reply("📭 Stok Digital Ocean sedang kosong.");
        }

        const categoryButtons = categories.map(cat => [
            { text: `🌊 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `do_category_buy|${cat}` }
        ]);

        return ctx.editMessageText("*Pilih Kategori Digital Ocean:*", {
            parse_mode: "html",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

    // ===== DIGITAL OCEAN BUY ITEM =====
    bot.action(/do_item_buy\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const doData = loadDO();
        const items = doData[category];

        if (!items || !items[index]) {
            return ctx.editMessageText("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.editMessageText("❌ Stok habis!");
        }

        const fee = generateRandomFee();
        const price = item.price
        const name = `Digital Ocean ${category} (${item.description})`;

        const confirmationText = createConfirmationText("do", name, price, fee, {
            category: category,
            description: item.description
        });

        return ctx.editMessageText(confirmationText, {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Konfirmasi", callback_data: `confirm_do_payment|${category}|${index}` },
                        { text: "❌ Batalkan", callback_data: `do_category_buy|${category}` }
                    ]
                ]
            }
        });
    });

    // ===== KONFIRMASI PEMBAYARAN DO =====
    bot.action(/confirm_do_payment\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const doData = loadDO();
        const items = doData[category];

        if (!items || !items[index]) {
            return ctx.reply("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.reply("❌ Stok habis!");
        }

        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = item.price + fee;
        const name = `Digital Ocean ${category} (${item.description})`;

        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        orders[userId] = {
            type: "do",
            category,
            itemIndex: index,
            name,
            description: item.description,
            account: item.accounts[0],
            accounts: item.accounts,
            amount: price,
            fee,
            orderId: pay.orderId || null,
            paymentType: paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(name, price, fee),
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

// ===== CATEGORY PAGE CALLBACK (STOCK) =====
bot.action(/category_page\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, pageStr] = ctx.match[1].split("|");
    const page = parseInt(pageStr);

    const stocks = loadStocks();
    const items = stocks[category];

    if (!items) {
        return ctx.editMessageText("❌ Kategori tidak ditemukan.", { parse_mode: "HTML" });
    }

    let allItems = [];
    let globalIndex = 0;

    items.forEach((item, itemIdx) => {
        item.accounts.forEach((account, accIdx) => {
            allItems.push({
                category: category,
                description: item.description,
                price: item.price,
                account: account,
                globalIndex: globalIndex,
                itemIndex: itemIdx,
                accountIndex: accIdx,
                added_date: item.added_date,
                totalInGroup: item.accounts.length,
                stockInGroup: item.stock
            });
            globalIndex++;
        });
    });

    const itemsPerPage = 8;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);

    const createPage = (pageNum) => {
        const startIdx = pageNum * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
        const pageItems = allItems.slice(startIdx, endIdx);

        const buttons = pageItems.map((item, idx) => [
            {
                text: `📦 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)}`,
                callback_data: `stock_detail|${category}|${item.itemIndex}|${item.accountIndex}`
            }
        ]);

        const navButtons = [];
        if (totalPages > 1) {
            if (pageNum > 0) {
                navButtons.push({ text: "◀️ Prev", callback_data: `category_page|${category}|${pageNum - 1}` });
            }
            navButtons.push({ text: `${pageNum + 1}/${totalPages}`, callback_data: "noop" });
            if (pageNum < totalPages - 1) {
                navButtons.push({ text: "Next ▶️", callback_data: `category_page|${category}|${pageNum + 1}` });
            }
        }

        const actionButtons = [
            [
                { text: "🗑️ Hapus Kategori", callback_data: `del_category|${category}` },
                { text: "↩️ Back Kategori", callback_data: "back_to_categories" }
            ]
        ];

        if (navButtons.length > 0) {
            buttons.push(navButtons);
        }
        buttons.push(...actionButtons);

        return {
            text: `📊 <b>STOCK KATEGORI: ${escapeHTML(category.toUpperCase())}</b>\n\n` +
                  `📝 Total Item: ${allItems.length}\n` +
                  `📅 Halaman: ${pageNum + 1}/${totalPages}\n\n` +
                  `Pilih item untuk melihat detail:`,
            keyboard: { inline_keyboard: buttons }
        };
    };

    const pageData = createPage(page);
    return ctx.editMessageText(pageData.text, {
        parse_mode: "HTML",
        reply_markup: pageData.keyboard
    });
});

// ===== DIGITAL OCEAN CATEGORY PAGE CALLBACK =====
bot.action(/do_category_page\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, pageStr] = ctx.match[1].split("|");
    const page = parseInt(pageStr);

    const doData = loadDO();
    const items = doData[category];

    if (!items) {
        return ctx.editMessageText("❌ Kategori tidak ditemukan.", { parse_mode: "HTML" });
    }

    let allItems = [];
    let globalIndex = 0;

    items.forEach((item, itemIdx) => {
        item.accounts.forEach((account, accIdx) => {
            allItems.push({
                category: category,
                description: item.description,
                price: item.price,
                account: account,
                globalIndex: globalIndex,
                itemIndex: itemIdx,
                accountIndex: accIdx,
                added_date: item.added_date,
                totalInGroup: item.accounts.length,
                stockInGroup: item.stock
            });
            globalIndex++;
        });
    });

    const itemsPerPage = 8;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);

    const createPage = (pageNum) => {
        const startIdx = pageNum * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
        const pageItems = allItems.slice(startIdx, endIdx);

        const buttons = pageItems.map((item, idx) => [
            {
                text: `🌊 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)}`,
                callback_data: `do_detail|${category}|${item.itemIndex}|${item.accountIndex}`
            }
        ]);

        const navButtons = [];
        if (totalPages > 1) {
            if (pageNum > 0) {
                navButtons.push({ text: "◀️ Prev", callback_data: `do_category_page|${category}|${pageNum - 1}` });
            }
            navButtons.push({ text: `${pageNum + 1}/${totalPages}`, callback_data: "noop" });
            if (pageNum < totalPages - 1) {
                navButtons.push({ text: "Next ▶️", callback_data: `do_category_page|${category}|${pageNum + 1}` });
            }
        }

        const actionButtons = [
            [
                { text: "🗑️ Hapus Kategori", callback_data: `del_do_category|${category}` },
                { text: "↩️ Back Kategori", callback_data: "back_to_do_categories" }
            ]
        ];

        if (navButtons.length > 0) {
            buttons.push(navButtons);
        }
        buttons.push(...actionButtons);

        return {
            text: `🌊 <b>DIGITAL OCEAN KATEGORI: ${escapeHTML(category.toUpperCase())}</b>\n\n` +
                  `📝 Total Item: ${allItems.length}\n` +
                  `📅 Halaman: ${pageNum + 1}/${totalPages}\n\n` +
                  `Pilih item untuk melihat detail:`,
            keyboard: { inline_keyboard: buttons }
        };
    };

    const pageData = createPage(page);
    return ctx.editMessageText(pageData.text, {
        parse_mode: "HTML",
        reply_markup: pageData.keyboard
    });
});

// ===== STOCK ITEM DETAIL (HTML) =====
bot.action(/stock_detail\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
    const itemIndex = parseInt(itemIndexStr);
    const accountIndex = parseInt(accountIndexStr);

    const stocks = loadStocks();

    if (!stocks[category] || !stocks[category][itemIndex]) {
        return ctx.editMessageText("❌ Item tidak ditemukan.", { parse_mode: "HTML" });
    }

    const item = stocks[category][itemIndex];
    const account = item.accounts[accountIndex];

    if (!account) {
        return ctx.editMessageText("❌ Akun tidak ditemukan.", { parse_mode: "HTML" });
    }

    const detailText = `📋 <b>DETAIL STOCK ITEM</b>

📁 <b>Kategori:</b> ${escapeHTML(category.toUpperCase())}
📝 <b>Deskripsi:</b> ${escapeHTML(item.description)}
💰 <b>Harga:</b> Rp${toRupiah(item.price)}
📅 <b>Ditambahkan:</b> ${new Date(item.added_date).toLocaleDateString('id-ID')}

🔑 <b>Data Akun:</b>
<code>${escapeHTML(account)}</code>

📊 <b>Informasi Grup:</b>
├ Total Akun: ${item.accounts.length}
├ Stok: ${item.stock}
└ Index: ${itemIndex + 1}/${stocks[category].length} (kategori)`;

    return ctx.editMessageText(detailText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🗑️ Hapus Stock", callback_data: `del_stock_item|${category}|${itemIndex}|${accountIndex}` }],
                [
                    { text: "↩️ Back Stock", callback_data: `view_category|${category}` },
                    { text: "↩️ Back Kategori", callback_data: "back_to_categories" }
                ]
            ]
        }
    });
});

// ===== DIGITAL OCEAN ITEM DETAIL (HTML) =====
bot.action(/do_detail\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
    const itemIndex = parseInt(itemIndexStr);
    const accountIndex = parseInt(accountIndexStr);

    const doData = loadDO();

    if (!doData[category] || !doData[category][itemIndex]) {
        return ctx.editMessageText("❌ Item tidak ditemukan.", { parse_mode: "HTML" });
    }

    const item = doData[category][itemIndex];
    const account = item.accounts[accountIndex];

    if (!account) {
        return ctx.editMessageText("❌ Akun tidak ditemukan.", { parse_mode: "HTML" });
    }

    const detailText = `🌊 <b>DETAIL DIGITAL OCEAN ITEM</b>

📁 <b>Kategori:</b> ${escapeHTML(category.toUpperCase())}
📝 <b>Deskripsi:</b> ${escapeHTML(item.description)}
💰 <b>Harga:</b> Rp${toRupiah(item.price)}
📅 <b>Ditambahkan:</b> ${new Date(item.added_date).toLocaleDateString('id-ID')}

🔑 <b>Data Akun:</b>
<code>${escapeHTML(account)}</code>

📊 <b>Informasi Grup:</b>
├ Total Akun: ${item.accounts.length}
├ Stok: ${item.stock}
└ Index: ${itemIndex + 1}/${doData[category].length} (kategori)`;

    return ctx.editMessageText(detailText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🗑️ Hapus Stock", callback_data: `del_do_item|${category}|${itemIndex}|${accountIndex}` }],
                [
                    { text: "↩️ Back Stock", callback_data: `do_category|${category}` },
                    { text: "↩️ Back Kategori", callback_data: "back_to_do_categories" }
                ]
            ]
        }
    });
});

// ===== DELETE STOCK ITEM (HTML) =====
bot.action(/del_stock_item\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
    const itemIndex = parseInt(itemIndexStr);
    const accountIndex = parseInt(accountIndexStr);

    const stocks = loadStocks();

    if (!stocks[category] || !stocks[category][itemIndex]) {
        return ctx.editMessageText("❌ Item tidak ditemukan.", { parse_mode: "HTML" });
    }

    const item = stocks[category][itemIndex];
    const deletedAccount = item.accounts[accountIndex];

    item.accounts.splice(accountIndex, 1);
    item.stock -= 1;

    if (item.accounts.length === 0) {
        stocks[category].splice(itemIndex, 1);

        if (stocks[category].length === 0) {
            delete stocks[category];
            saveStocks(stocks);
            return ctx.editMessageText(
                `✅ Item berhasil dihapus!\n\n` +
                `📁 Kategori: ${escapeHTML(category)} (dihapus karena kosong)\n` +
                `🔑 Akun yang dihapus: <code>${escapeHTML(deletedAccount.substring(0, 50))}...</code>\n\n` +
                `Kategori telah dihapus karena tidak ada item lagi.`,
                {
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: [[{ text: "📋 Kembali ke List Kategori", callback_data: "back_to_categories" }]] }
                }
            );
        }
    }

    saveStocks(stocks);

    return ctx.editMessageText(
        `✅ Item berhasil dihapus!\n\n` +
        `📁 Kategori: ${escapeHTML(category)}\n` +
        `📝 Deskripsi: ${escapeHTML(item.description)}\n` +
        `🔑 Akun yang dihapus: <code>${escapeHTML(deletedAccount.substring(0, 50))}...</code>\n` +
        `💰 Harga: Rp${toRupiah(item.price)}\n` +
        `📊 Sisa stok: ${item.accounts.length} akun`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📂 Lihat Kategori", callback_data: `view_category|${category}` },
                        { text: "↩️ Back Kategori", callback_data: "back_to_categories" }
                    ]
                ]
            }
        }
    );
});

// ===== DELETE DIGITAL OCEAN ITEM (HTML) =====
bot.action(/del_do_item\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
    const itemIndex = parseInt(itemIndexStr);
    const accountIndex = parseInt(accountIndexStr);

    const doData = loadDO();

    if (!doData[category] || !doData[category][itemIndex]) {
        return ctx.editMessageText("❌ Item tidak ditemukan.", { parse_mode: "HTML" });
    }

    const item = doData[category][itemIndex];
    const deletedAccount = item.accounts[accountIndex];

    item.accounts.splice(accountIndex, 1);
    item.stock -= 1;

    if (item.accounts.length === 0) {
        doData[category].splice(itemIndex, 1);

        if (doData[category].length === 0) {
            delete doData[category];
            saveDO(doData);
            return ctx.editMessageText(
                `✅ Item berhasil dihapus!\n\n` +
                `📁 Kategori: ${escapeHTML(category)} (dihapus karena kosong)\n` +
                `🔑 Akun yang dihapus: <code>${escapeHTML(deletedAccount.substring(0, 50))}...</code>\n\n` +
                `Kategori telah dihapus karena tidak ada item lagi.`,
                {
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: [[{ text: "📋 Kembali ke List Kategori", callback_data: "back_to_do_categories" }]] }
                }
            );
        }
    }

    saveDO(doData);

    return ctx.editMessageText(
        `✅ Item berhasil dihapus!\n\n` +
        `📁 Kategori: ${escapeHTML(category)}\n` +
        `📝 Deskripsi: ${escapeHTML(item.description)}\n` +
        `🔑 Akun yang dihapus: <code>${escapeHTML(deletedAccount.substring(0, 50))}...</code>\n` +
        `💰 Harga: Rp${toRupiah(item.price)}\n` +
        `📊 Sisa stok: ${item.accounts.length} akun`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📂 Lihat Kategori", callback_data: `do_category|${category}` },
                        { text: "↩️ Back Kategori", callback_data: "back_to_do_categories" }
                    ]
                ]
            }
        }
    );
});

// ===== DELETE CATEGORY (HTML) =====
bot.action(/del_category\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const category = ctx.match[1];
    const stocks = loadStocks();

    if (!stocks[category]) {
        return ctx.editMessageText("❌ Kategori tidak ditemukan.", { parse_mode: "HTML" });
    }

    const totalItems = stocks[category].reduce((sum, item) => sum + item.accounts.length, 0);
    const categoryName = category;

    delete stocks[category];
    saveStocks(stocks);

    return ctx.editMessageText(
        `🗑️ <b>Kategori Berhasil Dihapus!</b>\n\n` +
        `📁 Kategori: ${escapeHTML(categoryName.toUpperCase())}\n` +
        `📊 Total Item: ${totalItems}\n` +
        `✅ Semua data dalam kategori ini telah dihapus.`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "📋 Lihat Kategori Lain", callback_data: "back_to_categories" }]] }
        }
    );
});

// ===== DELETE DIGITAL OCEAN CATEGORY (HTML) =====
bot.action(/del_do_category\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const category = ctx.match[1];
    const doData = loadDO();

    if (!doData[category]) {
        return ctx.editMessageText("❌ Kategori tidak ditemukan.", { parse_mode: "HTML" });
    }

    const totalItems = doData[category].reduce((sum, item) => sum + item.accounts.length, 0);
    const categoryName = category;

    delete doData[category];
    saveDO(doData);

    return ctx.editMessageText(
        `🗑️ <b>Kategori Digital Ocean Berhasil Dihapus!</b>\n\n` +
        `📁 Kategori: ${escapeHTML(categoryName.toUpperCase())}\n` +
        `📊 Total Item: ${totalItems}\n` +
        `✅ Semua data dalam kategori ini telah dihapus.`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "📋 Lihat Kategori Lain", callback_data: "back_to_do_categories" }]] }
        }
    );
});

// ===== BACK TO STOCK CATEGORIES (HTML) =====
bot.action("back_to_categories", async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const stocks = loadStocks();
    const categories = Object.keys(stocks);

    if (categories.length === 0) {
        return ctx.editMessageText("📭 Tidak ada stok tersedia.", { parse_mode: "HTML" });
    }

    const categoryButtons = categories.map(cat => [
        {
            text: `📁 ${escapeHTML(cat.toUpperCase())} (${stocks[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
            callback_data: `view_category|${cat}`
        }
    ]);

    return ctx.editMessageText(
        "📊 <b>DAFTAR KATEGORI STOCK</b>\n\nPilih kategori untuk melihat stock:",
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: categoryButtons }
        }
    );
});

// ===== BACK TO DIGITAL OCEAN CATEGORIES (HTML) =====
bot.action("back_to_do_categories", async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const doData = loadDO();
    const categories = Object.keys(doData);

    if (categories.length === 0) {
        return ctx.editMessageText("📭 Tidak ada stok Digital Ocean tersedia.", { parse_mode: "HTML" });
    }

    const categoryButtons = categories.map(cat => [
        {
            text: `🌊 ${escapeHTML(cat.toUpperCase())} (${doData[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
            callback_data: `do_category|${cat}`
        }
    ]);

    return ctx.editMessageText(
        "🌊 <b>DAFTAR KATEGORI DIGITAL OCEAN</b>\n\nPilih kategori untuk melihat stock:",
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: categoryButtons }
        }
    );
});

    bot.action("noop", async (ctx) => {
        await ctx.answerCbQuery();
    });

    bot.action("back_stock_category", async (ctx) => {
        await ctx.answerCbQuery();
        const stocks = loadStocks();
        const categories = Object.keys(stocks);

        if (categories.length === 0) {
            return ctx.reply("📭 Stok apps premium sedang kosong.");
        }

        const categoryButtons = categories.map(cat => [
            { text: `📱 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `app_category|${cat}` }
        ]);
        
        categoryButtons.push([
            { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }
        ]);

        return ctx.editMessageText("<b>Pilih Kategori Apps Premium:</b>", {
            parse_mode: "html",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

bot.action(/app_category\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const category = ctx.match[1];
    const stocks = loadStocks();
    const items = stocks[category];

    if (!items || items.length === 0) {
        return ctx.editMessageText(
            `❌ Stok untuk kategori <b>${escapeHTML(category)}</b> sedang kosong.`,
            { parse_mode: "HTML" }
        );
    }

    const itemButtons = items.map((item, index) => [
        {
            text: `📱 ${escapeHTML(item.description)} - Rp${toRupiah(item.price)} (stok ${item.stock})`,
            callback_data: `app_item|${category}|${index}`
        }
    ]);

    itemButtons.push([
        {
            text: `↩️ Kembali ke Kategori`,
            callback_data: `back_stock_category`
        }
    ]);

    return ctx.editMessageText(
        `📦 Kategori APPS: <b>${escapeHTML(category.toUpperCase())}</b>\n\nPilih Stock Akun:`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: itemButtons }
        }
    );
});

    bot.action(/app_item\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) {
            return ctx.editMessageText("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.editMessageText("❌ Stok habis!");
        }

        const fee = generateRandomFee();
        const price = item.price
        const name = `${category.toUpperCase()} - ${item.description}`;

        const confirmationText = createConfirmationText("app", name, price, fee, {
            category: category,
            description: item.description
        });

        return ctx.editMessageText(confirmationText, {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Konfirmasi", callback_data: `confirm_app_payment|${category}|${index}` },
                        { text: "❌ Batalkan", callback_data: `app_category|${category}` }
                    ]
                ]
            }
        });
    });
    
        bot.action(/confirm_app_payment\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) return ctx.reply("❌ Item tidak ditemukan!");
        if (items[index].stock <= 0) return ctx.reply("❌ Stok habis!");

        const item = items[index];
        const userId = ctx.from.id;
        const price = item.price; // Harga asli tanpa fee
        
        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // Berikan opsi pembayaran
        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: ${category.toUpperCase()} - ${item.description}\n💰 Harga: Rp${price.toLocaleString('id-ID')}\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo`, callback_data: `pay_saldo_app|${category}|${index}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_app|${category}|${index}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        );
    });


    // ===== KONFIRMASI PEMBAYARAN APP =====
    bot.action(/pay_qris_app\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) {
            return ctx.reply("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.reply("❌ Stok habis!");
        }

        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const basePrice = item.price
        const price = item.price + fee;
        const name = `${category.toUpperCase()} - ${item.description}`;

        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        orders[userId] = {
            type: "app",
            category,
            itemIndex: index,
            name,
            description: item.description,
            account: item.accounts[0],
            accounts: item.accounts,
            amount: price,
            fee,
            orderId: pay.orderId || null,
            paymentType: paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(name, basePrice, fee),
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });
    bot.action(/pay_saldo_app\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];
        const item = items[index];
        const price = item.price;
        const userId = ctx.from.id;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        // Cek apakah saldo cukup
        if (users[userIndex].balance < price) {
            return ctx.reply(`❌ Saldo tidak cukup!\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Produk: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit dengan cara ketik:\n<code>/deposit nominal</code>`, { parse_mode: "HTML" });
        }

        // Cek stok lagi untuk memastikan tidak dibeli orang lain di waktu bersamaan
        if (item.stock <= 0) return ctx.reply("❌ Maaf, stok baru saja habis!");

        // Potong Saldo & Catat di history
        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = `${category.toUpperCase()} - ${item.description}`;
        const transaction = {
            product: name,
            amount: price,
            type: "app",
            timestamp: new Date().toISOString()
        };
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push(transaction);
        saveUsers(users);

        // Ambil 1 akun dan potong stok
        const sentAccount = item.accounts.shift();
        item.stock -= 1;

        if (item.stock <= 0) {
            stocks[category].splice(index, 1);
            if (stocks[category].length === 0) {
                delete stocks[category];
            }
        }
        saveStocks(stocks);

        // --- NOTIFIKASI KE OWNER ---
        const buyerInfo = {
            id: userId,
            name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
            username: ctx.from.username,
            totalSpent: users[userIndex].total_spent
        };
        const orderData = { type: "app", name: name, amount: price, category: category, description: item.description };
        await notifyOwner(ctx, orderData, buyerInfo);

        // --- PENGIRIMAN FILE KE USER ---
        const fileName = `${category}_${Date.now()}.txt`;
        const fileContent = `=== DATA AKUN ${category.toUpperCase()} ===\n\n` +
            `Produk: ${escapeHTML(name)}\n` +
            `Keterangan: ${escapeHTML(item.description)}\n` +
            `Harga: Rp${toRupiah(price)}\n` +
            `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
            `=== DATA AKUN ===\n` +
            `${escapeHTML(sentAccount)}\n\n` +
            `=== INSTRUKSI ===\n` +
            `1. Login dengan akun di atas\n` +
            `2. Nikmati fitur premium\n` +
            `3. Jangan bagikan akun ke orang lain\n` +
            `4. Akun ini untuk personal use\n\n` +
            `=== SUPPORT ===\n` +
            `Jika ada masalah, hubungi: @${config.ownerUsername}`;

        const tempFilePath = path.join(__dirname, 'temp', fileName);
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(tempFilePath, fileContent);

        const appText = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>

📱 Produk: ${escapeHTML(name)}
💰 Harga: Rp${toRupiah(price)}
💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}

📁 Data akun telah dikirim dalam file .txt
📝 Silakan download file untuk melihat detail akun

<blockquote><b>📌 Cara Pakai:</b></blockquote>
1. Login dengan akun yang tersedia
2. Nikmati fitur premium
3. Jangan bagikan akun ke orang lain`;

        try {
            await ctx.telegram.sendMessage(ctx.chat.id, appText, { parse_mode: "html" });
            await ctx.telegram.sendDocument(ctx.chat.id, { source: tempFilePath, filename: fileName }, {
                caption: `📁 File Data Akun: ${escapeHTML(name)}`, parse_mode: "html"
            });
            setTimeout(() => { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); }, 5000);
        } catch (error) {
            console.error("Error sending file:", error);
            const fallbackText = `<b>✅ Pembelian via Saldo Berhasil!</b>\n\n📱 Produk: ${escapeHTML(name)}\n💰 Harga: Rp${toRupiah(price)}\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>🔑 Data Akun: </b></blockquote>\n<code>${escapeHTML(sentAccount)}</code>\n\n⚠️ Note: Akun ini untuk personal use`;
            await ctx.telegram.sendMessage(ctx.chat.id, fallbackText, { parse_mode: "html" });
        }
    });



// Handler untuk kembali ke pilihan paket
bot.action(/back_to_packages/, async (ctx) => {
    await ctx.answerCbQuery();

    const packageButtons = vpsPackages.map((pkg) => [
        {
            text: `${escapeHTML(pkg.label)} - Rp${toRupiah(pkg.price)}`,
            callback_data: `vps_step1|${pkg.key}`
        }
    ]);

    return ctx.editMessageText("<b>Pilih Paket Ram & Cpu Vps:</b>", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: packageButtons }
    });
});

// ===== VPS STEP 1: Pilih RAM & CPU (satu set) =====
bot.action(/vps_step1\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const specKey = ctx.match[1];

    if (!vpsSpecs[specKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> Spec "${escapeHTML(specKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    const spec = vpsSpecs[specKey];

    const osButtons = Object.entries(vpsImages).map(([osKey, os]) => {
        const costInfo = getOSAdditionalCost(osKey);
        const priceText = costInfo.additional ? ` (+Rp${toRupiah(costInfo.cost)})` : '';

        return [
            {
                text: `${os.icon} ${escapeHTML(os.name)}${priceText}`,
                callback_data: `vps_step2|${specKey}|${osKey}`
            }
        ];
    });

    osButtons.push([
        {
            text: "↩️ Kembali ke Paket",
            callback_data: `back_to_packages`
        }
    ]);

    return ctx.editMessageText(
        `<b>Paket Terpilih:</b> ${escapeHTML(spec.name)}\n\n<b>Pilih Operating System:</b>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: osButtons }
        }
    );
});

// ===== VPS STEP 2: Pilih OS =====
bot.action(/vps_step2\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const [specKey, osKey] = ctx.match[1].split("|");

    if (!vpsSpecs[specKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> Spec "${escapeHTML(specKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    if (!vpsImages[osKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> OS "${escapeHTML(osKey)}" tidak ditemukan.\n\nSilakan pilih OS lain.`,
            { parse_mode: "HTML" }
        );
    }

    const spec = vpsSpecs[specKey];
    const osImage = vpsImages[osKey];
    const costInfo = getOSAdditionalCost(osKey);

    const regionButtons = Object.entries(vpsRegions).map(([key, region]) => [
        {
            text: `${region.flag} ${escapeHTML(region.name)}`,
            callback_data: `vps_step3|${specKey}|${osKey}|${key}`
        }
    ]);

    regionButtons.push([
        {
            text: "↩️ Kembali ke OS",
            callback_data: `vps_step1|${specKey}`
        }
    ]);

    const additionalCostText = costInfo.additional ? `\n<b>Biaya OS:</b> Rp${toRupiah(costInfo.cost)}` : '';

    return ctx.editMessageText(
        `<b>Spesifikasi:</b>\n• ${escapeHTML(spec.name)}${additionalCostText}\n• OS: ${escapeHTML(osImage.name)}\n\n<b>Pilih Region Server:</b>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: regionButtons }
        }
    );
});

// ===== VPS STEP 3: Pilih Region dan Tampilkan KONFIRMASI =====
bot.action(/vps_step3\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const [specKey, osKey, regionKey] = ctx.match[1].split("|");

    if (!vpsSpecs[specKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> Spec "${escapeHTML(specKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    if (!vpsImages[osKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> OS "${escapeHTML(osKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    if (!vpsRegions[regionKey]) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> Region "${escapeHTML(regionKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    const spec = vpsSpecs[specKey];
    const osImage = vpsImages[osKey];
    const region = vpsRegions[regionKey];

    const regionValidation = validateOSForRegion(osKey, regionKey);
    if (!regionValidation.valid) {
        return ctx.editMessageText(
            `❌ <b>Error:</b> ${escapeHTML(regionValidation.message)}\n\nSilakan pilih region lain.`,
            { parse_mode: "HTML" }
        );
    }

    const basePrice = vpsPackages.find(v => v.key === specKey).price;
    const osCostInfo = getOSAdditionalCost(osKey);
    const osAdditionalCost = osCostInfo.additional ? osCostInfo.cost : 0;
    const fee = generateRandomFee();
    const totalPrice = basePrice + osAdditionalCost;
    const name = `VPS Digital Ocean ${spec.name}`;

    const confirmationText = createConfirmationText("vps", name, totalPrice, fee, {
        specName: spec.name,
        osName: osImage.name,
        regionName: `${region.flag} ${region.name}`,
        osCost: osAdditionalCost > 0 ? `\n💵 Biaya OS: Rp${toRupiah(osAdditionalCost)}` : ''
    });

    return ctx.editMessageText(confirmationText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "✅ Konfirmasi", callback_data: `confirm_vps_payment|${specKey}|${osKey}|${regionKey}` },
                    { text: "❌ Batalkan", callback_data: `vps_step2|${specKey}|${osKey}` }
                ]
            ]
        }
    });
});

// ===== KONFIRMASI PEMBAYARAN VPS =====
bot.action(/confirm_vps_payment\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();

    const [specKey, osKey, regionKey] = ctx.match[1].split("|");

    if (!vpsSpecs[specKey]) {
        return ctx.reply(
            `❌ <b>Error:</b> Spec "${escapeHTML(specKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    if (!vpsImages[osKey]) {
        return ctx.reply(
            `❌ <b>Error:</b> OS "${escapeHTML(osKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    if (!vpsRegions[regionKey]) {
        return ctx.reply(
            `❌ <b>Error:</b> Region "${escapeHTML(regionKey)}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`,
            { parse_mode: "HTML" }
        );
    }

    const spec = vpsSpecs[specKey];
    const osImage = vpsImages[osKey];
    const region = vpsRegions[regionKey];

    const regionValidation = validateOSForRegion(osKey, regionKey);
    if (!regionValidation.valid) {
        return ctx.reply(
            `❌ <b>Error:</b> ${escapeHTML(regionValidation.message)}\n\nSilakan pilih region lain.`,
            { parse_mode: "HTML" }
        );
    }

    const userId = ctx.from.id;
    const basePrice = vpsPackages.find(v => v.key === specKey).price;
    const osCostInfo = getOSAdditionalCost(osKey);
    const osAdditionalCost = osCostInfo.additional ? osCostInfo.cost : 0;
    const fee = generateRandomFee();
    const totalPrice = basePrice + osAdditionalCost + fee;
    const name = `VPS Digital Ocean ${spec.name}`;
    const paymentType = config.paymentGateway;

    const pay = await createPayment(paymentType, totalPrice, config);

    orders[userId] = {
        type: "vps",
        specKey: specKey,
        osKey: osKey,
        regionKey: regionKey,
        name: name,
        spec: {
            ramCpu: spec,
            os: osImage,
            region: region,
            basePrice: basePrice,
            osAdditionalCost: osAdditionalCost
        },
        amount: totalPrice,
        fee: fee,
        orderId: pay.orderId || null,
        paymentType: paymentType,
        chatId: ctx.chat.id,
        expireAt: Date.now() + 6 * 60 * 1000
    };

    const photo =
        paymentType === "pakasir"
            ? { source: pay.qris }
            : pay.qris;

    const qrMsg = await ctx.replyWithPhoto(photo, {
        caption: textOrder(name, basePrice, fee, "HTML"), // textOrder harus support HTML
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
            ]
        }
    });

    orders[userId].qrMessageId = qrMsg.message_id;
    startCheck(userId, ctx);
});

bot.action(/delstock_cat\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const category = ctx.match[1];
    const stocks = loadStocks();

    if (!stocks[category]) {
        return ctx.editMessageText(`❌ Kategori <b>${escapeHTML(category)}</b> tidak ditemukan.`, {
            parse_mode: "HTML"
        });
    }

    const items = stocks[category];
    const itemButtons = items.map((item, index) => [
        {
            text: `🗑️ ${escapeHTML(item.description)}`,
            callback_data: `delstock_item|${category}|${index}`
        }
    ]);

    return ctx.editMessageText(`Pilih item dalam kategori <b>${escapeHTML(category)}</b> yang ingin dihapus:`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: itemButtons }
    });
});

bot.action(/delstock_item\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const [category, indexStr] = ctx.match[1].split("|");
    const index = parseInt(indexStr);
    const stocks = loadStocks();

    if (!stocks[category] || !stocks[category][index]) {
        return ctx.editMessageText("❌ Item tidak ditemukan.");
    }

    const deletedItem = stocks[category][index];
    stocks[category].splice(index, 1);

    if (stocks[category].length === 0) {
        delete stocks[category];
    }

    saveStocks(stocks);

    return ctx.editMessageText(
        `✅ Item berhasil dihapus!\n\n` +
        `📁 Kategori: <b>${escapeHTML(category)}</b>\n` +
        `📝 Keterangan: <b>${escapeHTML(deletedItem.description)}</b>\n` +
        `💰 Harga: Rp${toRupiah(deletedItem.price)}\n` +
        `🔑 ${deletedItem.accounts.length} akun dihapus`,
        { parse_mode: "HTML" }
    );
});

// ===== GET SCRIPT DETAIL =====
bot.action(/getscript_detail\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);

    const scripts = loadScripts();
    const s = scripts[index];
    if (!s) return ctx.editMessageText("❌ Script tidak ditemukan.");

    const detailText = `📋 <b>DETAIL SCRIPT</b>\n\n` +
        `📦 <b>Nama:</b> ${escapeHTML(s.name)}\n` +
        `💰 <b>Harga:</b> Rp${toRupiah(s.price)}\n` +
        `📁 <b>File:</b> ${escapeHTML(s.file || "-")}\n` +
        `📅 <b>Ditambahkan:</b> ${new Date(s.added_date).toLocaleDateString('id-ID')}\n\n` +
        `📝 <b>Deskripsi:</b>\n${escapeHTML(s.desk || "-")}`;

    return ctx.editMessageText(detailText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📤 Download Script", callback_data: `download_script|${index}` },
                    { text: "🗑️ Hapus Script", callback_data: `del_script|${s.name}` }
                ],
                [
                    { text: "↩️ Back ke List Script", callback_data: "back_to_script_list" }
                ]
            ]
        }
    });
});

// ===== DOWNLOAD SCRIPT =====
bot.action(/download_script\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);

    const scripts = loadScripts();
    const s = scripts[index];
    if (!s) return ctx.reply("❌ Script tidak ditemukan.");

    const filePath = path.resolve(s.file || "");
    if (!fs.existsSync(filePath))
        return ctx.reply("❌ File script tidak ditemukan di server.");

    return ctx.replyWithDocument({ source: filePath }, {
        caption: `📂 Script: ${escapeHTML(s.name)}`,
        parse_mode: "HTML"
    });
});

// ===== BACK TO SCRIPT LIST =====
bot.action("back_to_script_list", async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

    const allScripts = loadScripts();
    if (!allScripts.length) return ctx.editMessageText("📭 Belum ada script.");

    const buttons = allScripts.map((s, i) => ([
        { text: `📂 ${escapeHTML(s.name)} - Rp${s.price}`, callback_data: `getscript_detail|${i}` }
    ]));

    return ctx.editMessageText("<b>📦 DAFTAR SCRIPT</b>\n\nPilih Script untuk melihat detail:", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
    });
});

// ===== DELETE SCRIPT =====
bot.action(/del_script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const name = ctx.match[1];

    let scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    if (!sc) return ctx.editMessageText("❌ Tidak ditemukan.");

    const filePath = path.join(__dirname, sc.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    scripts = scripts.filter(s => s.name !== name);
    saveScripts(scripts);

    return ctx.editMessageText(
        `✅ Script <b>${escapeHTML(name)}</b> berhasil dihapus.`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "↩️ Kembali ke List Script", callback_data: "back_to_script_list" }]
                ]
            }
        }
    );
});

    bot.action(/panel_ram\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const params = ctx.match[1].split("|");
        const ram = params[0];
        const username = params[1];

        const fee = generateRandomFee();

        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];

        if (!basePrice) {
            return ctx.editMessageText("Harga panel tidak ditemukan!");
        }

        const price = basePrice;
        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;

        const confirmationText = createConfirmationText("panel", name, price, fee, {
            username: username,
            ram: ram
        });

        return ctx.editMessageText(confirmationText, {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Konfirmasi", callback_data: `confirm_panel_payment|${ram}|${username}` },
                        { text: "❌ Batalkan", callback_data: "cancel_order" }
                    ]
                ]
            }
        });
    });

    // ===== OPSI PEMBAYARAN PANEL =====
    bot.action(/confirm_panel_payment\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        
        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;
        
        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];
        if (!basePrice) return ctx.reply("Harga panel tidak ditemukan!");
        
        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Panel ${ram === "unli" ? "Unlimited" : ram}\n👤 Username: ${username}\n💰 Harga: Rp${basePrice.toLocaleString('id-ID')}\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo`, callback_data: `pay_saldo_panel|${ram}|${username}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_panel|${ram}|${username}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        );
    });

    // ===== BAYAR PANEL VIA QRIS =====
    bot.action(/pay_qris_panel\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];
        if (!basePrice) return ctx.reply("Harga panel tidak ditemukan!");

        const price = fee + basePrice;
        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;
        const paymentType = config.paymentGateway;
        const pay = await createPayment(paymentType, price, config);

        orders[userId] = { type: "panel", username, ram, name, amount: price, fee, orderId: pay.orderId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
        const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
        const qrMsg = await ctx.replyWithPhoto(photo, { caption: textOrder(name, basePrice, fee), parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    // ===== BAYAR PANEL VIA SALDO =====
    bot.action(/pay_saldo_panel\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;

        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const price = hargaPanel[priceKey];
        if (!price) return ctx.reply("Harga panel tidak ditemukan!");

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (users[userIndex].balance < price) {
            return ctx.reply(`❌ Saldo tidak cukup!\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Produk: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" });
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "panel", details: `Username: ${username}, RAM: ${ram === "unli" ? "Unlimited" : ram + "GB"}`, timestamp: new Date().toISOString() });
        saveUsers(users);

        await ctx.reply(`⏳ Sedang membuat Panel Pterodactyl... Mohon tunggu.`);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "panel", name, amount: price, username, ram }, buyerInfo);

        const ramVal = ram === "unli" ? "Unlimited" : `${ram}GB`;
        const fixUsername = username + randomNumber(3);

        let res = await createPanel(fixUsername, ramVal.toLowerCase());
        if (!res.success) return ctx.reply(`❌ Error! Terjadi kesalahan saat membuat panel.\nSilahkan hubungi admin @${config.ownerUsername}`);

        res = res.data;
        const teksPanel = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n👤 Username: <code>${escapeHTML(res.username)}</code>\n🔑 Password: <code>${escapeHTML(res.password)}</code>\n💾 RAM: ${ramVal}\n🆔 Server ID: ${res.serverId}\n📛 Server Name: ${escapeHTML(res.serverName)}\n⏳ Expired: 1 Bulan\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>📌 Cara Login:</b></blockquote>\n1. Klik tombol Login Panel di bawah\n2. Masukkan username & password\n3. Server siap dipakai!`;

        await ctx.reply(teksPanel, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "🔗 Login Panel", url: res.panelUrl }]] } });
    });


bot.action(/^script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const name = ctx.match[1];
    const scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    const now = new Date();
    const waktu = now.toLocaleString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).replace(".", ":");

    if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

    const text = `
<blockquote><b>📝 Konfirmasi Pemesanan</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━
📦 Produk: Script ${escapeHTML(sc.name)}\n
💰 Harga: Rp${Number(sc.price).toLocaleString("id-ID")}
🕒 Waktu: ${waktu}
━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>📝 Deskripsi:</b></blockquote>
${escapeHTML(sc.desk || "-")}
━━━━━━━━━━━━━━━━━━━━━━
⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?
    `.trim();

    await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "✅ Konfirmasi", callback_data: `confirm_script|${sc.name}` },
                    { text: "❌ Batalkan", callback_data: "back_to_script" }
                ]
            ]
        }
    });
});

    // ===== OPSI PEMBAYARAN SCRIPT =====
    bot.action(/confirm_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

        const price = sc.price; // Harga asli tanpa fee

        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // KITA UBAH BAGIAN INI JADI EDIT MESSAGE BIAR MULUS
        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n💰 Harga: Rp${price.toLocaleString('id-ID')}\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo`, callback_data: `pay_saldo_script|${sc.name}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_script|${sc.name}` }],
                        [{ text: "❌ Batalkan", callback_data: "back_to_script" }]
                    ]
                }
            }
        ).catch(err => console.log("Gagal edit pesan:", err));
    });


    // ===== BAYAR SCRIPT VIA QRIS =====
    bot.action(/pay_qris_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

        const fee = generateRandomFee();
        const price = sc.price + fee;
        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);
        const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;

        orders[userId] = {
            type: "script",
            name: sc.name,
            amount: price,
            fee,
            file: sc.file, // Path file script
            orderId: pay.orderId || null,
            paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(sc.name, sc.price, fee),
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    // ===== BAYAR SCRIPT VIA SALDO =====
    bot.action(/pay_saldo_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

        const price = sc.price;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (users[userIndex].balance < price) {
            return ctx.reply(`❌ Saldo tidak cukup!\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Produk: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" });
        }

        // Potong Saldo
        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ 
            product: `Script: ${sc.name}`, 
            amount: price, 
            type: "script", 
            details: sc.desk || "-", 
            timestamp: new Date().toISOString() 
        });
        saveUsers(users);

        // Notifikasi Owner
        const buyerInfo = { 
            id: userId, 
            name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), 
            username: ctx.from.username, 
            totalSpent: users[userIndex].total_spent 
        };
        await notifyOwner(ctx, { type: "script", name: sc.name, amount: price }, buyerInfo);

        // Kirim Pesan Sukses
        await ctx.reply(`<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n💰 Harga: Rp${price.toLocaleString('id-ID')}\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<i>File script sedang dikirim...</i>`, { parse_mode: "html" });

        // Kirim File
        try {
            await ctx.telegram.sendDocument(
                ctx.chat.id,
                { source: sc.file },
                {
                    caption: `📁 Script: ${escapeHTML(sc.name)}`,
                    parse_mode: "html"
                }
            );
        } catch (err) {
            console.error("Gagal kirim script:", err);
            await ctx.reply("❌ Gagal mengirim file script. Silakan hubungi admin.");
        }
    });


bot.action("back_to_script", async (ctx) => {
    await ctx.answerCbQuery();

    const scriptsList = loadScripts();
    if (!scriptsList.length)
        return ctx.editMessageText("📭 Stok script sedang kosong.");

    const scriptButtons = scriptsList.map(s => ([
        {
            text: `📂 ${escapeHTML(s.name)} - Rp${Number(s.price).toLocaleString("id-ID")}`,
            callback_data: `script|${s.name}`
        }
    ]));
    
    scriptButtons.push([
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }
    ]);

    await ctx.editMessageText("Pilih Script yang ingin dibeli:", {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: scriptButtons
        }
    });
});

    // ===== OPSI PEMBAYARAN ADMIN =====
    bot.action(/confirm_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        
        const user = ctx.match[1];
        const userId = ctx.from.id;
        const basePrice = hargaAdminPanel;
        
        const users = loadUsers();
        const dbUser = users.find(u => u.id === userId);
        const saldo = dbUser ? (dbUser.balance || 0) : 0;

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n👑 Produk: Admin Panel\n👤 Username: ${user}\n💰 Harga: Rp${basePrice.toLocaleString('id-ID')}\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo`, callback_data: `pay_saldo_admin|${user}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_admin|${user}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        );
    });

    // ===== BAYAR ADMIN VIA QRIS =====
    bot.action(/pay_qris_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const user = ctx.match[1];
        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = fee + hargaAdminPanel;
        const name = "Admin Panel";
        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        orders[userId] = { username: user, type: "admin", name, amount: price, fee, orderId: pay.orderId || null, paymentType: paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
        const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
        const qrMsg = await ctx.replyWithPhoto(photo, { caption: textOrder(name, hargaAdminPanel, fee), parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    // ===== BAYAR ADMIN VIA SALDO =====
    bot.action(/pay_saldo_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const username = ctx.match[1];
        const userId = ctx.from.id;
        const price = hargaAdminPanel;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (users[userIndex].balance < price) {
            return ctx.reply(`❌ Saldo tidak cukup!\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Produk: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" });
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = "Admin Panel";
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "admin", details: `Username: ${username}`, timestamp: new Date().toISOString() });
        saveUsers(users);

        await ctx.reply(`⏳ Sedang membuat Admin Panel... Mohon tunggu.`);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "admin", name, amount: price, username }, buyerInfo);

        const fixUsername = username + randomNumber(3);
        try {
            const res = await createAdmin(fixUsername);
            const teksAdmin = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n🆔 User ID: ${res.id}\n👤 Username: <code>${escapeHTML(res.username)}</code>\n🔑 Password: <code>${escapeHTML(res.password)}</code>\n⏳ Expired: 1 Bulan\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>📌 Cara Login:</b></blockquote>\n1. Klik tombol Login Panel di bawah\n2. Masukkan username & password\n3. Admin panel siap digunakan!`;
            await ctx.reply(teksAdmin, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "🔗 Login Panel", url: res.panel }]] } });
        } catch (e) {
            return ctx.reply(`❌ Error! Terjadi kesalahan saat membuat admin panel.\nSilahkan hubungi admin @${config.ownerUsername}`);
        }
    });


    function startCheck(userId, ctx) {
        const intv = setInterval(async () => {
            const order = orders[userId];
            if (!order) {
                clearInterval(intv);
                return;
            }

            // ===== EXPIRED =====
            if (Date.now() > order.expireAt) {
                clearInterval(intv);

                try {
                    if (order.qrMessageId) {
                        await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId);
                    }
                } catch (e) { }

                await ctx.telegram.sendMessage(
                    order.chatId,
                    "⏰ Pembayaran QR telah expired!\nSilakan order ulang dari .menu",
                    { parse_mode: "html" }
                );

                delete orders[userId];
                return;
            }

            // ===== CEK PEMBAYARAN =====
            const paymentType = order.paymentType || config.paymentGateway;

            const paid = await cekPaid(
                paymentType,
                order,
                config,
                { userId, orders, toRupiah }
            );

            if (!paid) return;

            clearInterval(intv);
            const o = orders[userId];

            // ==========================================
            // ===== LOGIKA KHUSUS UNTUK DEPOSIT ========
            // ==========================================
            if (o.type === "deposit") {
                const users = loadUsers();
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex !== -1) {
                    // Tambahkan saldo
                    users[userIndex].balance = (users[userIndex].balance || 0) + o.depositAmount;
                    saveUsers(users);
                }

                // Kirim Notif ke Owner kalau ada yang deposit
                const buyerInfo = {
                    id: userId,
                    name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
                    username: ctx.from.username,
                    totalSpent: users[userIndex]?.total_spent || 0
                };
                await notifyOwner(ctx, o, buyerInfo);

                // Kirim pesan sukses ke User
                await ctx.telegram.sendMessage(
                    o.chatId,
                    `<blockquote><b>✅ Deposit Berhasil!</b></blockquote>\n\nSaldo sebesar Rp${o.depositAmount.toLocaleString('id-ID')} telah masuk ke akun Anda.\n💰 Saldo Anda sekarang: Rp${users[userIndex].balance.toLocaleString('id-ID')}`,
                    { parse_mode: "html" }
                );

                try {
                    if (o.qrMessageId) {
                        await ctx.telegram.deleteMessage(o.chatId, o.qrMessageId);
                    }
                } catch (e) { }

                delete orders[userId];
                
                // PENTING: return di sini agar kode di bawah (pengiriman barang) tidak ikut tereksekusi!
                return; 
            }
            // ==========================================

            updateUserHistory(userId, o);

            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users[userIndex].total_spent = (users[userIndex].total_spent || 0) + o.amount;
                saveUsers(users);
            }

            const buyerInfo = {
                id: userId,
                name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
                username: ctx.from.username,
                totalSpent: users[userIndex]?.total_spent || 0
            };

            await notifyOwner(ctx, o, buyerInfo);

            await ctx.telegram.sendMessage(
                o.chatId,
                `<blockquote><b>✅ Pembayaran Berhasil!</b></blockquote>

📦 Produk: ${escapeHTML(o.name)}
💰 Harga: Rp${toRupiah(o.amount)} (Fee Rp${o.fee})

Produk sedang dikirim...
Terimakasih sudah membeli produk ♥️`,
                { parse_mode: "html" }
            );

            try {
                if (o.qrMessageId) {
                    await ctx.telegram.deleteMessage(o.chatId, o.qrMessageId);
                }
            } catch (e) { }

            delete orders[userId];

            // ===== KIRIM SCRIPT =====
            if (o.type === "script") {
                await ctx.telegram.sendDocument(
                    o.chatId,
                    { source: o.file },
                    {
                        caption: `Script: ${escapeHTML(o.name)}`,
                        parse_mode: "html"
                    }
                );
            }

            // ===== BUAT PANEL =====
            if (o.type === "panel") {
                const ram = o.ram === "unli" ? "Unlimited" : `${o.ram}GB`;
                const username = o.username + randomNumber(3);

                let res = await createPanel(username, ram.toLowerCase());
                if (!res.success) {
                    const errorText = `
❌ Error! Terjadi kesalahan saat membuat panel.\nSilahkan hubungi admin @${config.ownerUsername}
`;

                    return ctx.telegram.sendMessage(o.chatId, errorText, {
                        parse_mode: "html",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "📞 Hubungi Admin",
                                        url: `https://t.me/${config.ownerUsername}`
                                    }
                                ]
                            ]
                        }
                    });
                }

                res = res.data;

                const teksPanel = `<blockquote><b>✅ Panel Pterodactyl Berhasil Dibuat!</b></blockquote>

👤 Username: <code>${escapeHTML(res.username)}</code>
🔑 Password: <code>${escapeHTML(res.password)}</code>
💾 RAM: ${ram}
🆔 Server ID: ${res.serverId}
📛 Server Name: ${escapeHTML(res.serverName)}
⏳ Expired: 1 Bulan

<blockquote><b>📌 Cara Login:</b></blockquote>
1. Klik tombol Login Panel di bawah
2. Masukkan username & password
3. Server siap dipakai!`;

                await ctx.telegram.sendMessage(o.chatId, teksPanel, {
                    parse_mode: "html",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🔗 Login Panel",
                                    url: res.panelUrl
                                }
                            ]
                        ]
                    }
                });
            }

            // ===== BUAT ADMIN PANEL =====
            if (o.type === "admin") {
                const username = o.username + randomNumber(3);

                let res;
                try {
                    res = await createAdmin(username);
                } catch (e) {
                    const errorText = `
❌ Error! Terjadi kesalahan saat membuat admin panel.\nSilahkan hubungi admin @${config.ownerUsername}
`;

                    return ctx.telegram.sendMessage(o.chatId, errorText, {
                        parse_mode: "html",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "📞 Hubungi Admin",
                                        url: `https://t.me/${config.ownerUsername}`
                                    }
                                ]
                            ]
                        }
                    });
                }

                const teksAdmin = `<blockquote><b>✅ Admin Panel Berhasil Dibuat!</b></blockquote>

🆔 User ID: ${res.id}
👤 Username: <code>${escapeHTML(res.username)}</code>
🔑 Password: <code>${escapeHTML(res.password)}</code>
⏳ Expired: 1 Bulan

<blockquote></b>📌 Cara Login:</b></blockquote>
1. Klik tombol Login Panel di bawah
2. Masukkan username & password
3. Admin panel siap digunakan!`;

                await ctx.telegram.sendMessage(o.chatId, teksAdmin, {
                    parse_mode: "html",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🔗 Login Panel",
                                    url: res.panel
                                }
                            ]
                        ]
                    }
                });
            }

            // ===== KIRIM APPS PREMIUM =====
            if (o.type === "app") {
                const stocks = loadStocks();
                if (stocks[o.category] && stocks[o.category][o.itemIndex]) {
                    const item = stocks[o.category][o.itemIndex];

                    const sentAccount = item.accounts.shift();
                    item.stock -= 1;

                    if (item.stock <= 0) {
                        stocks[o.category].splice(o.itemIndex, 1);
                        if (stocks[o.category].length === 0) {
                            delete stocks[o.category];
                        }
                    }

                    saveStocks(stocks);

                    const fileName = `${o.category}_${Date.now()}.txt`;
                    const fileContent = `=== DATA AKUN ${o.category.toUpperCase()} ===\n\n` +
                        `Produk: ${escapeHTML(o.name)}\n` +
                        `Keterangan: ${escapeHTML(o.description)}\n` +
                        `Harga: Rp${toRupiah(o.amount)}\n` +
                        `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
                        `=== DATA AKUN ===\n` +
                        `${escapeHTML(sentAccount)}\n\n` +
                        `=== INSTRUKSI ===\n` +
                        `1. Login dengan akun di atas\n` +
                        `2. Nikmati fitur premium\n` +
                        `3. Jangan bagikan akun ke orang lain\n` +
                        `4. Akun ini untuk personal use\n\n` +
                        `=== SUPPORT ===\n` +
                        `Jika ada masalah, hubungi: @${config.ownerUsername}`;

                    const tempFilePath = path.join(__dirname, 'temp', fileName);
                    const tempDir = path.join(__dirname, 'temp');

                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    fs.writeFileSync(tempFilePath, fileContent);

                    const appText = `<blockquote><b>✅ Apps Premium Berhasil Dibeli!</b></blockquote>

📱 Produk: ${escapeHTML(o.name)}
💰 Harga: Rp${toRupiah(o.amount)}

📁 Data akun telah dikirim dalam file .txt
📝 Silakan download file untuk melihat detail akun

<blockquote><b>📌 Cara Pakai:</b></blockquote>
1. Login dengan akun yang tersedia
2. Nikmati fitur premium
3. Jangan bagikan akun ke orang lain

⚠️ Note: Akun ini untuk personal use`;

                    try {
                        await ctx.telegram.sendMessage(o.chatId, appText, {
                            parse_mode: "html"
                        });

                        await ctx.telegram.sendDocument(o.chatId, {
                            source: tempFilePath,
                            filename: fileName
                        }, {
                            caption: `📁 File Data Akun: ${escapeHTML(o.name)}`,
                            parse_mode: "html"
                        });

                        setTimeout(() => {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                        }, 5000);

                    } catch (error) {
                        console.error("Error sending file:", error);
                        const fallbackText = `<b>✅ Apps Premium Berhasil Dibeli!</b>

📱 Produk: ${escapeHTML(o.name)}
💰 Harga: Rp${toRupiah(o.amount)}

<blockquote><b>🔑 Data Akun: </b></blockquote>
<code>${escapeHTML(sentAccount)}</code>

<blockquote><b>📌 Cara Pakai:</b></blockquote>
1. Login dengan akun di atas
2. Nikmati fitur premium
3. Jangan bagikan akun ke orang lain

⚠️ Note: Akun ini untuk personal use`;

                        await ctx.telegram.sendMessage(o.chatId, fallbackText, {
                            parse_mode: "html"
                        });
                    }
                }
            }

            // ===== KIRIM DIGITAL OCEAN ACCOUNT =====
            if (o.type === "do") {
                const doData = loadDO();
                if (doData[o.category] && doData[o.category][o.itemIndex]) {
                    const item = doData[o.category][o.itemIndex];

                    const sentAccount = item.accounts.shift();
                    item.stock -= 1;

                    if (item.stock <= 0) {
                        doData[o.category].splice(o.itemIndex, 1);
                        if (doData[o.category].length === 0) {
                            delete doData[o.category];
                        }
                    }

                    saveDO(doData);

                    const fileName = `DO_${o.category}_${Date.now()}.txt`;
                    const fileContent = `=== DATA AKUN DIGITAL OCEAN ===\n\n` +
                        `Produk: ${escapeHTML(o.name)}\n` +
                        `Keterangan: ${escapeHTML(o.description)}\n` +
                        `Harga: Rp${toRupiah(o.amount)}\n` +
                        `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
                        `=== DATA AKUN ===\n` +
                        `${escapeHTML(sentAccount)}\n\n` +
                        `=== INSTRUKSI ===\n` +
                        `1. Login ke https://cloud.digitalocean.com\n` +
                        `2. Gunakan akun di atas\n` +
                        `3. Nikmati credit yang tersedia\n` +
                        `4. Jangan bagikan akun ke orang lain\n\n` +
                        `=== SUPPORT ===\n` +
                        `Jika ada masalah, hubungi: @${config.ownerUsername}`;

                    const tempFilePath = path.join(__dirname, 'temp', fileName);
                    const tempDir = path.join(__dirname, 'temp');

                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    fs.writeFileSync(tempFilePath, fileContent);

                    const doText = `<blockquote><b>✅ Akun Digital Ocean Berhasil Dibeli!</b></blockquote>

🌊 Produk: ${escapeHTML(o.name)}
💰 Harga: Rp${toRupiah(o.amount)}

📁 Data akun telah dikirim dalam file .txt
📝 Silakan download file untuk melihat detail akun

<blockquote><b>📌 Cara Pakai:</b></blockquote>
1. Login ke https://cloud.digitalocean.com
2. Gunakan akun yang tersedia
3. Credit siap digunakan untuk membuat VPS/droplet

⚠️ Note: Akun ini untuk personal use`;

                    try {
                        await ctx.telegram.sendMessage(o.chatId, doText, {
                            parse_mode: "html"
                        });

                        await ctx.telegram.sendDocument(o.chatId, {
                            source: tempFilePath,
                            filename: fileName
                        }, {
                            caption: `🌊 File Data Akun Digital Ocean: ${escapeHTML(o.name)}`,
                            parse_mode: "html"
                        });

                        setTimeout(() => {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                        }, 5000);

                    } catch (error) {
                        console.error("Error sending file:", error);
                        const fallbackText = `</blockquote><b>✅ Akun Digital Ocean Berhasil Dibeli!</b><blockquote>

🌊 Produk: ${escapeHTML(o.name)}
💰 Harga: Rp${toRupiah(o.amount)}

<blockquote><b>🔑 Data Akun:</b> </blockquote>
<code>${escapeHTML(sentAccount)}</code>

<blockquote><b>📌 Cara Pakai:</b></blockquote>
1. Login ke https://cloud.digitalocean.com
2. Gunakan akun di atas
3. Credit siap digunakan untuk membuat VPS/droplet

⚠️ Note: Akun ini untuk personal use`;

                        await ctx.telegram.sendMessage(o.chatId, fallbackText, {
                            parse_mode: "html"
                        });
                    }
                }
            }

            // ===== BUAT VPS DIGITAL OCEAN SETELAH PEMBAYARAN =====
            if (o.type === "vps") {
                try {
                    if (!config.apiDigitalOcean) {
                        throw new Error("API Digital Ocean tidak dikonfigurasi");
                    }

                    const username = ctx.from.username || `user${ctx.from.id}`;
                    const hostname = `vps-${username}-${randomNumber(6)}`.toLowerCase().substring(0, 63);
                    const pw = generateStrongPassword();
                    const pws = pw
                    const password = pws

                    const processingMsg = await ctx.telegram.sendMessage(
                        o.chatId,
                        `🔄 *Membuat VPS Digital Ocean...*\n\n📊 *Spesifikasi:*\n• ${escapeHTML(o.spec.ramCpu.name)}\n• ${escapeHTML(o.spec.os.name)}\n• ${o.spec.region.flag} ${escapeHTML(o.spec.region.name)}\n\n⏳ Mohon tunggu 2-3 menit...`,
                        { parse_mode: "html" }
                    );

                    const dropletId = await createVPSDroplet(
                        config.apiDigitalOcean,
                        hostname,
                        o.specKey,
                        o.osKey,
                        o.regionKey,
                        password
                    );

                    await new Promise(resolve => setTimeout(resolve, 5000));

                    let ipAddress = "Sedang diprovisioning...";
                    let status = "creating";
                    let dropletInfo = null;

                    try {
                        dropletInfo = await getDropletInfo(config.apiDigitalOcean, dropletId);
                        status = dropletInfo.status || "active";

                        if (dropletInfo.networks && dropletInfo.networks.v4) {
                            const publicIP = dropletInfo.networks.v4.find(net => net.type === "public");
                            if (publicIP) {
                                ipAddress = publicIP.ip_address;
                            }
                        }
                    } catch (infoError) {
                        console.log("Info droplet belum tersedia:", infoError.message);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        try {
                            dropletInfo = await getDropletInfo(config.apiDigitalOcean, dropletId);
                            status = dropletInfo.status || "active";

                            if (dropletInfo.networks && dropletInfo.networks.v4) {
                                const publicIP = dropletInfo.networks.v4.find(net => net.type === "public");
                                if (publicIP) {
                                    ipAddress = publicIP.ip_address;
                                }
                            }
                        } catch (retryError) {
                            console.log("Masih belum bisa mendapatkan info:", retryError.message);
                        }
                    }

                    try {
                        await ctx.telegram.deleteMessage(o.chatId, processingMsg.message_id);
                    } catch (e) { }

                    const vpsText = `
<blockquote>✅ <b>VPS Digital Ocean Berhasil Dibuat!</b></blockquote>

<blockquote>🎯 <b>Detail Order:</b></blockquote>
├ Produk: ${escapeHTML(o.name)}
├ Harga: Rp${toRupiah(o.amount)}
└ Status: ${status === 'active' ? '✅ Active' : '🔄 Creating'}

<blockquote>📊 <b>Spesifikasi:</b></blockquote>
├ ${escapeHTML(o.spec.ramCpu.name)}
├ ${escapeHTML(o.spec.os.name)}
├ ${o.spec.region.flag} ${escapeHTML(o.spec.region.name)}
└ ${o.spec.region.latency}

<blockquote>🔧 <b>Informasi Server:</b></blockquote>
├ Server ID: <code>${dropletId}</code>
├ Hostname: <code>${hostname}</code>
├ IP Address: <code>${ipAddress}</code>
├ Username: <code>root</code>
└ Password: <code>${password}</code>

📌 <b>Cara Akses SSH:</b>
<code>ssh root@${ipAddress}</code>

Password: <code>${password}</code>
`;

                    await ctx.telegram.sendMessage(o.chatId, vpsText, {
                        parse_mode: "html",
                    });

                } catch (error) {
                    console.error("Error creating VPS:", error);

                    const errorText = `
❌ Error! Terjadi kesalahan saat membuat vps.\nSilahkan hubungi admin @${config.ownerUsername}
`;

                    await ctx.telegram.sendMessage(o.chatId, errorText, {
                        parse_mode: "html",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "📞 Hubungi Admin",
                                        url: `https://t.me/${config.ownerUsername}`
                                    }
                                ]
                            ]
                        }
                    });
                }
            }

        }, 15000);
    }

    // Fungsi untuk menjalankan broadcast
    async function startBroadcast(ctx, users, message, hasPhoto, photoFileId, statusMessageId) {
        const totalUsers = users.length;
        let successCount = 0;
        let failedCount = 0;
        const failedUsers = [];
        const startTime = Date.now();

        for (let i = 0; i < users.length; i++) {
            const userId = users[i].id;

            try {
                if (hasPhoto && photoFileId) {
                    await ctx.telegram.sendPhoto(userId, photoFileId, {
                        caption: message,
                        parse_mode: "html"
                    });
                } else {
                    await ctx.telegram.sendMessage(userId, message, {
                        parse_mode: "html"
                    });
                }
                successCount++;

            } catch (error) {
                console.error(`Gagal kirim ke user ${userId}:`, error.message);
                failedCount++;
                failedUsers.push(userId);
            }

            if ((i + 1) % 5 === 0 || i === users.length - 1) {
                try {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessageId,
                        null,
                        `🚀 *BROADCAST BERJALAN*\n\n` +
                        `📊 Total User: ${totalUsers}\n` +
                        `✅ Berhasil: ${successCount}\n` +
                        `❌ Gagal: ${failedCount}\n` +
                        `⏳ Progress: ${i + 1}/${totalUsers} (${Math.round((i + 1) / totalUsers * 100)}%)\n` +
                        `⏱️ Waktu: ${Math.floor((Date.now() - startTime) / 1000)} detik`,
                        { parse_mode: "html" }
                    );
                } catch (updateError) {
                    console.error("Gagal update progress:", updateError.message);
                }

                if (i < users.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        const duration = Math.floor((Date.now() - startTime) / 1000);

        const finalText = `✅ <b>BROADCAST SELESAI</b>\n\n` +
            `📊 Total User: ${totalUsers}\n` +
            `✅ Berhasil dikirim: ${successCount}\n` +
            `❌ Gagal dikirim: ${failedCount}\n` +
            `⏱️ Waktu eksekusi: ${duration} detik\n` +
            `📈 Success Rate: ${totalUsers > 0 ? Math.round((successCount / totalUsers) * 100) : 0}%\n\n` +
            (failedCount > 0 ?
                `⚠️ ${failedCount} user gagal menerima pesan\n` +
                `(Mungkin memblokir bot atau chat tidak ditemukan)` :
                `✨ Semua user berhasil menerima pesan!`);

        try {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                statusMessageId,
                null,
                finalText,
                { parse_mode: "html" }
            );
        } catch (error) {
            await ctx.reply(finalText, { parse_mode: "html" });
        }
    }

    // Handler untuk melihat profile user dari notifikasi owner
    bot.action(/view_profile\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const userId = ctx.match[1];
        const users = loadUsers();
        const user = users.find(u => u.id == userId);

        if (!user) {
            return ctx.editMessageText("❌ User tidak ditemukan dalam database.");
        }

        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = firstName + (lastName ? ' ' + lastName : '');
        const userUsername = user.username ? '@' + user.username : 'Tidak ada';

        let lastTransactions = '_Belum ada transaksi_';
        if (user.history && user.history.length > 0) {
            lastTransactions = user.history.slice(-5).reverse().map((t, i) => {
                const product = escapeHTML(t.product);
                const amount = toRupiah(t.amount);
                const date = new Date(t.timestamp).toLocaleDateString('id-ID');
                return `${i + 1}. ${product} - Rp${amount} (${date})`;
            }).join('\n');
        }

        const profileText = `*👤 Profile User (Owner View)*

*📛 Nama:* ${escapeHTML(fullName)}
*🆔 User ID: <code>${user.id}</code>
*📧 Username:* ${escapeHTML(userUsername)}
*📅 Join Date:* ${new Date(user.join_date).toLocaleDateString('id-ID')}
*💰 Total Spent:* Rp${toRupiah(user.total_spent || 0)}
*📊 Total Transaksi:* ${user.history ? user.history.length : 0}

*📋 Last 5 Transactions:*
${lastTransactions}`;

        const contactButton = {
            text: "📞 Hubungi User",
            url: user.username ? `https://t.me/${user.username}` : `tg://user?id=${user.id}`
        };

        return ctx.editMessageText(profileText, {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [contactButton],
                    [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_notification" }]
                ]
            }
        });
    });

    bot.action("back_to_notification", async (ctx) => {
        await ctx.answerCbQuery();
        return ctx.editMessageText("Kembali ke notifikasi...");
    });

    return bot;
};

// ===== HOT RELOAD =====
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    delete require.cache[file];
    require(file);
});