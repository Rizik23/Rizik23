require("./lib/myfunc.js");
const config = require("./config");
const { createAdmin, createPanel, createPayment, cekPaid, createVPSDroplet, getDropletInfo, vpsImages, vpsRegions, vpsSpecs, generateStrongPassword, getOSAdditionalCost, validateOSForRegion } = require("./lib/myfunc2.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const JsConfuser = require("js-confuser");
const prefix = config.prefix || ".";
const scriptDir = path.join(__dirname, "scripts");
const scriptDB = path.join(__dirname, "/db/scripts.json");
const userDB = path.join(__dirname, "/db/users.json");
const stockDB = path.join(__dirname, "/db/stocks.json");
const voucherDB = path.join(__dirname, "/db/vouchers.json");
const promptDir = path.join(__dirname, "prompts");
const promptDB = path.join(__dirname, "/db/prompts.json");
const hargaPanel = require("./price/panel.js");
const hargaAdminPanel = require("./price/adminpanel.js");
const vpsPackages = require("./price/vps.js");
const doDB = path.join(__dirname, "/db/digitalocean.json");
const ratingDB = path.join(__dirname, "/db/ratings.json");
const settingsDB = path.join(__dirname, "/db/settings.json");

// prosses all produk
const orders = {};
const pendingTopupOrder = {};
const topupTempOrder = {};
const pendingDeposit = {};
const pendingCsChat = {};
const activeMenus = {};
const pendingSmmRefillStatus = {};
const pendingSmmSearch = {}; 
const smmTempData = {};
const pendingSmmOrder = {}; 
const smmTempOrder = {};
const pendingSmmStatus = {};
const pendingSmmRefill = {};
const pendingDeleteAllSaldo = {};

// Inisialisasi database
if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir);
if (!fs.existsSync(ratingDB)) fs.writeFileSync(ratingDB, "[]");
if (!fs.existsSync(scriptDB)) fs.writeFileSync(scriptDB, "[]");
if (!fs.existsSync(userDB)) fs.writeFileSync(userDB, "[]");
if (!fs.existsSync(stockDB)) fs.writeFileSync(stockDB, "{}");
if (!fs.existsSync(doDB)) fs.writeFileSync(doDB, "{}");
if (!fs.existsSync(voucherDB)) fs.writeFileSync(voucherDB, "{}");
if (!fs.existsSync(promptDir)) fs.mkdirSync(promptDir);
if (!fs.existsSync(promptDB)) fs.writeFileSync(promptDB, "[]");
if (!fs.existsSync(settingsDB)) fs.writeFileSync(settingsDB, JSON.stringify({
    panel: true, admin: true, vps: true, do: true, app: true, 
    script: true, prompt: true, subdo: true, smm: true, topup: true
}, null, 2));

// Load database
const loadScripts = () => JSON.parse(fs.readFileSync(scriptDB));
const saveScripts = (d) => fs.writeFileSync(scriptDB, JSON.stringify(d, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(userDB));
const saveUsers = (d) => fs.writeFileSync(userDB, JSON.stringify(d, null, 2));
const loadStocks = () => JSON.parse(fs.readFileSync(stockDB));
const saveStocks = (d) => fs.writeFileSync(stockDB, JSON.stringify(d, null, 2));
const loadDO = () => JSON.parse(fs.readFileSync(doDB));
const saveDO = (d) => fs.writeFileSync(doDB, JSON.stringify(d, null, 2));
const loadVouchers = () => JSON.parse(fs.readFileSync(voucherDB));
const saveVouchers = (d) => fs.writeFileSync(voucherDB, JSON.stringify(d, null, 2));
const loadPrompts = () => JSON.parse(fs.readFileSync(promptDB));
const savePrompts = (d) => fs.writeFileSync(promptDB, JSON.stringify(d, null, 2));
const loadRatings = () => JSON.parse(fs.readFileSync(ratingDB));
const saveRatings = (d) => fs.writeFileSync(ratingDB, JSON.stringify(d, null, 2));
const loadSettings = () => JSON.parse(fs.readFileSync(settingsDB));
const saveSettings = (d) => fs.writeFileSync(settingsDB, JSON.stringify(d, null, 2));


// ===================== FUNGSI UTILITAS =====================

const USERS_PER_PAGE = 10;

// ===== HELPER ENCRYPT BOT =====
const createProgressBar = (percentage) => {
    const total = 10;
    const filled = Math.round((percentage / 100) * total);
    return "▰".repeat(filled) + "▱".repeat(total - filled);
};

async function updateProgress(ctx, message, percentage, status) {
    const bar = createProgressBar(percentage);
    const levelText = percentage === 100 ? "✅ Selesai" : `⚙️ ${status}`;
    try {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            message.message_id,
            null,
            "```css\n" +
            "🔒 EncryptBot\n" +
            ` ${levelText} (${percentage}%)\n` +
            ` ${bar}\n` +
            "```\n" +
            "PROSES ENCRYPT BY ELIKA",
            { parse_mode: "Markdown" }
        );
    } catch (error) {}
}

function encodeInvisible(text) {
    try {
        const compressedText = text.replace(/\s+/g, ' ').trim();
        const base64Text = Buffer.from(compressedText).toString('base64');
        return '\u200B' + base64Text; 
    } catch (e) {
        return Buffer.from(text).toString('base64'); 
    }
}

const getXObfuscationConfig = () => {
    const generateXName = () => "xZ" + crypto.randomBytes(3).toString("hex"); 
    return {
        target: "node",
        compact: true,
        renameVariables: true,
        renameGlobals: true,
        identifierGenerator: () => generateXName(),
        stringCompression: true,
        stringConcealing: true,
        stringEncoding: true,
        controlFlowFlattening: 1, // Max flattening
        flatten: true,
        shuffle: true,
        rgf: false, // Dimatikan agar tidak merusak fungsi async Node.js
        deadCode: 0.2, 
        opaquePredicates: true,
        dispatcher: true,
        globalConcealing: true,
        objectExtraction: true,
        duplicateLiteralsRemoval: true
        // lock (selfDefending/antiDebug) dimatikan supaya TIDAK ERROR saat di-run
    };
};


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

// ===== HELPER BACA WAKTU (HARI/BULAN/TAHUN) =====
function parseTimeToMs(angka, satuan) {
    const time = parseInt(angka);
    if (isNaN(time)) return 0;
    
    satuan = satuan.toLowerCase();
    if (satuan.includes('hari')) return time * 24 * 60 * 60 * 1000;
    if (satuan.includes('bulan')) return time * 30 * 24 * 60 * 60 * 1000;
    if (satuan.includes('tahun')) return time * 365 * 24 * 60 * 60 * 1000;
    return 0; 
}

// ===== HELPER CEK DISKON & NAMA KASTA =====
function getUserRole(user) {
    if (!user || !user.role || user.role === "unverified") {
        return { name: "Member 🐇", diskon: 0 };
    }
    
    // Cek kalau waktu VIP-nya udah abis (Expired), otomatis balik jadi gembel
    if (user.role_expired && Date.now() > user.role_expired) {
        return { name: "Belum Diverifikasi ❌ (Expired)", diskon: 0 };
    }

    if (user.role === "regular") return { name: "Regular ✅", diskon: 5 }; // Diskon 5%
    if (user.role === "vip") return { name: "VIP ✅", diskon: 15 };       // Diskon 15%
    if (user.role === "distributor") return { name: "Distributor ✅", diskon: 30 }; // Diskon 30%

    return { name: "Belum Diverifikasi ❌", diskon: 0 };
}

// ===== MESIN KALKULATOR DISKON =====
function getDiscountPrice(userId, basePrice) {
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const roleData = getUserRole(user);
    
    const diskonPersen = roleData.diskon; // Dapat 0, 5, 15, atau 30
    const potongan = Math.floor(basePrice * (diskonPersen / 100));
    const finalPrice = basePrice - potongan;
    
    return {
        roleName: roleData.name,
        diskonPersen: diskonPersen,
        potongan: potongan,
        finalPrice: finalPrice
    };
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

// ===== FUNGSI LIHAT SEMUA SALDO (OWNER) =====
async function sendSaldoPage(ctx, page = 0) {
    const users = loadUsers();
    if (!users || users.length === 0) {
        return ctx.reply("📭 Belum ada user terdaftar.");
    }

    // Urutkan user dari saldo terbanyak ke terkecil
    const sortedUsers = [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0));

    const USERS_PER_PAGE = 10;
    const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;

    // Hitung total uang/saldo yang berputar di bot
    const totalSaldoSystem = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    let text = `<blockquote><b>💰 DAFTAR SALDO SEMUA USER</b></blockquote>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 <b>Total Saldo Sistem:</b> Rp${totalSaldoSystem.toLocaleString('id-ID')}\n`;
    text += `👥 <b>Total User:</b> ${users.length}\n`;
    text += `📄 <b>Halaman:</b> ${page + 1} / ${totalPages}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    sortedUsers.slice(start, end).forEach((u, i) => {
        const fullName = (u.first_name || "") + (u.last_name ? " " + u.last_name : "");
        const username = u.username ? "@" + u.username : "-";
        
        text += `<b>${start + i + 1}. ${escapeHTML(fullName || "No Name")}</b>\n`;
        text += `🆔 <code>${u.id}</code> | 👤 ${escapeHTML(username)}\n`;
        text += `💳 <b>Saldo:</b> Rp${(u.balance || 0).toLocaleString('id-ID')}\n\n`;
    });

    const buttons = [];
    if (page > 0) {
        buttons.push({ text: "⬅️ Prev", callback_data: `saldopage_${page - 1}` });
    }
    if (page < totalPages - 1) {
        buttons.push({ text: "Next ➡️", callback_data: `saldopage_${page + 1}` });
    }

    const keyboard = { inline_keyboard: buttons.length > 0 ? [buttons] : [] };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } else {
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
}

// ===== MESIN HALAMAN KATALOG SCRIPT =====
async function renderScriptPage(ctx, page) {
    const scriptsList = loadScripts();
    if (!scriptsList.length) {
        return ctx.reply("📭 <i>Belum ada script yang dijual saat ini.</i>", { parse_mode: "HTML" }).catch(()=>{});
    }

    const ITEMS_PER_PAGE = 6;
    const totalItems = scriptsList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = scriptsList.slice(startIdx, endIdx);

    const buttons = currentItems.map(s => [
        {
            text: `🗂 ${escapeHTML(s.name)} - Rp${Number(s.price).toLocaleString("id-ID")}`,
            callback_data: `script|${s.name}`
        }
    ]);

    // Susun Tombol Navigasi (PREV - HALAMAN - NEXT)
    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `script_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `script_page|${page + 1}` });

    buttons.push(navRow);
    buttons.push([{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog" }]);

    const text = `<blockquote>📦 <b>KATALOG SCRIPT & SOURCE CODE</b></blockquote>\n\nTotal ada <b>${totalItems} Produk</b> di etalase kami.\nSilakan pilih script yang ingin dibeli:\n\n<i>*Gunakan tombol Prev/Next untuk melihat halaman lain.</i>`;

    // Eksekusi Tampilan (Anti-Error Beda Media & Anti-Spam Double Click)
    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        // 🔥 FIX: Abaikan error kalau cuma gara-gara user dobel klik (message is not modified)
        if (err.description && err.description.includes("message is not modified")) return;
        
        // Kalau tombol diklik dari menu yang ada gambarnya, hapus dulu baru kirim teks
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
    }
}

// ===== MESIN HALAMAN RATING (TESTIMONI) =====
async function renderRatingPage(ctx, page) {
    const ratings = loadRatings();
    
    // Kalau belum ada yang ngasih rating
    if (!ratings || ratings.length === 0) {
        const emptyText = `<blockquote><b>🌟 ULASAN PENGGUNA</b></blockquote>\n\n📭 <i>Belum ada rating/ulasan dari pengguna. Jadilah yang pertama dengan mengetik:</i>\n<code>${config.prefix}rating 5 Mantap botnya!</code>`;
        try {
            await ctx.editMessageMedia(
                { type: "photo", media: config.menuImage, caption: emptyText, parse_mode: "HTML" },
                { reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] } }
            );
        } catch (err) {
            if (err.description && err.description.includes("message is not modified")) return;
            await ctx.deleteMessage().catch(()=>{});
            await ctx.replyWithPhoto(config.menuImage, { caption: emptyText, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] } }).catch(()=>{});
        }
        return;
    }

    // Urutkan dari rating terbaru ke terlama
    const sortedRatings = [...ratings].sort((a, b) => new Date(b.date) - new Date(a.date));

    const ITEMS_PER_PAGE = 3; // Nampilin 3 Ulasan per halaman
    const totalPages = Math.ceil(sortedRatings.length / ITEMS_PER_PAGE);
    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = sortedRatings.slice(startIdx, endIdx);

    const totalStar = ratings.reduce((sum, r) => sum + r.star, 0);
    const avgStar = (totalStar / ratings.length).toFixed(1);

    let text = `<blockquote><b>🌟 ULASAN PENGGUNA (RATING)</b></blockquote>\n`;
    text += `📊 <b>Rata-rata:</b> ${avgStar} / 5.0 ⭐\n`;
    text += `👥 <b>Total Ulasan:</b> ${ratings.length} Pengguna\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 <b>Cara Memberi Ulasan:</b>\n`;
    text += `Ketik: <code>${config.prefix}rating [angka_bintang] [pesan_ulasan]</code>\n`;
    text += `Contoh: <code>${config.prefix}rating 5 Prosesnya cepet banget!</code>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    currentItems.forEach((r, i) => {
        const starDraw = "⭐".repeat(r.star);
        const dateStr = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        text += `👤 <b>${escapeHTML(r.name)}</b> ${r.username !== "-" ? `(@${r.username})` : ""}\n`;
        text += `🗓️ ${dateStr} | ${starDraw}\n`;
        text += `💬 <i>"${escapeHTML(r.text)}"</i>\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `rating_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `rating_page|${page + 1}` });

    const keyboard = { inline_keyboard: [navRow, [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] };

    // 🔥 Transisi Mulus pakai Gambar 🔥
    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" },
            { reply_markup: keyboard }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(()=>{});
        await ctx.replyWithPhoto(config.menuImage, { caption: text, parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
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

  const myUser = db.find(u => u.id === userId);
  const myRefs = myUser ? (myUser.referrals || 0) : 0;
  const saldo = myUser ? (myUser.balance || 0) : 0;
  
  const fullName = firstName + (lastName ? ' ' + lastName : '');
  const userUsername = ctx.from?.username ? '@' + ctx.from.username : 'Tidak ada';

  // 🔥 TANGKAP DATA KASTA USER 🔥
  const roleData = getUserRole(myUser);

  return `
<blockquote><b>🚀 AUTO ORDER KAELL</b></blockquote>
Halo 👋 Selamat datang di layanan transaksi otomatis 24/7 Jam Nonstop.
<blockquote><b>🔑 Status Akun: ${roleData.name}</b></blockquote>
<blockquote><b>🤖 Version Bot: 1.5</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>🪪 PROFILE KAMU</b></blockquote>
<b>🆔 User ID:</b> <code>${userId}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>💳 Saldo:</b> Rp${saldo.toLocaleString("id-ID")}
<b>👥 Refferal: </b>${myRefs} Orang
━━━━━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>📊 STATISTIK BOT</b></blockquote>
<b>🖥 Waktu Run:</b> ${runtime(process.uptime())}
<b>👥 Total User Bot:</b> ${totalUser}
<b>🛒 Total Transaksi:</b> ${totalTransaksi}
<b>💰 Total Pemasukan:</b> Rp${escapeHTML(totalPemasukan.toLocaleString("id-ID"))}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⊹ ࣪ ﹏𓊝﹏𓂁﹏⊹ ࣪ ˖⊹ ࣪ ﹏𓊝﹏𓂁﹏⊹ ࣪ ˖  🛸
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
};



const textOrder = (name, price, fee) => {
  const total = price + fee;

  return `
<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>
<blockquote>🧾 <b>Informasi Pesanan</b>
• Produk : ${escapeHTML(name)}
• Harga : Rp${toRupiah(price)}
• Biaya Layanan : Rp${toRupiah(fee)}
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

  // ===== FUNGSI CEK JOIN CHANNEL =====
async function isUserJoined(ctx) {
    if (!config.wajibJoinChannel) return true; // Kalau config kosong, anggap lolos
    try {
        const member = await ctx.telegram.getChatMember(config.wajibJoinChannel, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (e) {
        return false; // Kalau error (misal bot blm jadi admin), anggap belum join
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
      case "smm":
        productDetails = `📦 Layanan: ${escapeHTML(orderData.name)}\n🔗 Target: <code>${escapeHTML(orderData.target || orderData.qty)}</code>\n📈 Qty: ${orderData.qty || orderData.quantity}\n🧾 Order ID: ${orderData.orderId || "-"}`;
        break;
      case "prompt":
        productDetails = `📄 Prompt: ${escapeHTML(orderData.name)}\n📝 Deskripsi: ${escapeHTML(orderData.description || "-")}`;
        break;
      case "app":
        productDetails = `📱 Kategori: ${escapeHTML(orderData.category)}
📝 Deskripsi: ${escapeHTML(orderData.description || "-")}`;
        break;
        case "subdo": {
        // Sensor IP: Cuma nampilin angka depan (Contoh: 192.168.1.1 -> 192.***.***.***)
        const ipSplit = orderData.ip ? orderData.ip.split(".") : [];
        const maskedIp = ipSplit.length === 4 ? `${ipSplit[0]}.***.***.***` : "***.***.***.***";
        
        // Sensor Domain: Cuma sensor nama depannya aja (Contoh: zaynn.private.my.id -> ***.private.my.id)
        const domainSplit = orderData.name ? orderData.name.split(".") : [];
        let maskedDomain = orderData.name;
        if (domainSplit.length >= 2) {
            domainSplit[0] = "***"; // Mengubah array pertama (nama subdomain) jadi bintang
            maskedDomain = domainSplit.join(".");
        }

        productDetails = `🌐 Subdomain: ${escapeHTML(maskedDomain)}\n📌 Pointing IP: <code>${escapeHTML(maskedIp)}</code>`;
        break;
      }

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
<blockquote>━━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 Waktu: ${waktu}
📦 Produk: ${orderData.type === 'subdo' ? 'Jasa Create Subdomain' : escapeHTML(orderData.name)}
💰 Total: Rp${toRupiah(orderData.amount)}
👤 Buyer: ${buyerName}
🆔 User ID: <code>${buyerInfo.id}</code>
📱 Username: ${buyerInfo.username ? "@" + buyerUsername : "Tidak ada"}
━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
<blockquote>📋 Detail Produk:
${productDetails}
━━━━━━━━━━━━━━━</blockquote>
<blockquote>📊 Total Pembelian User: Rp${toRupiah(buyerInfo.totalSpent)}</blockquote>`.trim();

    const contactButton = {
      text: "📞 BELANJA PRODUK",
      url: `https://t.me/${config.botUsername}`
    };


    await ctx.telegram.sendMessage(config.channelId, notificationText, {
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


// ===== GLOBAL MIDDLEWARE: PAGAR DEPAN FORCE SUBSCRIBE =====
bot.use(async (ctx, next) => {
    // 1. Biarkan Owner bebas akses tanpa harus dicek
    if (ctx.from && String(ctx.from.id) === String(config.ownerId)) return next();

    // 2. Cek apakah fitur wajib join aktif di config
    if (config.wajibJoinChannel) {
        
        // Bolehkan eksekusi KHUSUS untuk tombol "Cek Verifikasi" itu sendiri
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cek_join') {
            return next();
        }

        const joined = await isUserJoined(ctx);
        
        // 3. JIKA BELUM JOIN, CEGAT SEMUA PERINTAH!
        if (!joined) {
            const chName = config.wajibJoinChannel.replace('@', '');
            const textPeringatan = `🛑 <b>AKSES DITOLAK!</b>\n━━━━━━━━━━━━━━━━━━━━━━━\nUntuk menggunakan bot ini (termasuk semua menu dan tombolnya), kamu <b>WAJIB</b> bergabung ke channel resmi kami terlebih dahulu.\n\n👇 <i>Klik tombol di bawah untuk join, lalu klik Cek Verifikasi.</i>`;
            
            const keyboard = {
                inline_keyboard: [
                    [{ text: '➡️ Join Channel Sekarang', url: `https://t.me/${chName}` }],
                    [{ text: '✅ Saya Sudah Join', callback_data: 'cek_join' }]
                ]
            };

            // Jika user nyoba ngeklik tombol/action lama
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('❌ Akses ditolak! Kamu harus join channel dulu!', { show_alert: true }).catch(() => {});
                try { await ctx.deleteMessage(); } catch(e){}
                return ctx.reply(textPeringatan, { parse_mode: 'HTML', reply_markup: keyboard });
            } 
            
            // Jika user nyoba ngetik teks/command kayak /buypanel, /start, dll
            if (ctx.message) {
                return ctx.reply(textPeringatan, { parse_mode: 'HTML', reply_markup: keyboard });
            }
            
            return; // Stop eksekusi di sini, bot bakal diam!
        }
    }
    
    // JIKA SUDAH JOIN, SILAKAN LANJUT KE PERINTAH ASLINYA
    return next(); 
});

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
  await ctx.answerCbQuery().catch(() => {});
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
  await ctx.answerCbQuery().catch(() => {});
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
  await ctx.answerCbQuery().catch(() => {});
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
  await ctx.answerCbQuery().catch(() => {});
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
  await ctx.answerCbQuery().catch(() => {});
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
  await ctx.answerCbQuery().catch(() => {});
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

    // ===== FUNGSI PROSES DEPOSIT =====
    async function processDeposit(ctx, amount, userId) {
        // 🔥 1. EFEK LOADING ESTETIK (Deteksi Tombol vs Teks Custom) 🔥
        let loadingMsg;
        if (ctx.callbackQuery) {
            await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Deposit...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        } else {
            loadingMsg = await ctx.reply("<blockquote><b>🔄 <i>Sedang membuat QRIS Deposit...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        }

        // ⏱️ KASIH DELAY 2 DETIK
        await new Promise(resolve => setTimeout(resolve, 2000));

        const fee = generateRandomFee();
        const price = amount + fee;

        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            const errMsg = `<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>.</i></blockquote>`;
            if (ctx.callbackQuery) {
                return ctx.editMessageText(errMsg, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } }).catch(()=>{});
            } else {
                if (loadingMsg) try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch(e){}
                return ctx.reply(errMsg, { parse_mode: "HTML" }).catch(()=>{});
            }
        }

        const paymentType = config.paymentGateway;

        try {
            const pay = await createPayment(paymentType, price, config);

            orders[userId] = {
                type: "deposit",
                name: `Deposit Saldo Rp${amount.toLocaleString('id-ID')}`,
                amount: price,
                depositAmount: amount,
                fee,
                orderId: pay.orderId || null,
                paymentType: paymentType,
                chatId: ctx.chat.id,
                expireAt: Date.now() + 6 * 60 * 1000
            };

            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            
            // 🔥 2. HAPUS LOADING & MUNCULKAN QRIS 🔥
            if (ctx.callbackQuery) {
                try { await ctx.deleteMessage(); } catch (e) {}
            } else {
                if (loadingMsg) try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch(e){}
            }

            const qrMsg = await ctx.replyWithPhoto(photo, {
                caption: textOrder(`Deposit Saldo`, amount, fee),
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]]
                }
            });

            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            const errorTxt = `❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti.`;
            if (ctx.callbackQuery) {
                await ctx.editMessageText(errorTxt, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
            } else {
                if (loadingMsg) try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch(e){}
                await ctx.reply(errorTxt, { parse_mode: "HTML" }).catch(()=>{});
            }
        }
    }


    // ===== MENU DEPOSIT (TOMBOL INTERAKTIF) =====
    bot.action("deposit_menu", async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 HAPUS GAMBAR DARI /HELP JIKA ADA 🔥
        if (global.helpPhotos && global.helpPhotos[ctx.from.id]) {
            try { await ctx.telegram.deleteMessage(ctx.chat.id, global.helpPhotos[ctx.from.id]); } catch (e) {}
            delete global.helpPhotos[ctx.from.id];
        }

        const depositButtons = [
            [
                { text: "Rp 5.000", callback_data: "deposit_pay|5000" },
                { text: "Rp 10.000", callback_data: "deposit_pay|10000" },
                { text: "Rp 15.000", callback_data: "deposit_pay|15000" }
            ],
            [
                { text: "Rp 20.000", callback_data: "deposit_pay|20000" },
                { text: "Rp 25.000", callback_data: "deposit_pay|25000" },
                { text: "Rp 30.000", callback_data: "deposit_pay|30000" }
            ],
            [
                { text: "✏️ Custom Deposit", callback_data: "deposit_custom" }
            ],
            [
                { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }
            ]
        ];

        const captionText = `<blockquote>💰 <b>Pilih Nominal Deposit</b>\n\nSilakan pilih nominal deposit yang ingin ditambahkan ke saldo Anda, atau klik <b>Custom Deposit</b> untuk memasukkan angka sendiri</blockquote>`;

        try {
            // Coba edit media kalau tombol diklik dari menu utama (yang ada fotonya)
            await ctx.editMessageMedia(
                { type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" },
                { reply_markup: { inline_keyboard: depositButtons } }
            );
        } catch (err) {
            // Kalau tombol diklik dari /help (teks biasa), hapus teksnya dan kirim gambar baru
            if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
                await ctx.deleteMessage().catch(() => {});
                await ctx.replyWithPhoto(config.menuImage, {
                    caption: captionText,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: depositButtons }
                }).catch(() => {});
            }
        }
    });



bot.action(/deposit_pay\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    // Kita hapus try { await ctx.deleteMessage(); } biar pesannya bisa di-edit sama efek Loading di atas
    const amount = parseInt(ctx.match[1]);
    return processDeposit(ctx, amount, ctx.from.id);
});


    // Handle tombol custom
    bot.action("deposit_custom", async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const userId = ctx.from.id;
        pendingDeposit[userId] = true; // Tandai bahwa user ini sedang mau ngetik nominal
        
        return ctx.editMessageCaption(
            `<blockquote>✏️ <b>Custom Deposit</b>\n\nSilakan balas pesan ini dengan mengetik <b>angka nominal</b> deposit yang Anda inginkan (contoh: <code>15000</code> atau <code>5.000</code>).\n\n<i>Minimal deposit Rp1.000</i></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(() => {});
    });


// ==========================================
// 🔥 FITUR TOP UP GAME & E-WALLET (ATLANTIC)
// ==========================================
// 1. MENU KATEGORI TOP UP
// 1. MENU KATEGORI TOP UP (Dengan Pengecekan API)
bot.action("menu_listharga", async (ctx) => {
  const settings = loadSettings();
    if (!settings.topup) {
        return ctx.answerCbQuery("🚫 Fitur Top Up & E-Wallet sedang OFFLINE / Maintenance.", { show_alert: true });
    }

    await ctx.answerCbQuery().catch(()=>{});
    const text = `<blockquote>🎮 <b>KATEGORI TOP UP & E-WALLET</b></blockquote>\n\nSilakan pilih kategori produk di bawah ini:`;
    const buttons = [
        [{ text: "🎮 Top Up Games", callback_data: "cat_games" }],
        [{ text: "💰 Saldo E-Wallet", callback_data: "cat_ewallet" }],
        [{ text: "🔙 Kembali", callback_data: "back_to_main_menu" }] // Sesuaikan callback menu utama
    ];

    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.menuImage || config.katalogImage, caption: text, parse_mode: "HTML" },
            { reply_markup: { inline_keyboard: buttons } }
        );
    } catch(e) {
        if (e.description && e.description.includes("message is not modified")) return;
        try { await ctx.deleteMessage(); } catch(err){}
        await ctx.replyWithPhoto(config.menuImage || config.katalogImage, { caption: text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    }
});


// 2. TAMPILIN SUB-KATEGORI (ML, FF, DANA, dll)
bot.action(/cat_(games|ewallet)/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const categoryKey = ctx.match[0]; 
    
    if (config.CATEGORY[categoryKey]) {
        const buttons = config.CATEGORY[categoryKey].map(p => ([
            { text: `${p[0]}`, callback_data: `product_${p[1]}` }
        ]));
        buttons.push([{ text: "🔙 Kembali", callback_data: "menu_listharga" }]);

        const text = `<blockquote>📦 <b>PILIH PRODUK</b></blockquote>\n\nSilakan pilih layanan yang ingin di order:`;
        await ctx.editMessageCaption(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    }
});

// 3. AMBIL DAFTAR HARGA DARI ATLANTIC API
bot.action(/product_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const command = ctx.match[1]; 
    await ctx.editMessageCaption(`<blockquote>⏳ <i>Sedang mengambil daftar harga dari server...</i></blockquote>`, { parse_mode: "HTML" }).catch(()=>{});

    const productInfo = config.PRODUCTS[command];
    if (!productInfo) return ctx.editMessageCaption("❌ Produk tidak ditemukan.", { reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "menu_listharga" }]] } }).catch(()=>{});

    try {
        const params = new URLSearchParams();
        params.append('api_key', config.ApikeyAtlantic);
        params.append('type', 'prabayar');

        const response = await axios.post(`${config.atlantic}/layanan/price_list`, params);
        if (!response.data.status) throw new Error("Gagal mengambil data dari server.");

        const filtered = response.data.data.filter(item => 
            item.provider?.toUpperCase().includes(productInfo.provider.toUpperCase()) && item.status === 'available'
        );

        if (filtered.length === 0) return ctx.editMessageCaption(`❌ Produk ${productInfo.provider} sedang kosong.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "menu_listharga" }]] } }).catch(()=>{});

        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));

        const untung = parseFloat(config.untungTopup) || 500;
        let text = `<blockquote>📋 <b>DAFTAR HARGA: ${productInfo.provider}</b></blockquote>\n\n`;
        const buttons = [];

        // Nampilin 10 Item teratas biar mulus
        const topItems = filtered.slice(0, 10);
        
        topItems.forEach(i => {
            const basePrice = parseFloat(i.price);
            const finalPrice = Math.ceil(basePrice + untung);
            text += `🛒 <b>${i.name}</b>\n💰 Harga: Rp${finalPrice.toLocaleString('id-ID')}\n\n`;
            buttons.push([{ text: `🛒 Beli: ${i.name}`, callback_data: `buy_topup|${command}|${i.code}|${finalPrice}` }]);
        });

        buttons.push([{ text: "🔙 Kembali", callback_data: `cat_${command === 'ml' || command === 'ff' || command === 'pubg' ? 'games' : 'ewallet'}` }]);

        await ctx.editMessageCaption(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        await ctx.editMessageCaption(`❌ Error: ${err.message}`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "menu_listharga" }]] } }).catch(()=>{});
    }
});

// 4. KLIK TOMBOL BELI
bot.action(/buy_topup\|(.+)\|(.+)\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const command = ctx.match[1];
    const code = ctx.match[2]; 
    const price = parseInt(ctx.match[3]); 
    const userId = ctx.from.id;

    pendingTopupOrder[userId] = { command, code, price };

    const msg = `<blockquote>📝 <b>MASUKKAN ID TARGET</b></blockquote>\n\nSilakan balas (reply) pesan ini atau ketik langsung <b>ID Game / Nomor Tujuan</b> kamu.\n\n<i>Contoh MLBB: 12345678 1234 (Pakai spasi)\nContoh DANA/FF: 08123456789</i>\n\nKetik <code>Batal</code> untuk membatalkan.`;
    await ctx.reply(msg, { parse_mode: "HTML" });
});

// 5. EKSEKUSI BAYAR PAKAI SALDO
bot.action("pay_saldo_topup", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const userId = ctx.from.id;
    const order = topupTempOrder[userId];
    if (!order) return ctx.editMessageText("❌ Sesi habis, silakan order ulang.").catch(()=>{});

    await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & memproses top up...</i></b></blockquote>", { parse_mode: "HTML" }).catch(()=>{});

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].balance = users[userIndex].balance || 0;

    if (users[userIndex].balance < order.price) {
        return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${users[userIndex].balance.toLocaleString('id-ID')}\nHarga Final: Rp${order.price.toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(()=>{});
    }

    try {
        const params = new URLSearchParams();
        params.append('api_key', config.ApikeyAtlantic);
        params.append('code', order.code);
        params.append('reff_id', "TP-" + Date.now());
        params.append('target', order.target);

        const res = await axios.post(`${config.atlantic}/transaksi/create`, params);
        if (!res.data.status) throw new Error(res.data.message);

        // Potong Saldo Bot jika sukses nembak API
        users[userIndex].balance -= order.price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + order.price;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: `TopUp: ${order.code}`, amount: order.price, type: "topup", details: `Target: ${order.target}`, timestamp: new Date().toISOString() });
        saveUsers(users);
        delete topupTempOrder[userId];

        await ctx.editMessageText(`<blockquote><b>✅ TOP UP BERHASIL DIPROSES!</b></blockquote>\n\n🎮 <b>Item:</b> ${order.code}\n🔗 <b>Target:</b> <code>${escapeHTML(order.target)}</code>\n🔖 <b>Reff ID:</b> <code>${res.data.data.id}</code>\n💰 <b>Harga:</b> Rp${order.price.toLocaleString('id-ID')}\n\n<i>Pesanan akan masuk dalam 1-3 menit!</i>`, { parse_mode: "HTML" }).catch(()=>{});

    } catch (err) {
        await ctx.editMessageText(`❌ <b>Gagal Order ke Server:</b>\n<code>${err.message}</code>\n\n<i>Saldo Anda tidak dipotong.</i>`, { parse_mode: "HTML" }).catch(()=>{});
    }
});

// 6. EKSEKUSI BAYAR PAKAI QRIS
bot.action("pay_qris_topup", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const userId = ctx.from.id;
    const order = topupTempOrder[userId];
    if (!order) return ctx.editMessageText("❌ Sesi habis, silakan order ulang.").catch(()=>{});

    await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Top Up...</i></b></blockquote>", { parse_mode: "HTML" }).catch(()=>{});

    const fee = Math.floor(Math.random() * 100); // Kode unik
    const price = order.price + fee;

    try {
        const pay = await createPayment(config.paymentGateway, price, config);
        if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS");

        orders[userId] = { 
            type: "topup", 
            code: order.code, 
            target: order.target,
            name: `TopUp ${order.code}`, 
            amount: price, 
            fee, 
            orderId: pay.orderId || null, 
            paymentType: config.paymentGateway, 
            chatId: ctx.chat.id, 
            expireAt: Date.now() + 6 * 60 * 1000 
        };

        const photo = config.paymentGateway === "pakasir" ? { source: pay.qris } : pay.qris;
        try { await ctx.deleteMessage(); } catch(e){}

        const captionStruk = `<blockquote><b>━〔 DETAIL QRIS TOP UP 〕━</b></blockquote>\n<blockquote>🧾 <b>Pesanan:</b> TopUp ${order.code}\n🔗 <b>Target:</b> ${order.target}\n💰 <b>Total Tagihan:</b> Rp${price.toLocaleString('id-ID')}</blockquote>\n\n<i>Bayar sesuai nominal. Top up akan otomatis masuk setelah dibayar!</i>`;

        const qrMsg = await ctx.replyWithPhoto(photo, { caption: captionStruk, parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } });
        orders[userId].qrMessageId = qrMsg.message_id;
        
        // Memulai pengecekan otomatis (Pastikan fungsi startCheck ada di bot lu)
        startCheck(userId, ctx);
    } catch (err) {
        await ctx.editMessageText(`❌ Error: ${err.message}`).catch(()=>{});
    }
});

// ===== MENU PENGATURAN FITUR (OWNER ONLY) =====
bot.action("admin_features", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Akses Ditolak! Khusus Owner.", { show_alert: true });

    const settings = loadSettings();
    const btn = (key, name) => ({
        text: settings[key] ? `🟢 ${name}` : `🔴 ${name}`,
        callback_data: `toggle_feature|${key}`
    });

    const buttons = [
        [btn('panel', 'Panel Biasa'), btn('admin', 'Admin Panel')],
        [btn('vps', 'VPS DO'), btn('do', 'Akun DO')],
        [btn('app', 'Apps Prem'), btn('script', 'Script')],
        [btn('prompt', 'Prompt AI'), btn('subdo', 'Subdomain')],
        [btn('smm', 'SMM Panel'), btn('topup', 'Top Up Game')],
        [{ text: "↩️ Kembali ke Katalog", callback_data: "katalog" }]
    ];

    let text = `<blockquote>⚙️ <b>CONTROL PANEL FITUR</b></blockquote>\n\n`;
    text += `Silakan klik tombol di bawah untuk Menyalakan (🟢) atau Mematikan (🔴) fitur di bot.\n\n`;
    text += `<i>*Jika dimatikan, user yang mengklik menu tersebut akan otomatis tertolak oleh sistem.</i>`;

    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.katalogImage, caption: text, parse_mode: "HTML" },
            { reply_markup: { inline_keyboard: buttons } }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(()=>{});
        await ctx.replyWithPhoto(config.katalogImage, { caption: text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    }
});

// ===== MESIN PENGUBAH ON / OFF =====
bot.action(/toggle_feature\|(.+)/, async (ctx) => {
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Khusus Owner!", { show_alert: true });
    
    const key = ctx.match[1];
    const settings = loadSettings();
    
    // Ubah statusnya (Kalau True jadi False, kalau False jadi True)
    settings[key] = !settings[key]; 
    saveSettings(settings);

    await ctx.answerCbQuery(`✅ Fitur ${key.toUpperCase()} berhasil diubah menjadi ${settings[key] ? "ON" : "OFF"}!`);
    
    // Refresh Halaman (Panggil fungsi menu-nya lagi biar tombolnya berubah warna)
    const btn = (k, name) => ({ text: settings[k] ? `🟢 ${name}` : `🔴 ${name}`, callback_data: `toggle_feature|${k}` });
    const buttons = [
        [btn('panel', 'Panel Biasa'), btn('admin', 'Admin Panel')],
        [btn('vps', 'VPS DO'), btn('do', 'Akun DO')],
        [btn('app', 'Apps Prem'), btn('script', 'Script')],
        [btn('prompt', 'Prompt AI'), btn('subdo', 'Subdomain')],
        [btn('smm', 'SMM Panel'), btn('topup', 'Top Up Game')],
        [{ text: "↩️ Kembali ke Katalog", callback_data: "katalog" }]
    ];
    await ctx.editMessageReplyMarkup({ inline_keyboard: buttons }).catch(()=>{});
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

        // ===== TANGKAP INPUT CUSTOM DEPOSIT =====
        if (pendingDeposit[fromId]) {
            delete pendingDeposit[fromId]; // Hapus status
            const amount = parseInt(body.replace(/[^0-9]/g, '')); // Ambil angkanya saja
            
            if (isNaN(amount) || amount < 1000) {
                return ctx.reply("❌ Nominal tidak valid. Minimal deposit adalah Rp1.000.\nSilakan klik tombol Custom Deposit kembali dari menu.");
            }
            return processDeposit(ctx, amount, fromId);
        }

        // ===== ADD USER & REFERRAL LOGIC =====
        if (fromId) {
            const users = loadUsers();
            const existingUser = users.find(u => u.id === fromId);
            
            if (!existingUser) {
                let inviterId = null;
                
                // Cek apakah mendaftar lewat link referral
                if (command === "start" && args[0] && args[0].startsWith("ref_")) {
                    inviterId = parseInt(args[0].split("_")[1]);
                }
                
                const userToAdd = {
                    id: fromId,
                    username: userName,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name || "",
                    join_date: new Date().toISOString(),
                    total_spent: 0,
                    history: [],
                    balance: 0,
                    referrals: 0, // Hitung teman yang diundang
                    ref_earnings: 0 // Hitung total pendapatan dari reff
                };
                
                users.push(userToAdd);
                
                // Berikan reward ke pengundang
                if (inviterId && inviterId !== fromId) {
                    const inviterIndex = users.findIndex(u => u.id === inviterId);
                    if (inviterIndex !== -1) {
                        const bonus = 1000; // Nominal bonus referral (Silakan diubah)
                        users[inviterIndex].balance = (users[inviterIndex].balance || 0) + bonus;
                        users[inviterIndex].referrals = (users[inviterIndex].referrals || 0) + 1;
                        users[inviterIndex].ref_earnings = (users[inviterIndex].ref_earnings || 0) + bonus;
                        
                        // Notif ke pengundang
                        ctx.telegram.sendMessage(inviterId, `🎉 <b>HORE!</b>\nSeseorang telah bergabung menggunakan link referral kamu!\n💰 Saldo kamu bertambah Rp${bonus.toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(() => {});
                    }
                }
                saveUsers(users);
            }
        }
        
        // 1. TANGKAP PENCARIAN LAYANAN
        if (pendingSmmSearch[fromId]) {
            delete pendingSmmSearch[fromId];
            const keyword = body.toLowerCase();
            const waitMsg = await ctx.reply("⏳ <i>Sedang mencari layanan...</i>", { parse_mode: "HTML" });

            try {
                const params = new URLSearchParams();
                params.append('api_id', config.smm.apiId);
                params.append('api_key', config.smm.apiKey);

                const res = await axios.post(`${config.smm.baseUrl}/services`, params);
                
                let rawData = res.data;
                if (typeof rawData === 'string') { try { rawData = JSON.parse(rawData); } catch(e){} }

                let services = [];
                // 🔥 X-RAY CEK STRUKTUR ASLI SERVER 🔥
                if (Array.isArray(rawData)) services = rawData;
                else if (rawData.data && Array.isArray(rawData.data)) services = rawData.data;
                else if (rawData.services && Array.isArray(rawData.services)) services = rawData.services;
                else {
                    // JIKA BUKAN DAFTAR LAYANAN, BONGKAR ISI ASLI PESAN SERVER:
                    throw new Error(`JAWABAN ASLI FAYUPEDIA:\n${JSON.stringify(rawData, null, 2)}`);
                }

                const filtered = services.filter(s => {
                    if (!s || typeof s !== 'object') return false;
                    const namaNya = s.name || s.nama || s.layanan || s.title || "";
                    const catNya = s.category || s.kategori || s.brand || "";
                    return String(namaNya).toLowerCase().includes(keyword) || String(catNya).toLowerCase().includes(keyword);
                });
                
                if (filtered.length === 0) return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Tidak ditemukan layanan: <b>${escapeHTML(keyword)}</b>`, { parse_mode: "HTML" });

                const topResults = filtered.slice(0, 10);
                smmTempData[fromId] = topResults;

                const buttons = topResults.map((s, index) => {
                    const basePrice = Number(s.rate || s.price || s.harga || 0);
                    const hargaMarkup = Math.ceil(basePrice * config.smm.profitMargin);
                    const namaNya = s.name || s.nama || s.layanan || "Layanan";
                    return [{ text: `${String(namaNya).substring(0, 35)}... | Rp${hargaMarkup.toLocaleString('id-ID')}`, callback_data: `smm_select|${index}` }];
                });
                buttons.push([{ text: "🔍 Cari Ulang", callback_data: "smm_search" }, { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "smm_menu" }]);

                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `<blockquote>✅ <b>Ditemukan ${filtered.length} Layanan</b></blockquote>\n\nMenampilkan 10 hasil teratas:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
            } catch (err) {
                const detailErr = err.response ? JSON.stringify(err.response.data) : err.message;
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ <b>DEBUG SERVER:</b>\n<code>${detailErr}</code>`, { parse_mode: "HTML" });
            }
            return;
        }


        // 2. TANGKAP INPUT TARGET & JUMLAH
        if (pendingSmmOrder[fromId]) {
            const orderState = pendingSmmOrder[fromId];
            
            if (orderState.step === "target") {
                orderState.target = body; 
                orderState.step = "quantity";
                return ctx.reply(`✅ Target disimpan: <code>${escapeHTML(body)}</code>\n\n👇 <b>Sekarang balas pesan ini dengan memasukkan JUMLAH (Quantity):</b>\n<i>(Min: ${orderState.service.min}, Max: ${orderState.service.max})</i>`, { parse_mode: "HTML" });
            }
            
            if (orderState.step === "quantity") {
                const quantity = parseInt(body.replace(/[^0-9]/g, '')); 
                const minQty = Number(orderState.service.min || 0);
                const maxQty = Number(orderState.service.max || 0);

                if (isNaN(quantity) || quantity < minQty || quantity > maxQty) {
                    return ctx.reply(`❌ Jumlah tidak valid! Masukkan angka antara ${minQty} sampai ${maxQty}.`);
                }
                
                delete pendingSmmOrder[fromId];
                
                // Kalkulasi harga awal
                const hargaAsli = Number(orderState.service.rate || orderState.service.price || orderState.service.harga || 0);
                const totalHargaAsli = (hargaAsli / 1000) * quantity;
                const hargaJual = Math.ceil(totalHargaAsli * config.smm.profitMargin);
                const namaNya = orderState.service.name || orderState.service.nama || orderState.service.layanan || "Layanan";
                
                // 🔥 MESIN DISKON SMM BEKERJA 🔥
                const harga = getDiscountPrice(fromId, hargaJual);

                // Simpan harga final (yang udah didiskon) ke sesi order
                smmTempOrder[fromId] = {
                    serviceId: orderState.service.service || orderState.service.id, 
                    serviceName: namaNya,
                    target: orderState.target,
                    quantity: quantity,
                    price: harga.finalPrice
                };
                
                let teksHarga = `💰 <b>Total Tagihan:</b> Rp${hargaJual.toLocaleString('id-ID')}`;
                if (harga.diskonPersen > 0) {
                    teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${hargaJual.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
                }

                const confirmText = `<blockquote>🛒 <b>KONFIRMASI ORDER SMM</b></blockquote>\n\n📦 <b>Layanan:</b> ${escapeHTML(namaNya)}\n🔗 <b>Target:</b> ${escapeHTML(orderState.target)}\n📈 <b>Jumlah:</b> ${quantity.toLocaleString('id-ID')}\n${teksHarga}\n\nPilih metode pembayaran di bawah ini:`;
                return ctx.reply(confirmText, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "💰 Bayar via Saldo", callback_data: `smm_pay_saldo` }], [{ text: "📷 Bayar via QRIS", callback_data: `smm_pay_qris` }], [{ text: "❌ Batal", callback_data: "smm_categories" }]] } });
            }
            return;
        }



        // 3. TANGKAP INPUT CEK STATUS
        if (pendingSmmStatus[fromId]) {
            delete pendingSmmStatus[fromId];
            // 🔥 FIX: Pakai 'body' bukan 'text' biar angka 1 kata kebaca!
            const orderId = body.replace(/[^0-9]/g, '');
            if (!orderId) return ctx.reply("❌ Order ID tidak valid!");

            const waitMsg = await ctx.reply("⏳ <i>Mengecek status pesanan...</i>", {parse_mode: "HTML"});
            try {
                const params = new URLSearchParams();
                params.append('api_id', config.smm.apiId);
                params.append('api_key', config.smm.apiKey);
                params.append('action', 'status'); // 🔥 Wajib standar SMM
                params.append('id', orderId);

                let res;
                try {
                    res = await axios.post(config.smm.baseUrl, params);
                } catch (e) {
                    res = await axios.post(`${config.smm.baseUrl}/status`, params);
                }

                const data = res.data.data ? res.data.data : res.data;
                if (data.error || res.data.status === false) throw new Error(data.error || "ID tidak ditemukan di server pusat");

                const statAsli = (data.status || data.order_status || "UNKNOWN").toString().toUpperCase();
                
                let ikonStatus = "⏳";
                if (statAsli === "SUCCESS" || statAsli === "COMPLETED") ikonStatus = "✅";
                if (statAsli === "ERROR" || statAsli === "CANCELED" || statAsli === "PARTIAL") ikonStatus = "❌";
                if (statAsli === "PROCESSING" || statAsli === "IN PROGRESS" || statAsli === "PENDING") ikonStatus = "🔄";

                // 🔥 INTELIJEN DATABASE: BIKIN UI MIRIP FAYUPEDIA 🔥
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                let layananTeks = "SMM Service";
                let targetTeks = "Tersembunyi (Privacy)";
                let qtyTeks = "-";

                if (user && user.history) {
                    const historyItem = user.history.find(h => h.type === "smm" && h.details && h.details.includes(`OrderID: ${orderId}`));
                    if (historyItem) {
                        layananTeks = historyItem.product.replace("SMM: ", "");
                        const matchTarget = historyItem.details.match(/Target:\s(.*?)\s\|/);
                        if (matchTarget) targetTeks = matchTarget[1];
                        const matchQty = historyItem.details.match(/Qty:\s(\d+)\s\|/);
                        if (matchQty) qtyTeks = matchQty[1];
                    }
                }

                const textStatus = `<blockquote><b>${ikonStatus} DETAIL PESANAN #${orderId}</b></blockquote>\n` +
                                   `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                   `📦 <b>Layanan:</b>\n${escapeHTML(layananTeks)}\n\n` +
                                   `🔗 <b>Target:</b>\n<code>${escapeHTML(targetTeks)}</code>\n\n` +
                                   `📈 <b>Jumlah Pesan:</b> ${qtyTeks}\n` +
                                   `📉 <b>Sisa (Remains):</b> ${data.remains || 0}\n` +
                                   `📊 <b>Jumlah Awal:</b> ${data.start_count || 0}\n` +
                                   `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                   `📌 <b>Status:</b> <b>${statAsli}</b>`;

                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, textStatus, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Ke Menu SMM", callback_data: "smm_menu" }]] } });
            } catch (err) {
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal mengecek status:\n<code>${err.message}</code>`, { parse_mode: "HTML" });
            }
            return;
        }

        // 4. TANGKAP INPUT REFILL
        if (pendingSmmRefill[fromId]) {
            delete pendingSmmRefill[fromId];
            // 🔥 FIX: Pakai 'body' bukan 'text'
            const orderId = body.replace(/[^0-9]/g, '');
            if (!orderId) return ctx.reply("❌ Order ID tidak valid!");

            const waitMsg = await ctx.reply("⏳ <i>Mengirim permintaan refill...</i>", {parse_mode: "HTML"});
            try {
                const params = new URLSearchParams();
                params.append('api_id', config.smm.apiId);
                params.append('api_key', config.smm.apiKey);
                params.append('id', orderId);

                const res = await axios.post(`${config.smm.baseUrl}/refill`, params);
                if (res.data.error) throw new Error(res.data.error);

                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `<blockquote>🔄 <b>PERMINTAAN REFILL SUKSES</b></blockquote>\n\n🧾 <b>Order ID:</b> <code>${orderId}</code>\n🔖 <b>Refill ID:</b> <code>${res.data.refill || "-"}</code>\n✅ Permintaan refill telah diteruskan.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Ke Menu SMM", callback_data: "smm_menu" }]] } });
            } catch (err) {
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal request refill:\n<code>${err.message}</code>`, { parse_mode: "HTML" });
            }
            return;
        }
        
                // ===== TANGKAP INPUT ID TOP UP GAME =====
        if (pendingTopupOrder[fromId]) {
            const state = pendingTopupOrder[fromId];
            if (body.toLowerCase() === "batal") {
                delete pendingTopupOrder[fromId];
                return ctx.reply("✅ <b>Top Up dibatalkan.</b>", { parse_mode: "HTML" });
            }

            const targetId = body; // Target ID Game & Zone dari user
            delete pendingTopupOrder[fromId];

            // Simpan ke Sesi Sementara buat dibayar
            topupTempOrder[fromId] = {
                code: state.code,
                target: targetId,
                price: state.price
            };

            const confirmText = `<blockquote>🛒 <b>KONFIRMASI TOP UP</b></blockquote>\n\n📦 <b>Kode Item:</b> ${state.code}\n🔗 <b>ID Target:</b> <code>${escapeHTML(targetId)}</code>\n💰 <b>Harga Final:</b> Rp${state.price.toLocaleString('id-ID')}\n\nPilih metode pembayaran di bawah ini:`;
            
            return ctx.reply(confirmText, { 
                parse_mode: "HTML", 
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo`, callback_data: `pay_saldo_topup` }], 
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_topup` }], 
                        [{ text: "❌ Batal", callback_data: "cancel_order" }]
                    ] 
                } 
            });
        }



        
                // ===== TANGKAP KONFIRMASI DELETE ALL SALDO =====
        if (pendingDeleteAllSaldo[fromId]) {
            const jawaban = body.toLowerCase();
            
            if (jawaban === "batal") {
                delete pendingDeleteAllSaldo[fromId]; // Hapus state
                return ctx.reply("✅ <b>Tindakan Dibatalkan.</b>\nSaldo semua user aman dan tidak dihapus.", { parse_mode: "HTML" });
            } 
            
            if (jawaban === "oke") {
                delete pendingDeleteAllSaldo[fromId]; // Hapus state
                
                const users = loadUsers();
                let totalSaldoDihapus = 0;
                let totalUserDireset = 0;

                // Eksekusi penghapusan saldo
                for (let i = 0; i < users.length; i++) {
                    if (users[i].balance > 0) {
                        totalSaldoDihapus += users[i].balance;
                        users[i].balance = 0;
                        totalUserDireset++;
                    }
                }
                saveUsers(users);

                const resetText = `
<blockquote><b>✅ SEMUA SALDO USER BERHASIL DIHAPUS!</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━━
Proses <i>reset</i> saldo (Sapu Jagat) telah selesai dilakukan.

📊 <b>Statistik Reset:</b>
👥 Total User Direset: <b>${totalUserDireset} Orang</b>
💰 Total Saldo Dihanguskan: <b>Rp${totalSaldoDihapus.toLocaleString('id-ID')}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
                return ctx.reply(resetText, { parse_mode: "HTML" });
            }
            
            // Kalau balasannya bukan oke/batal
            return ctx.reply("❌ <b>Input tidak valid.</b>\n👇 Balas dengan mengetik <code>oke</code> untuk lanjut, atau <code>batal</code> untuk membatalkan.", { parse_mode: "HTML" });
        }
        
        // ===== TANGKAP BALASAN OWNER KE USER =====
        if (isOwner(ctx) && ctx.message.reply_to_message) {
            const repMsg = ctx.message.reply_to_message;
            let targetId = null;

            // 1. Cek dari memory mapping (jika owner me-reply pesan hasil Forward)
            if (global.csHistory && global.csHistory[repMsg.message_id]) {
                targetId = global.csHistory[repMsg.message_id];
            } 
            // 2. Cek dari text fallback (jika owner me-reply pesan info ID)
            else if (repMsg.text) {
                const match = repMsg.text.match(/ID:\s*(\d+)/);
                if (match) targetId = match[1];
            }

            if (targetId) {
                // 🔥 FIX: Pakai 'body' bukan 'text' biar kata pertama gak kepotong / kosong! 🔥
                ctx.telegram.sendMessage(targetId, `👨‍💻 <b>Balasan dari Admin:</b>\n\n${escapeHTML(body)}`, { parse_mode: "HTML" })
                    .then(() => ctx.reply("✅ Balasan berhasil dikirim ke user."))
                    .catch(() => ctx.reply("❌ Gagal mengirim balasan. User mungkin telah memblokir bot."));
                return; // Stop di sini biar gak kebaca sbg command lain
            }
        }

        // ===== TANGKAP CHAT DARI USER KE CS (OWNER) =====
        if (pendingCsChat[fromId]) {
            global.csHistory = global.csHistory || {}; // Bikin memori penampung
            
            try {
                // 1. Teruskan (Forward) pesan asli dari user biar owner bisa klik profilnya
                const fwdMsg = await ctx.telegram.forwardMessage(config.ownerId, ctx.chat.id, ctx.message.message_id);
                global.csHistory[fwdMsg.message_id] = fromId; // Simpan ID user ke memori bot

                // 2. Kirim pesan info tambahan (buat jaga-jaga kalau user setting privasinya di-hide)
                const infoMsg = await ctx.telegram.sendMessage(config.ownerId, `☝️ <b>Tiket Bantuan (CS)</b>\n👤 Dari: ${escapeHTML(ctx.from.first_name)}\n🆔 ID: <code>${fromId}</code>\n\n<i>*Silakan Reply (Balas) pesan yang diteruskan di atas, atau balas pesan ini untuk menjawab user.</i>`, { parse_mode: "HTML" });
                global.csHistory[infoMsg.message_id] = fromId;

                ctx.reply("✅ <i>Pesan berhasil dikirim ke Admin. Mohon tunggu balasannya...</i>", { parse_mode: "HTML" });
            } catch (err) {
                ctx.reply("❌ <i>Gagal mengirim pesan ke Admin.</i>", { parse_mode: "HTML" });
            }
            return; // Stop di sini
        }
        
                // 5. TANGKAP INPUT CEK STATUS REFILL
        if (pendingSmmRefillStatus[fromId]) {
            delete pendingSmmRefillStatus[fromId];
            const refillId = body.replace(/[^0-9]/g, '');
            if (!refillId) return ctx.reply("❌ Refill ID tidak valid!");

            const waitMsg = await ctx.reply("⏳ <i>Mengecek status refill...</i>", {parse_mode: "HTML"});
            try {
                const params = new URLSearchParams();
                params.append('api_id', config.smm.apiId);
                params.append('api_key', config.smm.apiKey);
                params.append('id', refillId); // Sesuai dokumentasi PHP lu pakai ID Refill

                const res = await axios.post(`${config.smm.baseUrl}/refill/status`, params);
                
                let rawData = res.data;
                if (typeof rawData === 'string') { try { rawData = JSON.parse(rawData); } catch(e){} }
                if (rawData.error) throw new Error(rawData.error);

                const data = rawData.data || rawData;
                const statusText = data.refill_status || data.status || "Unknown";

                const msg = `<blockquote>🔄 <b>STATUS REFILL SMM</b></blockquote>\n\n🔖 <b>Refill ID:</b> <code>${refillId}</code>\n📊 <b>Status:</b> ${statusText}\n\n<i>*Mohon tunggu, proses refill biasanya memakan waktu 1-3 hari.</i>`;
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, msg, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Ke Menu SMM", callback_data: "smm_menu" }]] } });
            } catch (err) {
                const detailErr = err.response ? JSON.stringify(err.response.data) : err.message;
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal mengecek status refill:\n<code>${detailErr}</code>`, { parse_mode: "HTML" });
            }
            return;
        }





        switch (command) {
// ===== MENU / START =====
case "menu":
case "start": {

    // ---> LOGIKA DEEP LINK REDEEM VOUCHER <---
    if (args[0] && args[0].startsWith("redeem_")) {
        const kode = args[0].replace("redeem_", "").toUpperCase();
        const vouchers = loadVouchers();

        if (!vouchers[kode])
            return ctx.reply("❌ Kode voucher tidak ditemukan atau salah.");

        const voucher = vouchers[kode];

        if (voucher.kuota <= 0)
            return ctx.reply("❌ Maaf, kuota voucher ini sudah habis.");

        if (voucher.claimedBy.includes(fromId))
            return ctx.reply("❌ Kamu sudah pernah klaim voucher ini!");

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === fromId);

        if (userIndex === -1)
            return ctx.reply("❌ Error: User tidak ditemukan.");

        // Tambah saldo & kurangi kuota
        users[userIndex].balance =
            (users[userIndex].balance || 0) + voucher.nominal;

        voucher.kuota -= 1;
        voucher.claimedBy.push(fromId);

        saveUsers(users);
        saveVouchers(vouchers);

        return ctx.reply(
            `🎉 <b>SELAMAT!</b>\n\n` +
            `Kamu berhasil menukarkan kode voucher <code>${kode}</code> dari link!\n` +
            `💰 Saldo bertambah Rp${voucher.nominal.toLocaleString('id-ID')}\n` +
            `💳 Saldo sekarang: Rp${users[userIndex].balance.toLocaleString('id-ID')}`,
            { parse_mode: "HTML" }
        );
    }

    // Tampilkan Menu Utama Default
    return ctx.replyWithPhoto(config.menuImage, {
        caption: menuTextBot(ctx),
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🛍️ Katalog Produk", callback_data: "katalog" }
                ],
                [
                    { text: "💳 Deposit Saldo", callback_data: "deposit_menu" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating" }
                ],
                [
                    { text: "👤 Informasi", callback_data: "informasi_admin" },
                    { text: "⭐ Developer ", callback_data: "sosmed_admin" }
                ],
                [
                   { text: "🎧 CS / Tiket Bantuan", callback_data: "cs_ai_start" }
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

// ===== FITUR VOUCHER & REFFERAL =====
case "addvoucher": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (args.length < 3) return ctx.reply(`Format: ${config.prefix}addvoucher [kode] [nominal] [kuota]\nContoh: ${config.prefix}addvoucher PROMO10K 10000 50`);
    
    const kode = args[0].toUpperCase();
    const nominal = parseInt(args[1]);
    const kuota = parseInt(args[2]);
    
    if (isNaN(nominal) || isNaN(kuota)) return ctx.reply("❌ Nominal dan kuota harus berupa angka!");
    
    const vouchers = loadVouchers();
    if (vouchers[kode]) return ctx.reply("❌ Kode voucher ini sudah ada di database!");

    vouchers[kode] = { 
        nominal, 
        kuota, 
        claimedBy: [], 
        created_at: new Date().toISOString() 
    };
    saveVouchers(vouchers);
    
    return ctx.reply(`✅ <b>Voucher Berhasil Dibuat!</b>\n\n🎟 Kode: <code>${kode}</code>\n💰 Nominal: Rp${nominal.toLocaleString('id-ID')}\n👥 Kuota: ${kuota} orang`, { parse_mode: "HTML" });
}

case "redeem": {
    if (args.length < 1) return ctx.reply(`Ketik kode vouchernya bos!\nContoh: ${config.prefix}redeem KODE`);
    const kode = args[0].toUpperCase();
    
    const vouchers = loadVouchers();
    if (!vouchers[kode]) return ctx.reply("❌ Kode voucher tidak ditemukan atau salah.");
    
    const voucher = vouchers[kode];
    if (voucher.kuota <= 0) return ctx.reply("❌ Maaf, kuota voucher ini sudah habis.");
    if (voucher.claimedBy.includes(fromId)) return ctx.reply("❌ Kamu sudah pernah klaim voucher ini!");
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === fromId);
    if (userIndex === -1) return ctx.reply("❌ Error: User tidak ditemukan."); 
    
    // Tambah saldo & kurangi kuota
    users[userIndex].balance = (users[userIndex].balance || 0) + voucher.nominal;
    voucher.kuota -= 1;
    voucher.claimedBy.push(fromId);
    
    saveUsers(users);
    saveVouchers(vouchers);
    
    return ctx.reply(`🎉 <b>SELAMAT!</b>\n\nKamu berhasil menukarkan kode voucher <code>${kode}</code>.\n💰 Saldo bertambah Rp${voucher.nominal.toLocaleString('id-ID')}\n💳 Saldo sekarang: Rp${users[userIndex].balance.toLocaleString('id-ID')}`, { parse_mode: "HTML" });
}

// ===== FITUR UPGRADE KASTA USER =====
case "addregular":
case "addvip":
case "adddistro":
case "adddistributor": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    const targetId = args[0];
    const angka = args[1];
    const satuan = args[2];
    
    if (!targetId || !angka || !satuan) {
        return ctx.reply(`❌ Format salah!\nContoh: ${config.prefix}${command} 1402991119 30 hari\nSatuan yang didukung: hari, bulan, tahun`);
    }

    const durationMs = parseTimeToMs(angka, satuan);
    if (durationMs === 0) return ctx.reply("❌ Format waktu tidak valid! Gunakan: hari / bulan / tahun");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    let roleName = "Regular";
    let roleKey = "regular";
    if (command.includes("vip")) { roleName = "VIP"; roleKey = "vip"; }
    if (command.includes("distro") || command.includes("distributor")) { roleName = "Distributor"; roleKey = "distributor"; }

    users[userIndex].role = roleKey;
    users[userIndex].role_expired = Date.now() + durationMs;
    saveUsers(users);

    const expDate = new Date(users[userIndex].role_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    ctx.reply(`✅ <b>Berhasil Upgrade Akun!</b>\n\n🆔 ID: <code>${targetId}</code>\n🔰 Pangkat: <b>${roleName} ✅</b>\n⏳ Expired: ${expDate}`, { parse_mode: "HTML" });
    
    // Kirim notifikasi otomatis ke target
    ctx.telegram.sendMessage(targetId, `🎉 <b>SELAMAT! AKUN KAMU TELAH DI-UPGRADE!</b>\n\n🔰 Pangkat Baru: <b>${roleName} ✅</b>\n⏳ Berlaku Sampai: ${expDate}\n\n<i>Nikmati diskon eksklusif untuk setiap transaksi layanan di bot kami!</i>`, { parse_mode: "HTML" }).catch(()=>{});
    break;
}

// ===== COMMAND GANTI FILE (REMOTE UPDATE) =====
case "ganti": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    const targetPath = args[0];
    if (!targetPath) {
        return ctx.reply(`❌ <b>Format salah!</b>\n\nCara pakai: Reply/balas file yang ingin diupload, lalu ketik:\n<code>${config.prefix}ganti [lokasi_file]</code>\n\nContoh:\n<code>${config.prefix}ganti db/users.json</code>\n<code>${config.prefix}ganti config.js</code>`, { parse_mode: "HTML" });
    }

    // Keamanan 1: Cegah akses keluar folder (Directory Traversal Attack)
    if (targetPath.includes("..")) {
        return ctx.reply("❌ Jalur tidak valid! Dilarang menggunakan '..'");
    }

    // Keamanan 2: Cegah ganti file krusial sistem
    const forbiddenFiles = ["index.js", "package.json", "package-lock.json", ".env"];
    if (forbiddenFiles.includes(targetPath.toLowerCase())) {
        return ctx.reply(`❌ <b>DITOLAK!</b>\nFile <code>${targetPath}</code> adalah file inti sistem dan tidak boleh diganti dari Telegram demi keamanan.`, { parse_mode: "HTML" });
    }

    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg || !replyMsg.document) {
        return ctx.reply("❌ Kamu harus me-reply (membalas) sebuah file Document yang akan diupload!");
    }

    const doc = replyMsg.document;
    const waitMsg = await ctx.reply(`⏳ <i>Sedang mengunduh dan menimpa file <b>${targetPath}</b>...</i>`, { parse_mode: "HTML" });

    try {
        // Proses Download File dari Telegram
        const link = await ctx.telegram.getFileLink(doc.file_id);
        const res = await axios.get(link.href, { responseType: "arraybuffer" });
        
        // Tentukan path absolut di server
        const savePath = path.resolve(__dirname, targetPath);

        // Cek apakah foldernya ada, kalau belum bot akan otomatis bikin foldernya
        const dirName = path.dirname(savePath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        // Timpa filenya!
        fs.writeFileSync(savePath, res.data);

        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, `✅ <b>FILE BERHASIL DITIMPA!</b>\n\nFile <code>${targetPath}</code> telah diperbarui.\n\n🔄 <i>Bot akan melakukan Restart Otomatis dalam 3 detik untuk menerapkan perubahan...</i>`, { parse_mode: "HTML" });
        
        // Restart otomatis mesin Node.js (Railway / Pterodactyl akan otomatis nge-start ulang)
        setTimeout(() => {
            process.exit(1); 
        }, 3000);

    } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, `❌ <b>Gagal mengganti file:</b>\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
    break;
}


// ===== FITUR CABUT PANGKAT USER =====
case "delrole":
case "delvip":
case "delregular":
case "deldistro": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    const targetId = args[0];
    if (!targetId) return ctx.reply(`❌ Format salah!\nContoh: ${config.prefix}delrole 1402991119`);

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    users[userIndex].role = "unverified";
    users[userIndex].role_expired = null;
    saveUsers(users);

    ctx.reply(`✅ <b>Pangkat Berhasil Dicabut!</b>\nAkun <code>${targetId}</code> telah kembali menjadi Belum Diverifikasi ❌.`, { parse_mode: "HTML" });
    
    // Kasih tau orangnya kalau pangkatnya udah dicabut
    ctx.telegram.sendMessage(targetId, `⚠️ <b>INFORMASI AKUN</b>\n\nMasa aktif pangkat kamu telah berakhir atau dicabut oleh Admin. Akun kamu kembali menjadi <b>Belum Diverifikasi ❌</b>. Harga produk kembali normal.`, { parse_mode: "HTML" }).catch(()=>{});
    break;
}


case "ref":
case "referral": {
    const botUser = await ctx.telegram.getMe();
    const refLink = `https://t.me/${botUser.username}?start=ref_${fromId}`;
    
    const users = loadUsers();
    const myUser = users.find(u => u.id === fromId);
    const myRefs = myUser.referrals || 0;
    const myEarnings = myUser.ref_earnings || 0;
    
    const text = `🤝 <b>SISTEM REFERRAL</b>\n\nAjak temanmu menggunakan bot ini dan dapatkan saldo gratis <b>Rp1.000</b> untuk setiap teman yang mendaftar dan menekan /start melalui link kamu!\n\n🔗 <b>Link Referral Kamu:</b>\n<code>${refLink}</code>\n\n📊 <b>Statistik Kamu:</b>\n👥 Teman diundang: ${myRefs} orang\n💰 Total bonus didapat: Rp${myEarnings.toLocaleString('id-ID')}`;
    
    return ctx.reply(text, { parse_mode: "HTML", disable_web_page_preview: true });
}

// ===== DOWNLOAD DATABASE DARI SERVER =====
case "getdb": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");
    
    await ctx.reply("⏳ <i>Sedang mengambil file database dari server...</i>", { parse_mode: "HTML" });
    
    try {
        const filesToSent = [
            { path: "./db/users.json", name: "users.json" },
            { path: "./db/stocks.json", name: "stocks.json" },
            { path: "./db/digitalocean.json", name: "digitalocean.json" },
            { path: "./db/prompts.json", name: "prompts.json" },
            { path: "./db/ratings.json", name: "ratings.json" }
        ];

        for (let file of filesToSent) {
            if (fs.existsSync(file.path)) {
                await ctx.telegram.sendDocument(ctx.chat.id, 
                    { source: file.path, filename: file.name }, 
                    { caption: `📂 Database: ${file.name}` }
                );
            }
        }
        return ctx.reply("✅ <b>Semua database berhasil di-backup!</b>\n\n<i>Silakan timpa file ini ke folder lokal/GitHub kamu sebelum melakukan update (push).</i>", { parse_mode: "HTML" });
    } catch (err) {
        return ctx.reply(`❌ Gagal mengambil database: ${err.message}`);
    }
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
━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>👤 Nama Depan:</b> <code>${escapeHTML(firstName)}</code>
<b>👥 Nama Belakang:</b> <code>${escapeHTML(lastName)}</code>
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ===== ADD PROMPT =====
case "addprompt": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (!ctx.message.reply_to_message?.document)
        return ctx.reply(`Reply file TXT dengan:\n${escapeHTML(config.prefix)}addprompt nama|deskripsi|harga`, { parse_mode: "HTML" });

    const doc = ctx.message.reply_to_message.document;
    if (!doc.file_name.endsWith(".txt")) return ctx.reply("❌ Harus file .txt bro!");

    if (!text.includes("|")) return ctx.reply(`Format: ${escapeHTML(config.prefix)}addprompt nama|deskripsi|harga`, { parse_mode: "HTML" });
    const [name, desk, price] = text.split("|").map(v => v.trim());
    if (!name || isNaN(price) || !desk) return ctx.reply("❌ Data tidak valid.");

    const prompts = loadPrompts();
    if (prompts.find(s => s.name.toLowerCase() === name.toLowerCase()))
        return ctx.reply("❌ Prompt dengan nama ini sudah ada.");

    const link = await ctx.telegram.getFileLink(doc.file_id);
    const res = await axios.get(link.href, { responseType: "arraybuffer" });
    const savePath = path.join(promptDir, doc.file_name);
    fs.writeFileSync(savePath, res.data);

    prompts.push({ name, desk, price: Number(price), file: `prompts/${doc.file_name}`, added_date: new Date().toISOString() });
    savePrompts(prompts);

    await ctx.reply(`✅ Prompt ${escapeHTML(name)} berhasil ditambahkan.`, { parse_mode: "HTML" });
    return broadcastNewProduct(ctx, "PROMPT AI", name, null, price, "/buyprompt");
}

// ===== GET/DEL PROMPT =====
case "delprompt":
case "getprompt": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only.");
    const allPrompts = loadPrompts();
    if (!allPrompts.length) return ctx.reply("📭 Belum ada prompt.");

    const buttons = allPrompts.map((s, i) => ([
        { text: `📄 ${escapeHTML(s.name)} - Rp${s.price}`, callback_data: `getprompt_detail|${i}` }
    ]));

    return ctx.reply(`<b>📄 DAFTAR PROMPT AI</b>\n\nPilih Prompt untuk melihat detail:`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
    });
}


// ===== USERLIST (OWNER ONLY) =====
case "userlist": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    return sendUserPage(ctx, 0);
}

// ===== LIHAT SEMUA SALDO (OWNER ONLY) =====
case "lihatallsaldo":
case "allsaldo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    return sendSaldoPage(ctx, 0);
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

case "cekipbot": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    try {
        const { data } = await axios.get("https://api.ipify.org?format=json");
        return ctx.reply(`🌐 <b>IP SERVER BOT KAMU:</b>\n<code>${data.ip}</code>\n\nSilakan copy IP di atas dan masukkan ke menu Whitelist API di web Fayupedia.`, {parse_mode: "HTML"});
    } catch (err) {
        return ctx.reply("❌ Gagal mengecek IP Server.");
    }
}

// ===== COMMAND ENCRYPT SCRIPT (SUPER HARD) =====
case "encx": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.document) {
        return ctx.reply("❌ *Error:* Balas file .js dengan `/encx`!", { parse_mode: "Markdown" });
    }

    const file = ctx.message.reply_to_message.document;
    if (!file.file_name.endsWith(".js")) {
        return ctx.reply("❌ *Error:* Hanya file .js yang didukung!", { parse_mode: "Markdown" });
    }

    const encryptedPath = path.join(__dirname, `x-encrypted-${file.file_name}`);

    try {
        const progressMessage = await ctx.reply(
            "```css\n" +
            "🔒 EncryptBot\n" +
            " ⚙️ Memulai (Hardened X Invisible) (1%)\n" +
            " " + createProgressBar(1) + "\n" +
            "```\n" +
            "PROSES ENCRYPT BY ELIKA",
            { parse_mode: "Markdown" }
        );

        // 1. Mengunduh File menggunakan Axios
        await updateProgress(ctx, progressMessage, 10, "Mengunduh File");
        const fileLink = await ctx.telegram.getFileLink(file.file_id);
        const response = await axios.get(fileLink.href, { responseType: "text" });
        let fileContent = response.data;
        
        await updateProgress(ctx, progressMessage, 30, "Memvalidasi Kode");
        try { new Function(fileContent); } catch (e) {
            throw new Error(`Kode awal bermasalah/error sintaks: ${e.message}`);
        }

        // 2. Tahap Obfuscation Pertama (Melindungi Source Code)
        await updateProgress(ctx, progressMessage, 50, "Obfuscation Tahap 1");
        const obfuscated = await JsConfuser.obfuscate(fileContent, getXObfuscationConfig());
        let obfuscatedCode = obfuscated.code || obfuscated;

        // 3. Invisible Encoding
        await updateProgress(ctx, progressMessage, 70, "Invisible Encoding");
        const encodedInvisible = encodeInvisible(obfuscatedCode);
        
        // 4. Membuat Wrapper Unpacker
        const wrapperCode = `
            const _b = Buffer;
            const _d = (e) => {
                if(!e.startsWith('\\u200B')) return e;
                return _b.from(e.slice(1),'base64').toString('utf-8');
            };
            eval(_d("${encodedInvisible}"));
        `;

        // 5. Tahap Obfuscation Kedua (Melindungi Unpacker & Menyembunyikan Eval)
        await updateProgress(ctx, progressMessage, 85, "Obfuscation Tahap 2 (Armor)");
        const finalObfuscated = await JsConfuser.obfuscate(wrapperCode, {
            target: "node",
            compact: true,
            renameVariables: true,
            stringConcealing: true,
            controlFlowFlattening: 0.5
        });

        const finalCode = finalObfuscated.code || finalObfuscated;

        // 6. Menyimpan & Mengirim File
        await updateProgress(ctx, progressMessage, 95, "Finalisasi File");
        fs.writeFileSync(encryptedPath, finalCode);

        await ctx.replyWithDocument(
            { source: encryptedPath, filename: `Enc-By-Elika-${file.file_name}` },
            { caption: "✅ *File terenkripsi (Hardened X Invisible) siap!*\n💯 Source code telah dilindungi dengan Double Obfuscation!\n\nSUKSES ENCRYPT BY ELIKA 🕊", parse_mode: "Markdown" }
        );
        
        await updateProgress(ctx, progressMessage, 100, "Selesai");

        // Hapus file sementara
        if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);

    } catch (error) {
        await ctx.reply(`❌ *Kesalahan:* ${error.message || "Tidak diketahui"}\n_Coba lagi dengan kode Javascript yang valid!_`, { parse_mode: "Markdown" });
        if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);
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

// ===== PANDUAN PENGGUNAAN BOT =====
case "help":
case "panduan":
case "bantuan": {
    const helpText = `
<blockquote><b>📚 PANDUAN PENGGUNAAN BOT</b></blockquote>
Selamat datang di bot Auto Order! Berikut adalah panduan lengkap cara menggunakan fitur-fitur di bot ini:

<blockquote><b>💳 1. CARA DEPOSIT (ISI SALDO)</b></blockquote>
Kamu bisa mengisi saldo dengan 2 cara:
• <b>Via Tombol:</b> Ketik <code>/menu</code>, lalu klik tombol <b>💳 Deposit Saldo</b>.
• <b>Via Command:</b> Ketik <code>${config.prefix}deposit nominal</code> (Contoh: <code>${config.prefix}deposit 20000</code>).
<i>Sistem akan memunculkan kode QRIS. Silakan scan menggunakan DANA, GoPay, OVO, dll. Saldo akan masuk otomatis!</i>

<blockquote><b>🛒 2. CARA BELI PRODUK & PEMBAYARAN</b></blockquote>
• Ketik <code>/menu</code> dan klik <b>🛍️ Katalog Produk</b> untuk melihat semua layanan.
• Pilih produk yang kamu inginkan.
• Saat <i>checkout</i>, kamu bisa memilih bayar menggunakan:
  1. <b>Saldo Bot</b> (Otomatis potong saldo jika mencukupi).
  2. <b>QRIS</b> (Bayar langsung lunas via scan kode QR).

<blockquote><b>⚡ 3. CARA BELI PANEL</b></blockquote>
• <b>Cara 1:</b> Ketik <code>${config.prefix}buypanel usernamekamu</code> (Contoh: <code>${config.prefix}buypanel Budi123</code>).
• <b>Cara 2:</b> Masuk ke Katalog -> klik Panel -> lalu balas pesan bot dengan username.
• Pilih RAM yang diinginkan dan lakukan pembayaran. Detail akun dikirim otomatis.

<blockquote><b>🤝 4. CARA DAPAT SALDO GRATIS (REFERRAL)</b></blockquote>
• Ketik <code>${config.prefix}ref</code> atau klik tombol <b>🤝 CODE REFERRAL</b> di menu utama.
• Copy link spesial milikmu dan bagikan ke teman atau grup.
• Setiap ada orang yang masuk ke bot lewat link kamu, kamu akan <b>otomatis mendapat saldo gratis</b>!

<blockquote><b>📞 5. BUTUH BANTUAN LAIN?</b></blockquote>
Jika pesananmu belum masuk, deposit nyangkut, atau ada kendala teknis lainnya, silakan klik tombol Hubungi Admin di bawah.
`.trim();

    // 🔥 FIX: Simpan ID Gambar biar bisa dihapus nanti 🔥
    const photoMsg = await ctx.replyWithPhoto(config.helpMenuImage).catch(() => {});
    if (photoMsg) {
        global.helpPhotos = global.helpPhotos || {};
        global.helpPhotos[ctx.from.id] = photoMsg.message_id;
    }

    return ctx.reply(helpText, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🛍️ Buka Katalog", callback_data: "katalog" },
                    { text: "💳 Isi Saldo", callback_data: "deposit_menu" }
                ],
                [
                    { text: "📞 Hubungi Admin", url: `https://t.me/${config.ownerUsername}` }
                ]
            ]
        }
    });
}



// ===== CEK PING & STATUS SYSTEM =====
case "ping": {
    const nou = require("node-os-utils");
    const speed = require("performance-now");
    const start = speed();

    const cpu = nou.cpu;
    const drive = nou.drive;
    const mem = nou.mem;

    // Kirim pesan loading karena fetch data CPU butuh waktu
    const waitMsg = await ctx.reply("⏳ <i>Mengambil data sistem server...</i>", { parse_mode: "HTML" });

    try {
        const [osName, driveInfo, memInfo, cpuUsage] = await Promise.all([
            nou.os.oos().catch(() => "Unknown"),
            drive.info().catch(() => ({ usedGb: "N/A", totalGb: "N/A" })),
            mem.info().catch(() => ({ totalMemMb: 0, usedMemMb: 0, freeMemMb: 0 })),
            cpu.usage().catch(() => 0)
        ]);

        const totalGB = (memInfo.totalMemMb / 1024 || 0).toFixed(2);
        const usedGB = (memInfo.usedMemMb / 1024 || 0).toFixed(2);
        const freeGB = (memInfo.freeMemMb / 1024 || 0).toFixed(2);
        const cpuList = os.cpus() || [];
        const cpuModel = cpuList[0]?.model || "Unknown CPU";
        const cpuSpeed = cpuList[0]?.speed || "N/A";
        const cpuCores = cpuList.length || 0;
        
        // Pengecekan aman buat fungsi runtime
        const vpsUptime = typeof runtime === "function" ? runtime(os.uptime()) : `${(os.uptime() / 3600).toFixed(1)} Jam`;
        const botUptime = typeof runtime === "function" ? runtime(process.uptime()) : `${(process.uptime() / 3600).toFixed(1)} Jam`;
        
        const latency = (speed() - start).toFixed(2);
        const loadAvg = os.loadavg().map(n => n.toFixed(2)).join(" | ");
        const nodeVersion = process.version;
        const platform = os.platform();
        const hostname = os.hostname();
        const arch = os.arch();

        const textPing = `
<blockquote><b>⚙️ SYSTEM STATUS</b></blockquote>
<b>• OS :</b> ${nou.os.type()} (${osName})
<b>• Platform :</b> ${platform.toUpperCase()}
<b>• Arch :</b> ${arch}
<b>• Hostname :</b> ${hostname}

<blockquote><b>💾 STORAGE & RAM</b></blockquote>
<b>• Disk :</b> ${driveInfo.usedGb}/${driveInfo.totalGb} GB
<b>• RAM :</b> ${usedGB}/${totalGB} GB (Free: ${freeGB} GB)

<blockquote><b>🧠 CPU INFO</b></blockquote>
<b>• Model :</b> ${cpuModel}
<b>• Core(s) :</b> ${cpuCores}
<b>• Speed :</b> ${cpuSpeed} MHz
<b>• Usage :</b> ${cpuUsage.toFixed(2)}%
<b>• Load Avg :</b> ${loadAvg}

<blockquote><b>🤖 BOT STATUS</b></blockquote>
<b>• Ping :</b> ${latency} ms
<b>• Bot Uptime :</b> ${botUptime}
<b>• VPS Uptime :</b> ${vpsUptime}
<b>• Node.js :</b> ${nodeVersion}
`.trim();

        // 🔥 INI DIA TOMBOL 1 DOANG (TULISAN SUPPORT KE URL OWNER) 🔥
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "📞 Support", url: `https://t.me/${config.ownerUsername}` }
                ]
            ]
        };

        // Hapus pesan "⏳ Sedang mengambil data..."
        await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
        
        // Kirim hasil ping beserta foto menu & tombol Support
        return ctx.replyWithPhoto(config.pinkInfoImage, {
            caption: textPing,
            parse_mode: "HTML",
            reply_markup: keyboard
        });

    } catch (err) {
        return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal mengambil status sistem:\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
}

// ===== DELETE ALL SALDO USER (OWNER ONLY) =====
case "deleteallsaldo":
case "delallsaldo": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    const users = loadUsers();
    if (!users || users.length === 0) {
        return ctx.reply("📭 Belum ada user terdaftar di database.");
    }

    // Set status owner sedang dalam tahap konfirmasi
    pendingDeleteAllSaldo[fromId] = true;

    const confirmText = `
⚠️ <b>PERINGATAN BAHAYA (SAPU JAGAT)</b> ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━
Apakah Anda yakin ingin <b>MENGHAPUS SEMUA SALDO USER</b> menjadi Rp0?
Tindakan ini tidak dapat dibatalkan dan uang user akan hangus!

👇 <b>Silakan balas pesan ini:</b>
Ketik <code>oke</code> untuk melanjutkan penghapusan.
Ketik <code>batal</code> untuk membatalkan.
`.trim();

    return ctx.reply(confirmText, { parse_mode: "HTML" });
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

// ===== COMMAND MEMBERI RATING =====
case "rating":
case "rate": {
    if (args.length < 2) {
        return ctx.reply(`❌ <b>Format Salah!</b>\n\nCara pakai: <code>${config.prefix}rating [bintang 1-5] [ulasan kamu]</code>\nContoh: <code>${config.prefix}rating 5 Botnya keren, prosesnya cepet banget!</code>`, { parse_mode: "HTML" });
    }
    
    const star = parseInt(args[0]);
    if (isNaN(star) || star < 1 || star > 5) {
        return ctx.reply("❌ Angka bintang harus dari 1 sampai 5!");
    }
    
    const ulasan = args.slice(1).join(" ");
    if (ulasan.length < 5) return ctx.reply("❌ Ulasan terlalu pendek! Ketik minimal 5 huruf.");

    const ratings = loadRatings();
    const existingIdx = ratings.findIndex(r => r.id === fromId);
    
    const ratingData = {
        id: fromId,
        name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
        username: ctx.from.username || "-",
        star: star,
        text: ulasan,
        date: new Date().toISOString()
    };

    if (existingIdx !== -1) {
        ratings[existingIdx] = ratingData; 
        saveRatings(ratings);
        return ctx.reply(`✅ <b>Rating berhasil diperbarui!</b>\n\nTerima kasih atas ulasan ${star} ⭐ nya!\n\n<i>Cek ulasanmu di Menu Utama -> 🌟 Cek Rating.</i>`, { parse_mode: "HTML" });
    } else {
        ratings.push(ratingData); 
        saveRatings(ratings);
        return ctx.reply(`✅ <b>Rating berhasil ditambahkan!</b>\n\nTerima kasih atas ulasan ${star} ⭐ nya!\n\n<i>Cek ulasanmu di Menu Utama -> 🌟 Cek Rating.</i>`, { parse_mode: "HTML" });
    }
    break;
}


case "buypanel": {
    if (!text) return ctx.reply(`Ketik ${config.prefix}buypanel username untuk membeli panel.`);
    if (text.includes(" ")) return ctx.reply("Format username dilarang memakai spasi!");
    
    // 🔥 HAPUS MENU PANDUAN SEBELUMNYA 🔥
    if (activeMenus[fromId]) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, activeMenus[fromId]); delete activeMenus[fromId]; } catch (e) {}
    }

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


case "buyadp":  
case "buyadmin": {
    if (!text)
        return ctx.reply(`Ketik ${config.prefix}buyadmin username untuk membeli admin panel.`);
    if (text.includes(" "))
        return ctx.reply("Format username dilarang memakai spasi!");

    // 🔥 HAPUS MENU PANDUAN SEBELUMNYA 🔥
    if (activeMenus[fromId]) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, activeMenus[fromId]); delete activeMenus[fromId]; } catch (e) {}
    }

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

// ===== BUY SUBDOMAIN =====
case "buysubdomain":
case "buysubdo": {
    if (!args[0] || !args[1]) return ctx.reply(`❌ Format salah!\n\nKetik: <code>${config.prefix}buysubdo namasubdomain ip_vps</code>\nContoh: <code>${config.prefix}buysubdo serverku 192.168.1.1</code>`, { parse_mode: "HTML" });
    
    const host = args[0].toLowerCase().replace(/[^a-z0-9-]/g, ""); 
    const ip = args[1].replace(/[^0-9.]/g, "");

    if (!host || !ip) return ctx.reply("❌ Hostname atau IP tidak valid.");

    // 🔥 HAPUS MENU PANDUAN SEBELUMNYA 🔥
    if (activeMenus[fromId]) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, activeMenus[fromId]); delete activeMenus[fromId]; } catch (e) {}
    }

    const domains = Object.keys(config.subdomain);
    if (!domains.length) return ctx.reply("❌ Sistem error: Konfigurasi API domain belum di-setting oleh Owner.");

    const domainButtons = domains.map(dom => ([
        { text: `🌐 .${dom}`, callback_data: `sub_sel|${host}|${ip}|${dom}` }
    ]));

    return ctx.reply(`Pilih Domain Induk untuk <b>${host}</b>:`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: domainButtons }
    });
  }} 
});

bot.action("buyprompt", async (ctx) => {
    const promptsList = loadPrompts();
    const settings = loadSettings();
  if (!settings.prompt) return ctx.answerCbQuery("🚫 Fitur Beli Prompt AI sedang Offline / Dimatikan.", { show_alert: true });
    
    await ctx.answerCbQuery().catch(() => {});

    // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
    try {
        await ctx.deleteMessage(); 
    } catch (err) {
        return; 
    }

    const promptButtons = promptsList.map(s => [
        { text: `📄 ${escapeHTML(s.name)} - Rp${s.price}`, callback_data: `prompt|${s.name}` }
    ]);
    promptButtons.push([{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog" }]);

    ctx.reply("<b>Pilih Nama Prompt:</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: promptButtons } }).catch(() => {});
});



bot.action(/^prompt\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const name = ctx.match[1];
    const prompts = loadPrompts();
    const sc = prompts.find(s => s.name === name);
    
    if (!sc) return ctx.reply("❌ Prompt tidak ditemukan.");

    const text = `<blockquote><b>📝 Konfirmasi Pemesanan</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 Produk: Prompt ${escapeHTML(sc.name)}\n💰 Harga: Rp${Number(sc.price).toLocaleString("id-ID")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<blockquote><b>📝 Deskripsi:</b></blockquote>\n${escapeHTML(sc.desk || "-")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Yakin ingin melanjutkan pembayaran?`.trim();

    await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Konfirmasi", callback_data: `confirm_prompt|${sc.name}` }, { text: "❌ Batalkan", callback_data: "back_to_prompt" }]
            ]
        }
    });
});

bot.action("back_to_prompt", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const promptsList = loadPrompts();
    if (!promptsList.length) return ctx.editMessageText("📭 Stok prompt sedang kosong.");

    const promptButtons = promptsList.map(s => ([{ text: `📄 ${escapeHTML(s.name)} - Rp${Number(s.price).toLocaleString("id-ID")}`, callback_data: `prompt|${s.name}` }]));
    promptButtons.push([{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog" }]);

    await ctx.editMessageText("Pilih Prompt yang ingin dibeli:", { parse_mode: "HTML", reply_markup: { inline_keyboard: promptButtons } });
});

    // ===== OPSI PEMBAYARAN PROMPT (DENGAN DISKON) =====
    bot.action(/confirm_prompt\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const name = ctx.match[1];
        const userId = ctx.from.id;
        const prompts = loadPrompts();
        const sc = prompts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Prompt tidak ditemukan.");

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);
        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        let teksHarga = `💰 <b>Harga Normal:</b> Rp${sc.price.toLocaleString('id-ID')}`;
        if (harga.diskonPersen > 0) {
            teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${sc.price.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
        }

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📄 Produk: Prompt ${escapeHTML(sc.name)}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `pay_saldo_prompt|${sc.name}` }], [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_prompt|${sc.name}` }], [{ text: "❌ Batalkan", callback_data: "back_to_prompt" }]] } }
        );
    });

    // ===== BAYAR PROMPT VIA QRIS =====
    bot.action(/pay_qris_prompt\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Prompt...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const name = ctx.match[1];
        const userId = ctx.from.id;
        const prompts = loadPrompts();
        const sc = prompts.find(s => s.name === name);
        if (!sc) return ctx.editMessageText("❌ Prompt tidak ditemukan.", { parse_mode: "HTML" }).catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);
        const fee = generateRandomFee();
        const price = harga.finalPrice + fee;
        
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\nMinimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b>.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } }).catch(()=>{});
        }

        const paymentType = config.paymentGateway;
        try {
            const pay = await createPayment(paymentType, price, config);
            if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS");

            orders[userId] = { type: "prompt", name: sc.name, amount: price, fee, file: sc.file, orderId: pay.orderId || null, paymentType: paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            try { await ctx.deleteMessage(); } catch (e) {}
            
            let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
            const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : Prompt ${escapeHTML(sc.name)}\n• Harga Normal    : Rp${sc.price.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

            const qrMsg = await ctx.replyWithPhoto(photo, { caption: captionStruk, parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            await ctx.editMessageText(`❌ Gangguan:\n<code>${err.message}</code>`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
        }
    });

    // ===== BAYAR PROMPT VIA SALDO =====
    bot.action(/pay_saldo_prompt\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & menyiapkan file Prompt...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const name = ctx.match[1];
        const userId = ctx.from.id;
        const prompts = loadPrompts();
        const sc = prompts.find(s => s.name === name);
        if (!sc) return ctx.editMessageText("❌ Prompt tidak ditemukan.", { parse_mode: "HTML" }).catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);
        const price = harga.finalPrice;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) {
            return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Final: Rp${price.toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(()=>{});
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: `Prompt: ${sc.name}`, amount: price, type: "prompt", details: sc.desk || "-", timestamp: new Date().toISOString() });
        saveUsers(users);

        const buyerInfo = { id: userId, name: ctx.from.first_name, username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "prompt", name: sc.name, amount: price, description: sc.desk }, buyerInfo);

        await ctx.editMessageText(`<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n📄 Produk: Prompt ${escapeHTML(sc.name)}\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<i>File Prompt sedang dikirim...</i>`, { parse_mode: "html" }).catch(()=>{});
        
        try {
            await ctx.telegram.sendDocument(ctx.chat.id, { source: sc.file }, { caption: `📄 Prompt: ${escapeHTML(sc.name)}`, parse_mode: "html" });
        } catch (err) {
            await ctx.telegram.sendMessage(ctx.chat.id, "❌ Gagal mengirim file prompt. Silakan hubungi admin.");
        }
    });

bot.action(/getprompt_detail\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);
    const prompts = loadPrompts();
    const s = prompts[index];
    if (!s) return ctx.editMessageText("❌ Prompt tidak ditemukan.");

    const detailText = `📋 <b>DETAIL PROMPT</b>\n\n📄 <b>Nama:</b> ${escapeHTML(s.name)}\n💰 <b>Harga:</b> Rp${toRupiah(s.price)}\n📁 <b>File:</b> ${escapeHTML(s.file || "-")}\n📅 <b>Ditambahkan:</b> ${new Date(s.added_date).toLocaleDateString('id-ID')}\n\n📝 <b>Deskripsi:</b>\n${escapeHTML(s.desk || "-")}`;

    return ctx.editMessageText(detailText, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [
                [{ text: "📤 Download Prompt", callback_data: `download_prompt|${index}` }, { text: "🗑️ Hapus Prompt", callback_data: `del_prompt|${s.name}` }],
                [{ text: "↩️ Back ke List", callback_data: "back_to_prompt_list" }]
            ]}
    });
});

bot.action(/download_prompt\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const prompts = loadPrompts();
    const s = prompts[Number(ctx.match[1])];
    if (!s || !fs.existsSync(path.resolve(s.file))) return ctx.reply("❌ File prompt tidak ditemukan.");
    return ctx.replyWithDocument({ source: path.resolve(s.file) }, { caption: `📄 Prompt: ${escapeHTML(s.name)}`, parse_mode: "HTML" });
});

bot.action("back_to_prompt_list", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const allPrompts = loadPrompts();
    if (!allPrompts.length) return ctx.editMessageText("📭 Belum ada prompt.");
    const buttons = allPrompts.map((s, i) => ([{ text: `📄 ${escapeHTML(s.name)} - Rp${s.price}`, callback_data: `getprompt_detail|${i}` }]));
    return ctx.editMessageText("<b>📄 DAFTAR PROMPT</b>\n\nPilih Prompt untuk melihat detail:", { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
});

bot.action(/del_prompt\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const name = ctx.match[1];
    let prompts = loadPrompts();
    const sc = prompts.find(s => s.name === name);
    if (!sc) return ctx.editMessageText("❌ Tidak ditemukan.");

    if (fs.existsSync(path.join(__dirname, sc.file))) fs.unlinkSync(path.join(__dirname, sc.file));
    savePrompts(prompts.filter(s => s.name !== name));

    return ctx.editMessageText(`✅ Prompt <b>${escapeHTML(name)}</b> berhasil dihapus.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Kembali ke List", callback_data: "back_to_prompt_list" }]] } });
});

// ===== TOMBOL BUKA MENU SCRIPT =====
bot.action("buyscript", async (ctx) => {
    const scriptsList = loadScripts();
    const settings = loadSettings();

    if (!settings.script) {
        return ctx.answerCbQuery("💻 Stok Script Kosong\n\n😕 Untuk saat ini belum ada script yang bisa diproses.", { show_alert: true });
    }
    await ctx.answerCbQuery("⏳ Membuka katalog script...", { show_alert: false }).catch(() => {});
    await renderScriptPage(ctx, 0); // Buka dari halaman 0 (pertama)
});

// ===== TANGKAP KLIK NEXT / PREV SCRIPT =====
bot.action(/script_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await renderScriptPage(ctx, page); 
});

bot.action("ignore", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {}); // Biar tombol "Hal 1/3" ga loading kalau diklik
});


bot.action("buyapp", async (ctx) => {
    const stocks = loadStocks();
    const categories = Object.keys(stocks);
    const settings = loadSettings();
    if (!settings.app)
        return ctx.answerCbQuery(`
📱 Stok Apps Kosong

🛑 Aplikasi yang kamu cari lagi nggak tersedia nih.
Tunggu update selanjutnya ya, bakal kami isi lagi secepatnya.`, { show_alert: true });

    await ctx.answerCbQuery().catch(() => {});

    // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
    try {
        await ctx.deleteMessage(); 
    } catch (err) {
        return; 
    }

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
});


bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
    try { await ctx.deleteMessage(); } catch (err) { return; }

    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    if (!user) return ctx.reply("❌ User tidak ditemukan");

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';
    if (user.history && user.history.length > 0) {
        lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
            return `${i + 1}. ${escapeHTML(t.product)} - Rp${toRupiah(t.amount)} (${new Date(t.timestamp).toLocaleDateString('id-ID')})`;
        }).join('\n');
    }

    const profileText = `<blockquote><b>🪪 Profile Kamu</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>\n<b>🆔 User ID:</b> <code>${user.id}</code>\n<b>📧 Username:</b> ${escapeHTML(userUsername)}\n<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}\n<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}\n<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<b>📋 Last 3 Transactions:</b>\n\n${lastTransactions}</blockquote>`;

    ctx.reply(profileText, {
        parse_mode: "HTML", disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "informasi_admin"  }]] }
    }).catch(() => {});
});


// ===== HISTORY USER (ACTION) =====
bot.action("history", async (ctx) => {
    // 1. Cek data user & histori terlebih dahulu sebelum melakukan aksi lain
    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    // 2. Jika histori kosong, langsung munculkan pop-up alert (Menu utama tidak dihapus)
    if (!user || !user.history || user.history.length === 0) {
        return ctx.answerCbQuery("📭 Belum ada riwayat transaksi", { show_alert: true }).catch(() => {});
    }

    // 3. Jika histori ada, hilangkan loading di tombol
    await ctx.answerCbQuery().catch(() => {});
    
    // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
    try { await ctx.deleteMessage(); } catch (err) { return; }

    // 4. Siapkan dan kirim daftar histori
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
                [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "informasi_admin"  }]
            ]
        }
    }).catch(() => {});
});



bot.action("buydo", async (ctx) => {
  const doData = loadDO();
  const categories = Object.keys(doData);
  const settings = loadSettings();
  if (!settings.do)
    return ctx.answerCbQuery(`
🧾 Stok DO Kosong

🌊 Saat ini Digital Ocean belum tersedia.
Tim lagi cek ketersediaan, mohon tunggu update berikutnya ya.`, { show_alert: true });

  await ctx.answerCbQuery().catch(() => {});
  
  activeMenus[ctx.from.id] = ctx.callbackQuery.message.message_id;

  // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
  try {
      await ctx.deleteMessage(); 
  } catch (err) {
      return; 
  }

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
});


bot.action("buyvps", async (ctx) => {
  const settings = loadSettings();
  if (!settings.vps)
    return ctx.answerCbQuery(`
🖥️ Fitur VPS Belum Tersedia

🚧 Layanan VPS masih dalam tahap persiapan.
Kami sedang menyiapkan sistemnya agar bisa segera digunakan.`, { show_alert: true });

  await ctx.answerCbQuery().catch(() => {});

  // 🔥 TRICK ANTI SPAM DOUBLE CLICK 🔥
  try {
      await ctx.deleteMessage(); 
  } catch (err) {
      return; 
  }

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
});

    
// ===== MENU BUY PANEL =====
bot.action("buypanel", async (ctx) => {
  const settings = loadSettings();
  if (!settings.panel) {
    return ctx.answerCbQuery(`
🎛️ Stok Panel Sedang Kosong

📌 Panel lagi habis untuk sementara.
Restock akan dilakukan secepatnya, pantau terus ya.`,
      { show_alert: true }
    ).catch(() => {});
  }

  await ctx.answerCbQuery().catch(() => {});
  
  activeMenus[ctx.from.id] = ctx.callbackQuery.message.message_id;

  const textPanel = `<blockquote>🖥️ <b>BUY PANEL</b>\n\n` +
    `Ketik:\n<code><b>${config.prefix}buypanel username</b></code>\n\n` +
    `Contoh:\n<code><b>${config.prefix}buypanel KaellVirex</b></code>\n\n` +
    `Lanjutkan dengan mengetik perintah di chat.</blockquote>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }]
    ]
  };

  try {
    await ctx.editMessageMedia(
      { 
        type: "photo", 
        media: config.katalogImage, 
        caption: textPanel, 
        parse_mode: "HTML" 
      },
      { reply_markup: keyboard }
    );
  } catch (err) {
    // 🔥 FIX: JIKA PESAN SEBELUMNYA CUMA TEKS, HAPUS LALU KIRIM FOTO BARU 🔥
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, {
            caption: textPanel, 
            parse_mode: "HTML", 
            reply_markup: keyboard
        }).catch(() => {});
    }
  }
});

// ===== MENU BUY ADMIN =====
bot.action("buyadmin", async (ctx) => {
  const settings = loadSettings();

  if (!settings.admin) {
    return ctx.answerCbQuery(`
👑 Stok Admin Panel Kosong

🔒 Admin panel sedang tidak tersedia saat ini.
Silakan tunggu hingga stok dibuka kembali.`,
      { show_alert: true }
    ).catch(() => {});
  }

  await ctx.answerCbQuery().catch(() => {});
  
  activeMenus[ctx.from.id] = ctx.callbackQuery.message.message_id;

  const textAdmin = `<blockquote>👑 <b>BUY ADMIN PANEL</b>\n\n` +
    `Ketik:\n<code><b>${config.prefix}buyadmin username</b></code>\n\n` +
    `Contoh:\n<code><b>${config.prefix}buyadmin KaellVirex</b></code>\n\n` +
    `Lanjutkan dengan mengetik perintah di chat.</blockquote>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog"  }]
    ]
  };

  try {
    await ctx.editMessageMedia(
      { 
        type: "photo", 
        media: config.katalogImage, 
        caption: textAdmin, 
        parse_mode: "HTML" 
      },
      { reply_markup: keyboard }
    );
  } catch (err) {
    // 🔥 FIX: JIKA PESAN SEBELUMNYA CUMA TEKS, HAPUS LALU KIRIM FOTO BARU 🔥
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, {
            caption: textAdmin, 
            parse_mode: "HTML", 
            reply_markup: keyboard
        }).catch(() => {});
    }
  }
});

bot.action("cancel_order", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    try { await ctx.deleteMessage(); } catch (err) { return; } // Anti Spam

    const userId = ctx.from.id;
    const order = orders[userId];

    if (order && order.qrMessageId) {
        try { await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId); } catch (e) {}
    }
    delete orders[userId];

    ctx.reply("✅ <b>Order berhasil dibatalkan.</b>\n\nSilakan order ulang atau pilih produk lain.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🛍️ Katalog Produk", callback_data: "katalog"  }], [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }]] }
    }).catch(() => {});
});

bot.action(/saldopage_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Owner Only!", { show_alert: true });
    
    await ctx.answerCbQuery().catch(() => {});
    await sendSaldoPage(ctx, page);
});


// ===== TOP PENGGUNA (LEADERBOARD) =====
bot.action("top_users", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});

    // Tarik data user dan urutkan berdasarkan total belanja tertinggi
    const users = loadUsers();
    const sortedUsers = users
        .filter(u => u.total_spent > 0) // Hanya tampilkan yang pernah belanja
        .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));

    // Fungsi untuk narik semua data (Full Stack)
    const getTopData = (index) => {
        const user = sortedUsers[index];
        if (!user) {
            return { 
                id: "-",
                name: "Belum ada", 
                saldo: 0,
                trx: 0,
                total: 0 
            };
        }
        
        // Prioritaskan username, kalau gaada pakai nama depan, kalau gaada juga pakai ID
        let name = user.username ? `@${user.username}` : (user.first_name || `User${user.id}`);
        return { 
            id: user.id,
            name: escapeHTML(name), 
            saldo: user.balance || 0,
            trx: user.history ? user.history.length : 0,
            total: user.total_spent || 0 
        };
    };

    const top1 = getTopData(0);
    const top2 = getTopData(1);
    const top3 = getTopData(2);

    const textTop = `
<blockquote><b>🏆 LEADERBOARD TOP PENGGUNA</b></blockquote>
Tingkatkan terus transaksi Anda dan jadilah Top Pengguna di bot kami!

🥇 <b>𝗧𝗢𝗣 𝟭 (𝗦𝘂𝗹𝘁𝗮𝗻)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top1.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top1.name}
└ 💳 <b>𝗦𝗮𝗹𝗱𝗼:</b> Rp ${top1.saldo.toLocaleString('id-ID')}
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top1.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> Rp ${top1.total.toLocaleString('id-ID')}

🥈 <b>𝗧𝗢𝗣 𝟮 (𝗝𝘂𝗿𝗮𝗴𝗮𝗻)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top2.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top2.name}
└ 💳 <b>𝗦𝗮𝗹𝗱𝗼:</b> Rp ${top2.saldo.toLocaleString('id-ID')}
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top2.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> Rp ${top2.total.toLocaleString('id-ID')}

🥉 <b>𝗧𝗢𝗣 𝟯 (𝗝𝗮𝘄𝗮𝗿𝗮)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top3.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top3.name}
└ 💳 <b>𝗦𝗮𝗹𝗱𝗼:</b> Rp ${top3.saldo.toLocaleString('id-ID')}
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top3.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> Rp ${top3.total.toLocaleString('id-ID')}
`.trim();

    return ctx.editMessageCaption(textTop, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]
            ]
        }
    }).catch(err => {
        // Fallback kalau seandainya pesan aslinya ga ada fotonya
        return ctx.editMessageText(textTop, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]
                ]
            }
        }).catch(()=> {});
    });
});

// ===== TOMBOL CEK JOIN =====
bot.action("cek_join", async (ctx) => {
    const joined = await isUserJoined(ctx);
    
    if (!joined) {
        return ctx.answerCbQuery('❌ Kamu belum join channel! Silakan join terlebih dahulu.', { show_alert: true });
    }

    await ctx.answerCbQuery('✅ Verifikasi berhasil! Terima kasih sudah join.');
    try { await ctx.deleteMessage(); } catch(e){}
    return ctx.reply('🎉 <b>Akses Diberikan!</b>\nSilakan ketik /menu atau /start untuk mulai menggunakan bot.', { parse_mode: 'HTML' });
});


bot.action("smm_menu", async (ctx) => {
  const settings = loadSettings();

    if (!settings.smm) {
        return ctx.answerCbQuery(`
⚙️ Fitur SMM Belum Tersedia

🚫 Layanan SMM masih belum aktif.
Sistem API-nya lagi dalam tahap konfigurasi oleh Owner.
Nanti kalau sudah siap, fitur ini bisa langsung dipakai.`, { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});
    activeMenus[ctx.from.id] = ctx.callbackQuery.message.message_id;

    const textSmm = `<blockquote>📈 <b>SMM PANEL AUTO ORDER</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nLayanan suntik Sosmed termurah dan otomatis 24 Jam!\n\nSilakan pilih menu di bawah ini:`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "🔍 Cari Manual", callback_data: "smm_search" },
                { text: "📋 Daftar Kategori", callback_data: "smm_categories" }
            ], 
            [
                { text: "📦 Status Order", callback_data: "smm_status" }, 
                { text: "🔄 Request Refill", callback_data: "smm_refill" }
            ], 
            [
                { text: "🔎 Cek Status Refill", callback_data: "smm_refill_status" }
            ],
            ...(isOwner(ctx) ? [[
                { text: "💰 Cek Saldo Pusat (Owner)", callback_data: "smm_cek_pusat" }
            ]] : []),
            [
                { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog" }
            ]
        ] 
    };

    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.katalogImage, caption: textSmm, parse_mode: "HTML" },
            { reply_markup: keyboard }
        );
    } catch (err) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, { caption: textSmm, parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});


bot.action("smm_search", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    pendingSmmSearch[ctx.from.id] = true;
    return ctx.editMessageCaption(`<blockquote>🔍 <b>PENCARIAN LAYANAN SOSMED</b></blockquote>\n\nSilakan balas pesan ini dengan mengetik <b>nama sosmed atau jenis layanan</b> yang ingin dicari.\n\n<b>Contoh ketik:</b>\n<code>Tiktok</code>\n<code>Telegram</code>\n<code>Instagram Followers</code>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "smm_menu" }]] } }).catch(() => {});
});

bot.action(/smm_select\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const index = parseInt(ctx.match[1]);
    const fromId = ctx.from.id;
    const serviceData = smmTempData[fromId]?.[index];
    if (!serviceData) return ctx.reply("❌ Sesi habis. Silakan cari ulang.", {reply_markup: {inline_keyboard: [[{text: "🔍 Cari Ulang", callback_data: "smm_search"}]]}});

    pendingSmmOrder[fromId] = { step: "target", service: serviceData };
    try { await ctx.deleteMessage(); } catch (e) {}

    const text = `<blockquote>📝 <b>FORM ORDER SMM</b></blockquote>\n\n📦 <b>Layanan:</b> ${escapeHTML(serviceData.name)}\n💰 <b>Harga/1K:</b> Rp${Math.ceil(serviceData.price * config.smm.profitMargin).toLocaleString('id-ID')}\n🔻 <b>Min Order:</b> ${serviceData.min}\n🔺 <b>Max Order:</b> ${serviceData.max}\n\n👇 <b>Silakan balas pesan ini dengan memasukkan TARGET (Link / Username):</b>`;
    return ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "smm_menu" }]] } });
});

bot.action("smm_status", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    pendingSmmStatus[ctx.from.id] = true;
    try { await ctx.deleteMessage(); } catch (e) {}
    return ctx.reply("<blockquote>📦 <b>CEK STATUS PESANAN</b></blockquote>\n\n👇 <b>Silakan balas pesan ini dengan memasukkan ID PESANAN (Order ID):</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "smm_menu" }]] } });
});

bot.action("smm_refill", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    pendingSmmRefill[ctx.from.id] = true;
    try { await ctx.deleteMessage(); } catch (e) {}
    return ctx.reply("<blockquote>🔄 <b>REFILL PESANAN (GARANSI)</b></blockquote>\n\n👇 <b>Silakan balas pesan ini dengan memasukkan ID PESANAN (Order ID):</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "smm_menu" }]] } });
});

bot.action("smm_cek_pusat", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.reply("❌ Fitur khusus Owner!");
    
    const waitMsg = await ctx.reply("⏳ <i>Mengecek saldo ke server pusat...</i>", {parse_mode: "HTML"});
    try {
        const params = new URLSearchParams();
        params.append('api_id', config.smm.apiId);
        params.append('api_key', config.smm.apiKey);
        
        const res = await axios.post(`${config.smm.baseUrl}/balance`, params);
        
        if (res.data.error) throw new Error(res.data.error);
        
        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, 
            `<blockquote>💰 <b>SALDO PUSAT (FAYUPEDIA)</b></blockquote>\n\n💳 <b>Sisa Saldo:</b> Rp ${Number(res.data.balance).toLocaleString('id-ID')}`, 
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Ke Menu SMM", callback_data: "smm_menu" }]] } }
        );
    } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal mengecek saldo pusat:\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
});

// BAYAR QRIS SMM
bot.action("smm_pay_qris", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    // 🔥 1. EFEK LOADING ESTETIK 🔥
    await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS SMM...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    
    // ⏱️ KASIH DELAY 2 DETIK
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    const fromId = ctx.from.id;
    const orderInfo = smmTempOrder[fromId];
    if (!orderInfo) return ctx.editMessageText("❌ Sesi expired. Silakan cari ulang.", { parse_mode: "HTML" }).catch(()=>{});
    
    const fee = generateRandomFee();
    const price = orderInfo.price + fee;

    // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
    if (price < 1000) {
        return ctx.editMessageText(`<blockquote><b>❌ <b>PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b> untuk transaksi nominal kecil.</i></b></blockquote>`, { 
            parse_mode: "HTML", 
            reply_markup: { inline_keyboard: [[{ text: "↩️ Kembali ke SMM", callback_data: "smm_menu" }]] } 
        }).catch(()=>{});
    }

    const paymentType = config.paymentGateway;
    
    try {
        const pay = await createPayment(paymentType, price, config);
        
        // Pengecekan ekstra kalau API Payment lagi gangguan
        if (!pay || !pay.qris) throw new Error("Gagal mendapatkan QRIS dari provider.");

        orders[fromId] = { type: "smm", name: orderInfo.serviceName, amount: price, fee: fee, serviceId: orderInfo.serviceId, target: orderInfo.target, quantity: orderInfo.quantity, orderId: pay.orderId || null, paymentType: paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
        
        const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
        
        // 🔥 2. HAPUS LOADING & KIRIM GAMBAR 🔥
        try { await ctx.deleteMessage(); } catch (e) {}
        const qrMsg = await ctx.replyWithPhoto(photo, { caption: textOrder(`SMM: ${orderInfo.serviceName.substring(0,30)}`, orderInfo.price, fee), parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
        
        orders[fromId].qrMessageId = qrMsg.message_id;
        startCheck(fromId, ctx);
    } catch (err) {
        // Tangkap error kalau provider payment error
        await ctx.editMessageText(`❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti atau gunakan metode Saldo.`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "↩️ Kembali", callback_data: "smm_menu"}]]} }).catch(()=>{});
    }
});


// BAYAR SALDO SMM
bot.action("smm_pay_saldo", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    // 🔥 1. EFEK LOADING ESTETIK 🔥
    await ctx.editMessageText("<blockquote><b>⏳ <i>Memastikan saldo Anda cukup dan meneruskan pesanan ke server pusat...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    
    // ⏱️ KASIH DELAY 2.5 DETIK
    await new Promise(resolve => setTimeout(resolve, 2500)); 

    const fromId = ctx.from.id;
    const orderInfo = smmTempOrder[fromId];
    if (!orderInfo) return ctx.editMessageText("❌ Sesi expired. Silakan cari ulang.", { parse_mode: "HTML" }).catch(()=>{});
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === fromId);
    
    users[userIndex].balance = users[userIndex].balance || 0;
    
    if (users[userIndex].balance < orderInfo.price) {
        return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nTagihan: Rp${orderInfo.price.toLocaleString('id-ID')}\nSaldo: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(()=>{});
    }
    
    try {
        const params = new URLSearchParams();
        params.append('api_id', config.smm.apiId);
        params.append('api_key', config.smm.apiKey);
        params.append('service', orderInfo.serviceId);
        params.append('target', orderInfo.target);
        params.append('quantity', orderInfo.quantity);
        
        const res = await axios.post(`${config.smm.baseUrl}/order`, params);
        if (res.data.error) throw new Error(res.data.error);
        
        const orderIdPusat = res.data.order || res.data.id;
        
        users[userIndex].balance -= orderInfo.price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + orderInfo.price;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: `SMM: ${orderInfo.serviceName.substring(0,25)}...`, amount: orderInfo.price, type: "smm", details: `Target: ${orderInfo.target} | Qty: ${orderInfo.quantity} | OrderID: ${orderIdPusat}`, timestamp: new Date().toISOString() });
        saveUsers(users);
        
        const buyerInfo = { id: fromId, name: ctx.from.first_name, username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "smm", name: orderInfo.serviceName, amount: orderInfo.price, target: orderInfo.target, qty: orderInfo.quantity, orderId: orderIdPusat }, buyerInfo);
        
        delete smmTempOrder[fromId];
        const successText = `<blockquote><b>✅ ORDER SMM BERHASIL!</b></blockquote>\n\n📦 <b>Layanan:</b> ${escapeHTML(orderInfo.serviceName)}\n🔗 <b>Target:</b> ${escapeHTML(orderInfo.target)}\n📈 <b>Jumlah:</b> ${orderInfo.quantity.toLocaleString('id-ID')}\n💰 <b>Harga:</b> Rp${orderInfo.price.toLocaleString('id-ID')}\n🧾 <b>ID Pesanan SMM:</b> <code>${orderIdPusat}</code>\n💳 <b>Sisa Saldo:</b> Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<i>Pesanan segera diproses. Cek status berkala di menu SMM.</i>`;
        
        // 🔥 2. UBAH LOADING JADI TEKS SUKSES 🔥
        await ctx.editMessageText(successText, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "↩️ Ke Menu SMM", callback_data: "smm_menu"}]]} }).catch(()=>{});
    } catch (e) {
        await ctx.editMessageText(`❌ Terjadi kesalahan API:\n<code>${e.message}</code>`, { parse_mode: "HTML" }).catch(()=>{});
    }
});


// ===== TOMBOL CEK STATUS REFILL =====
bot.action("smm_refill_status", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    pendingSmmRefillStatus[ctx.from.id] = true;
    try { await ctx.deleteMessage(); } catch (e) {}
    return ctx.reply("<blockquote>🔎 <b>CEK STATUS REFILL</b></blockquote>\n\n👇 <b>Silakan balas pesan ini dengan memasukkan REFILL ID (Bukan Order ID):</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batal", callback_data: "smm_menu" }]] } });
});

// ===== FUNGSI PEMBUAT HALAMAN (PAGINATION) =====
async function renderKategoriPage(ctx, page) {
    const ITEMS_PER_PAGE = 10; // 🔥 FIX: Diubah jadi 10 kategori per halaman 🔥
    const totalCats = global.smmCategories.length;
    const totalPages = Math.ceil(totalCats / ITEMS_PER_PAGE);
    
    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentCats = global.smmCategories.slice(startIdx, endIdx);

    const buttons = [];
    for (let i = 0; i < currentCats.length; i += 2) {
        const row = [];
        const realIdx1 = startIdx + i;
        row.push({ text: `📁 ${currentCats[i].substring(0, 18)}`, callback_data: `smm_cat|${realIdx1}` });
        
        if (currentCats[i + 1]) {
            const realIdx2 = startIdx + i + 1;
            row.push({ text: `📁 ${currentCats[i + 1].substring(0, 18)}`, callback_data: `smm_cat|${realIdx2}` });
        }
        buttons.push(row);
    }

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `smm_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `smm_page|${page + 1}` });
    
    buttons.push(navRow);
    buttons.push([{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "smm_menu" }]);

    const text = `<blockquote>📋 <b>DAFTAR KATEGORI SOSMED</b></blockquote>\n\nMenampilkan total <b>${totalCats} Kategori</b> dari pusat.\nSilakan pilih kategori di bawah ini:\n\n<i>*Gunakan tombol Prev/Next untuk melihat halaman lain.</i>`;

    // 🔥 FIX: Transisi mulus pakai Gambar & Anti-Spam Click 🔥
    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.katalogImage, caption: text, parse_mode: "HTML" },
            { reply_markup: { inline_keyboard: buttons } }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, { caption: text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
    }
}


// ===== TOMBOL DAFTAR KATEGORI =====
bot.action("smm_categories", async (ctx) => {
    // 🔥 FIX: Hapus pesan waitMsg text biar gambarnya bisa ngedit dengan mulus
    await ctx.answerCbQuery("⏳ Mengambil daftar kategori dari pusat...", { show_alert: false }).catch(() => {});

    try {
        const params = new URLSearchParams();
        params.append('api_id', config.smm.apiId);
        params.append('api_key', config.smm.apiKey);

        const res = await axios.post(`${config.smm.baseUrl}/services`, params);
        
        let rawData = res.data;
        if (typeof rawData === 'string') { try { rawData = JSON.parse(rawData); } catch(e){} }

        let services = [];
        if (Array.isArray(rawData)) services = rawData;
        else if (rawData.data && Array.isArray(rawData.data)) services = rawData.data;
        else if (rawData.services && Array.isArray(rawData.services)) services = rawData.services;
        else throw new Error(`JAWABAN ASLI FAYUPEDIA:\n${JSON.stringify(rawData, null, 2)}`);

        let uniqueCategories = [...new Set(services.map(s => {
            const cat = s.category || s.kategori || s.brand || s.Category || "";
            return cat ? String(cat).trim() : "";
        }).filter(Boolean))];

        if (uniqueCategories.length === 0) throw new Error("Kategori kosong dari server.");

        global.smmCategories = uniqueCategories;
        global.smmAllServices = services;

        await renderKategoriPage(ctx, 0);

    } catch (err) {
        const detailErr = err.response ? JSON.stringify(err.response.data) : err.message;
        await ctx.reply(`❌ <b>DEBUG SERVER:</b>\n<code>${detailErr}</code>`, { parse_mode: "HTML" });
    }
});

// ===== TANGKAP KLIK NEXT / PREV =====
bot.action(/smm_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!global.smmCategories) {
        return ctx.reply("❌ Sesi habis.", { reply_markup: { inline_keyboard: [[{ text: "📋 Daftar Kategori", callback_data: "smm_categories" }]] } });
    }
    const page = parseInt(ctx.match[1]);
    await renderKategoriPage(ctx, page); 
});

// ===== KLIK SALAH SATU KATEGORI =====
bot.action(/smm_cat\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const catIndex = parseInt(ctx.match[1]);
    const fromId = ctx.from.id;

    if (!global.smmCategories || !global.smmAllServices) return ctx.reply("❌ Sesi habis.", { reply_markup: { inline_keyboard: [[{ text: "📋 Daftar Kategori", callback_data: "smm_categories" }]] } });

    const selectedCategory = global.smmCategories[catIndex];
    
    const filtered = global.smmAllServices.filter(s => {
         const cat = s.category || s.kategori || s.brand || "";
         return String(cat).trim() === selectedCategory;
    });
    
    if (filtered.length === 0) return ctx.reply(`❌ Layanan kosong.`, { parse_mode: "HTML" });

    const topResults = filtered.slice(0, 20); 
    smmTempData[fromId] = topResults; 

    const buttons = topResults.map((s, index) => {
        const basePrice = Number(s.rate || s.price || s.harga || 0);
        const hargaMarkup = Math.ceil(basePrice * config.smm.profitMargin);
        const namaNya = s.name || s.nama || s.layanan || "Layanan";
        return [{ text: `${String(namaNya).substring(0, 35)}... | Rp${hargaMarkup.toLocaleString('id-ID')}`, callback_data: `smm_select|${index}` }];
    });
    buttons.push([{ text: "↩️ Back Kategori", callback_data: "smm_categories" }]);

    const textCat = `<blockquote>📁 <b>KATEGORI: ${escapeHTML(selectedCategory)}</b></blockquote>\n\nMenampilkan ${topResults.length} layanan teratas:\n<i>*Harga yang tertera adalah per 1.000 (1K).</i>`;

    // 🔥 FIX: Transisi masuk kategori mulus & Anti-Spam Click 🔥
    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.katalogImage, caption: textCat, parse_mode: "HTML" },
            { reply_markup: { inline_keyboard: buttons } }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, { caption: textCat, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
    }
});






bot.action("back_to_main_menu", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  const captionText = menuTextBot(ctx);
  const keyboard = {
    inline_keyboard: [
      [ 
         { text: "🛍️ Katalog Produk", callback_data: "katalog" } 
      ],
      [  
         { text: "💳 Deposit Saldo", callback_data: "deposit_menu" }, 
         { text: "🏆 Top Pengguna", callback_data: "top_users" } 
      ],
      [ 
         { text: "🌟 Cek Rating", callback_data: "cek_rating" }
      ],
      [ 
         { text: "👤 Informasi", callback_data: "informasi_admin" },
         { text: "⭐ Developer ", callback_data: "sosmed_admin" }
      ],
      [
         { text: "🎧 CS / Tiket Bantuan", callback_data: "cs_ai_start" }
      ]
    ]
  };

  try {
    await ctx.editMessageMedia(
      { type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" },
      { reply_markup: keyboard }
    );
  } catch (err) {
    // 🔥 FIX: JIKA PESAN SEBELUMNYA CUMA TEKS, HAPUS LALU KIRIM FOTO BARU 🔥
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.menuImage, {
            caption: captionText, parse_mode: "HTML", reply_markup: keyboard
        }).catch(() => {});
    }
  }
});

    
bot.action("katalog", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  // 🔥 HAPUS GAMBAR DARI /HELP JIKA ADA 🔥
  if (global.helpPhotos && global.helpPhotos[ctx.from.id]) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, global.helpPhotos[ctx.from.id]); } catch (e) {}
      delete global.helpPhotos[ctx.from.id];
  }

  const storeMenuKeyboard = {
    inline_keyboard: [
      [
        { text: "📡 ☇ Panel", callback_data: "buypanel" },
        { text: "👑 ☇ Admin Panel", callback_data: "buyadmin" }
      ],
      [
        { text: "🖥 ☇ Vps", callback_data: "buyvps" },
        { text: "🌐 ☇ Akun Do", callback_data: "buydo" }
      ],
      [
        { text: "📱 ☇ Apk Prem", callback_data: "buyapp" },
        { text: "🗂 ☇ Script", callback_data: "buyscript" }
      ],
      [
        { text: "📄 ☇ Prompt AI", callback_data: "buyprompt" },
        { text: "🌐 ☇ Subdomain", callback_data: "buysubdo_menu" }
      ],
      [
        { text: "📈 ☇ SMM Panel", callback_data: "smm_menu" }, // 🔥 INI KOMA YANG KETINGGALAN TADI
        { text: "🎮 ☇ Topup Game", callback_data: "menu_listharga" }
      ],
      [
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }
      ]
    ]
  };

  // 👇 INI DIA MESIN TOMBOL RAHASIA OWNER-NYA 👇
  if (isOwner(ctx)) {
      // Sisipkan tombol Pengaturan tepat di atas tombol BACK (Index terakhir -1)
      storeMenuKeyboard.inline_keyboard.splice(-1, 0, [
          { text: "⚙️ Pengaturan Fitur (Owner)", callback_data: "admin_features" }
      ]);
  }

  const captionText = `
<blockquote>🛍️ 𝗗𝗔𝗙𝗧𝗔𝗥 𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 𝗕𝗢𝗧
━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih kategori produk yang ingin dibeli:</blockquote>
`;

  try {
    await ctx.editMessageMedia(
      { type: "photo", media: config.katalogImage, caption: captionText, parse_mode: "HTML" },
      { reply_markup: storeMenuKeyboard }
    );
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, {
            caption: captionText, parse_mode: "HTML", reply_markup: storeMenuKeyboard
        }).catch(() => {});
    }
  }
});



bot.action("informasi_admin", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  const storeMenuKeyboard = {
    inline_keyboard: [
      [
         { text: "👤 Cek Profil", callback_data: "profile" }, 
         { text: "📮 Cek History", callback_data: "history" } 
      ],
      [  
         { text: "🤝 CODE REFERRAL", callback_data: "menu_referral" } 
      ],
      [ 
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }
      ]
    ]
  };
  const captionText = `
<blockquote>👤 <b>INFORMASI AKUN & AKTIVITAS</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━
Pusat informasi untuk memantau detail akun, riwayat transaksi, dan program afiliasi (referral) kamu.

<b>📝 Detail Menu:</b>
• <b>Cek Profil:</b> Lihat detail ID, sisa saldo, dan statistik akun.
• <b>Cek History:</b> Pantau riwayat pembelian dan transaksi terakhir.
• <b>Code Referral:</b> Dapatkan saldo gratis dengan membagikan link!

👇 <i>Silakan pilih menu di bawah ini:</i>
`.trim();

  try {
    await ctx.editMessageMedia(
      { type: "photo", media: config.katalogImage, caption: captionText, parse_mode: "HTML" },
      { reply_markup: storeMenuKeyboard }
    );
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, {
            caption: captionText, parse_mode: "HTML", reply_markup: storeMenuKeyboard
        }).catch(() => {});
    }
  }
});


bot.action("sosmed_admin", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  const storeMenuKeyboard = {
    inline_keyboard: [
      [
         { text: "📸 Instagram", url: config.sosmed.ig }, 
         { text: "💬 WhatsApp", url: config.sosmed.wa } 
      ],
      [
         { text: "🌟 Testimoni", url: config.sosmed.testi } 
      ],
      [
         { text: "✈️ Telegram", url: config.sosmed.tele },
         { text: "🎵 TikTok", url: config.sosmed.tiktok } 
      ],
      [ 
         { text: "📢 Ch Tele", url: config.sosmed.chTele },
         { text: "🌐 Ch WA", url: config.sosmed.chWa } 
      ],
      [ 
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }
      ]
    ]
  };

  const captionText = `
<blockquote>🌐 <b>OFFICIAL SOCIAL MEDIA</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━
Mari berteman lebih dekat! Ikuti semua akun sosial media resmi kami untuk mendapatkan <i>update</i> terbaru, promo diskon, dan informasi menarik lainnya.

<b>Kenapa harus follow?</b>
• <b>Update Produk:</b> Info produk baru & restock harian.
• <b>Promo Spesial:</b> Diskon kilat dan bagi-bagi voucher khusus <i>followers</i>.
• <b>Testimoni:</b> Bukti transaksi 100% aman & terpercaya.

👇 <i>Klik tombol di bawah ini untuk mengunjungi profil kami:</i>
`.trim();

  try {
    await ctx.editMessageMedia(
      { type: "photo", media: config.katalogImage, caption: captionText, parse_mode: "HTML" },
      { reply_markup: storeMenuKeyboard }
    );
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.katalogImage, {
            caption: captionText, parse_mode: "HTML", reply_markup: storeMenuKeyboard
        }).catch(() => {});
    }
  }
});




bot.action("buysubdo_menu", async (ctx) => {
  const settings = loadSettings();
  if (!settings.subdo) return ctx.answerCbQuery("🚫 Fitur Beli Subdomain sedang Offline / Dimatikan.", { show_alert: true });

    await ctx.answerCbQuery().catch(() => {});
    
    activeMenus[ctx.from.id] = ctx.callbackQuery.message.message_id;

    const hargaSubdo = 5000; // SILAKAN UBAH HARGA DI SINI

    const textSubdo = `
<blockquote>🌐 <b>BUY SUBDOMAIN AUTOMATIC</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━
Subdomain berfungsi untuk mengubah IP VPS kamu menjadi nama domain (contoh: <code>panel.namakamu.com</code>). Sangat cocok untuk membuat Web, Panel Pterodactyl, dll.

💰 <b>Harga:</b> Rp ${hargaSubdo.toLocaleString('id-ID')} / Subdomain
⚙️ <b>Proses:</b> Otomatis (Cloudflare API)
📡 <b>Server Domain:</b> Active 🟢

<blockquote> 👇 <b>CARA ORDER:</b></blockquote>
Ketik perintah di bawah ini pada chat:
<code>${config.prefix}buysubdo namasubdomain ip_vps</code>

<blockquote> <b>Contoh:</b></blockquote>
<code>${config.prefix}buysubdo serverku 192.168.1.1</code>

<blockquote>📜 <b>POLICY & NOTES </b></blockquote>
• Anti-DDoS: Strict isolation applied✅
• VPS Sync: IP must be active (Live)✅
• Node Setup: Prefix [node] allowed✅
• Service: High-availability DNS✅
• Otomatis Free 1 domain node untuk panel ptero✨
`.trim();

    const keyboard = {
        inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "katalog" }]]
    };

    try {
        await ctx.editMessageMedia(
            { 
                type: "photo", 
                media: config.katalogImage, 
                caption: textSubdo, 
                parse_mode: "HTML" 
            },
            { reply_markup: keyboard }
        );
    } catch (err) {
        // 🔥 FIX: JIKA PESAN SEBELUMNYA CUMA TEKS, HAPUS LALU KIRIM FOTO BARU 🔥
        if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
            await ctx.deleteMessage().catch(() => {});
            await ctx.replyWithPhoto(config.katalogImage, {
                caption: textSubdo, 
                parse_mode: "HTML", 
                reply_markup: keyboard
            }).catch(() => {});
        }
    }
});


// --- KONFIRMASI SUBDOMAIN ---
bot.action(/^sub_sel\|(.+)\|(.+)\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const [host, ip, domain] = ctx.match.slice(1);
    const hargaSubdo = 5000; 
    
    const text = `<blockquote><b>📝 Konfirmasi Pemesanan Subdomain</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🌐 Subdomain: <code>${host}.${domain}</code>\n📌 Pointing IP: <code>${ip}</code>\n💰 Harga: Rp${hargaSubdo.toLocaleString("id-ID")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Yakin ingin melanjutkan pembayaran?`;

    return ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Konfirmasi", callback_data: `sub_conf|${host}|${ip}|${domain}` }],
                [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
            ]
        }
    }).catch(() => {});
});

// --- KONFIRMASI SUBDOMAIN ---
bot.action(/^sub_conf\|(.+)\|(.+)\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const [host, ip, domain] = ctx.match.slice(1);
    const userId = ctx.from.id;
    const basePrice = 5000;

    // 🔥 MESIN DISKON BEKERJA 🔥
    const harga = getDiscountPrice(userId, basePrice);

    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;

    let teksHarga = `💰 <b>Harga Normal:</b> Rp${basePrice.toLocaleString('id-ID')}`;
    if (harga.diskonPersen > 0) {
        teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${basePrice.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
    }

    return ctx.editMessageText(
        `🛒 <b>Pilih Metode Pembayaran</b>\n\n🌐 Produk: Subdomain ${host}.${domain}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
        {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [
                    [{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `sub_ps|${host}|${ip}|${domain}` }],
                    [{ text: `📷 Bayar via QRIS`, callback_data: `sub_pq|${host}|${ip}|${domain}` }],
                    [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                ]
            }
        }
    );
});

// --- BAYAR SUBDOMAIN VIA QRIS ---
bot.action(/^sub_pq\|(.+)\|(.+)\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Subdomain...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    const [host, ip, domain] = ctx.match.slice(1);
    const userId = ctx.from.id;
    const basePrice = 5000;

    // 🔥 MESIN DISKON BEKERJA 🔥
    const harga = getDiscountPrice(userId, basePrice);
    const fee = generateRandomFee();
    const price = harga.finalPrice + fee;
    
    if (price < 1000) {
        return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\nMinimal transaksi QRIS Rp1.000.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } }).catch(()=>{});
    }

    const paymentType = config.paymentGateway;
    try {
        const pay = await createPayment(paymentType, price, config);
        if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS");

        orders[userId] = { type: "subdo", host, ip, domain, name: `Subdomain ${host}.${domain}`, amount: price, fee, orderId: pay.orderId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
        const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
        try { await ctx.deleteMessage(); } catch (e) {}

        let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
        const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : Subdomain ${host}.${domain}\n• Harga Normal    : Rp${basePrice.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

        const qrMsg = await ctx.replyWithPhoto(photo, { caption: captionStruk, parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    } catch(e) { await ctx.editMessageText(`❌ Gagal: ${e.message}`, {parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]}}).catch(()=>{}); }
});

// --- BAYAR SUBDOMAIN VIA SALDO ---
bot.action(/^sub_ps\|(.+)\|(.+)\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & menembak API Cloudflare...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    const [host, ip, domain] = ctx.match.slice(1);
    const userId = ctx.from.id;
    const basePrice = 5000;

    // 🔥 MESIN DISKON BEKERJA 🔥
    const harga = getDiscountPrice(userId, basePrice);
    const price = harga.finalPrice;

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].balance = users[userIndex].balance || 0;
    
    if (users[userIndex].balance < price) {
        return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nHarga Final: Rp${price.toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(()=>{});
    }

    users[userIndex].balance -= price;
    users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
    users[userIndex].history = users[userIndex].history || [];
    users[userIndex].history.push({ product: `Subdomain: ${host}.${domain}`, amount: price, type: "subdo", details: `IP: ${ip}`, timestamp: new Date().toISOString() });
    saveUsers(users);

    const api = config.subdomain[domain];
    const panel = `${host}.${domain}`;
    const node = `node-${host}.${domain}`; 

    try {
        const createSub = async (name) => {
            const res = await axios.post(`https://api.cloudflare.com/client/v4/zones/${api.zone}/dns_records`, { type: "A", name, content: ip, ttl: 3600, proxied: false }, { headers: { Authorization: `Bearer ${api.apitoken}`, "Content-Type": "application/json" } });
            if (!res.data.success) throw new Error("Gagal CF");
        };
        await createSub(panel); await createSub(node);  
        
        const buyerInfo = { id: userId, name: ctx.from.first_name, username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "subdo", name: panel, amount: price, ip: ip }, buyerInfo);

        const textSukses = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n🌐 <b>Domain Panel:</b> <code>${panel}</code>\n🌐 <b>Domain Node:</b> <code>${node}</code>\n📌 <b>Target IP:</b> <code>${ip}</code>\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<i>Subdomain sudah aktif. (Propagasi DNS max 1-5 menit)</i>`;
        await ctx.editMessageText(textSukses, { parse_mode: "HTML" }).catch(()=>{});
    } catch (err) {
        users[userIndex].balance += price; saveUsers(users);
        await ctx.editMessageText("❌ Gagal membuat subdomain (Cloudflare API Error). Saldo telah dikembalikan.").catch(()=>{});
    }
});



    // ===== MASUK MODE CS (LIVE CHAT) =====
    bot.action("cs_ai_start", async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const fromId = ctx.from.id;
        pendingCsChat[fromId] = true; // Kunci status user
        
        const captionText = `
<blockquote>🎧 <b>LIVE CHAT / TIKET BANTUAN</b></blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo! Ada yang bisa kami bantu? 

Silakan ketik keluhan, pertanyaan, atau kendala kamu (misal: deposit nyangkut, pesanan error, dll) dengan membalas pesan ini. 

Pesanmu akan langsung diteruskan ke Admin / Owner. Admin akan membalas secepat mungkin.

👇 <i>Ketik pesanmu di bawah...</i>
`.trim();

        const keyboard = {
            inline_keyboard: [
                [{ text: "🛑 Akhiri Sesi Chat", callback_data: "cs_ai_stop" }]
            ]
        };

        try {
            await ctx.editMessageMedia(
                { type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" },
                { reply_markup: keyboard }
            );
        } catch (err) {
            if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
                await ctx.deleteMessage().catch(() => {});
                await ctx.replyWithPhoto(config.menuImage, {
                    caption: captionText, parse_mode: "HTML", reply_markup: keyboard
                }).catch(() => {});
            }
        }
    });

    // ===== KELUAR MODE CS =====
    bot.action("cs_ai_stop", async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const fromId = ctx.from.id;
        delete pendingCsChat[fromId]; // Buka kunci status
        
        // Langsung kembalikan ke menu utama dengan mulus
        const captionText = menuTextBot(ctx);
        const keyboard = {
            inline_keyboard: [
                [ { text: "🛍️ Katalog Produk", callback_data: "katalog" } ],
                [ { text: "💳 Deposit Saldo", callback_data: "deposit_menu" }, { text: "🏆 Top Pengguna", callback_data: "top_users" } ],
                [ { text: "👤 Informasi", callback_data: "informasi_admin" }, { text: "⭐ Developer ", callback_data: "sosmed_admin" } ],
                [ { text: "🎧 CS / Tiket Bantuan", callback_data: "cs_ai_start" } ] // Tulisan tombol gue ganti
            ]
        };

        try {
            await ctx.editMessageMedia(
                { type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" },
                { reply_markup: keyboard }
            );
        } catch (err) {
            if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
                await ctx.deleteMessage().catch(() => {});
                await ctx.replyWithPhoto(config.menuImage, {
                    caption: captionText, parse_mode: "HTML", reply_markup: keyboard
                }).catch(() => {});
            }
        }
    });




bot.action("menu_referral", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});

  const fromId = ctx.from.id;
  
  // Ambil Data User
  const users = loadUsers();
  const myUser = users.find(u => u.id === fromId);

  // Siapkan Data Statistik & Link
  const myRefs = myUser ? (myUser.referrals || 0) : 0;
  const myEarnings = myUser ? (myUser.ref_earnings || 0) : 0;
  const refLink = `https://t.me/${config.botUsername}?start=ref_${fromId}`;

  // Keyboard Menu
  const referralKeyboard = {
    inline_keyboard: [
      [
        { text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "informasi_admin" }
      ]
    ]
  };

  // Caption / Teks Menu Referral
  const captionText = `
<blockquote><b>🤝 PROGRAM REFERRAL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
Dapatkan saldo gratis dengan cara mengajak temanmu menggunakan bot ini!</blockquote>

Setiap teman yang mendaftar melalui link kamu, kamu akan mendapatkan bonus saldo.

🎁 <b>Bonus Reward:</b> Rp1.000 / teman
(Bonus otomatis masuk ke saldo bot kamu)

👇 <b>Link Referral Unik Kamu:</b>
<code>${refLink}</code>
<i>(Tap link di atas untuk menyalin)</i>

📊 <b>Statistik Kamu Saat Ini:</b>
👥 Teman diundang: <b>${myRefs} Orang</b>
💰 Total pendapatan: <b>Rp${myEarnings.toLocaleString('id-ID')}</b>
`.trim();

  const imageUrl =  config.referralImage;

  try {
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: imageUrl,
        caption: captionText,
        parse_mode: "HTML"
      },
      {
        reply_markup: referralKeyboard
      }
    );
  } catch (err) {
    if (!err.description?.includes("message is not modified")) {
      console.error("Error edit menu referral:", err);
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
        try { await ctx.deleteMessage(); } catch (e) { return; }

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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
    });

    bot.action("back_stock_category", async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
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
    
    // ===== OPSI PEMBAYARAN APP (DENGAN DISKON) =====
    bot.action(/confirm_app_payment\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) return ctx.reply("❌ Item tidak ditemukan!");
        if (items[index].stock <= 0) return ctx.reply("❌ Stok habis!");

        const item = items[index];
        const userId = ctx.from.id;
        
        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, item.price);
        
        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // Bikin UI coret harga kalau dapet diskon
        let teksHarga = `💰 <b>Harga Normal:</b> Rp${item.price.toLocaleString('id-ID')}`;
        if (harga.diskonPersen > 0) {
            teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${item.price.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
        }

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: ${category.toUpperCase()} - ${item.description}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `pay_saldo_app|${category}|${index}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_app|${category}|${index}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        ).catch(err => console.log("Gagal edit pesan:", err));
    });

    // ===== BAYAR APP VIA QRIS =====
    bot.action(/pay_qris_app\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Apps...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) return ctx.editMessageText("❌ Item tidak ditemukan!", { parse_mode: "HTML" }).catch(()=>{});
        const item = items[index];
        if (item.stock <= 0) return ctx.editMessageText("❌ Stok habis!", { parse_mode: "HTML" }).catch(()=>{});

        const userId = ctx.from.id;

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, item.price);
        const fee = generateRandomFee();
        const price = harga.finalPrice + fee;

        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b>.</i></blockquote>`, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } 
            }).catch(()=>{});
        }

        const name = `${category.toUpperCase()} - ${item.description}`;
        const paymentType = config.paymentGateway;

        try {
            const pay = await createPayment(paymentType, price, config);
            if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS dari Server Payment");

            orders[userId] = {
                type: "app", category, itemIndex: index, name, description: item.description,
                account: item.accounts[0], accounts: item.accounts, amount: price, fee,
                orderId: pay.orderId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000
            };

            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            try { await ctx.deleteMessage(); } catch (e) {}

            // Bikin Struk Keren
            let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
            const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : ${escapeHTML(name)}\n• Harga Normal    : Rp${item.price.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

            const qrMsg = await ctx.replyWithPhoto(photo, {
                caption: captionStruk, parse_mode: "html",
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] }
            });

            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            await ctx.editMessageText(`❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti.`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
        }
    });

    // ===== BAYAR APP VIA SALDO =====
    bot.action(/pay_saldo_app\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & mengambil stok Apps...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];
        
        if (!items || !items[index]) return ctx.editMessageText("❌ Item tidak ditemukan!").catch(()=>{});
        const item = items[index];
        const userId = ctx.from.id;

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, item.price);
        const price = harga.finalPrice;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) {
            return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Final: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" }).catch(()=>{});
        }

        if (item.stock <= 0) return ctx.editMessageText("❌ Maaf, stok baru saja habis!").catch(()=>{});

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = `${category.toUpperCase()} - ${item.description}`;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "app", timestamp: new Date().toISOString() });
        saveUsers(users);

        const sentAccount = item.accounts.shift();
        item.stock -= 1;

        if (item.stock <= 0) {
            stocks[category].splice(index, 1);
            if (stocks[category].length === 0) delete stocks[category];
        }
        saveStocks(stocks);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "app", name: name, amount: price, category: category, description: item.description }, buyerInfo);

        const fileName = `${category}_${Date.now()}.txt`;
        const fileContent = `=== DATA AKUN ${category.toUpperCase()} ===\n\nProduk: ${escapeHTML(name)}\nKeterangan: ${escapeHTML(item.description)}\nHarga: Rp${toRupiah(price)}\nTanggal: ${new Date().toLocaleString('id-ID')}\n\n=== DATA AKUN ===\n${escapeHTML(sentAccount)}\n\n=== INSTRUKSI ===\n1. Login dengan akun di atas\n2. Nikmati fitur premium\n3. Jangan bagikan akun ke orang lain\n4. Akun ini untuk personal use\n\n=== SUPPORT ===\nJika ada masalah, hubungi: @${config.ownerUsername}`;

        const tempFilePath = path.join(__dirname, 'temp', fileName);
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(tempFilePath, fileContent);

        const appText = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n📱 Produk: ${escapeHTML(name)}\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n📁 Data akun telah dikirim dalam file .txt\n📝 Silakan download file untuk melihat detail akun\n\n<blockquote><b>📌 Cara Pakai:</b></blockquote>\n1. Login dengan akun yang tersedia\n2. Nikmati fitur premium\n3. Jangan bagikan akun ke orang lain`;

        try { await ctx.deleteMessage(); } catch(e){}

        try {
            await ctx.telegram.sendMessage(ctx.chat.id, appText, { parse_mode: "html" });
            await ctx.telegram.sendDocument(ctx.chat.id, { source: tempFilePath, filename: fileName }, {
                caption: `📁 File Data Akun: ${escapeHTML(name)}`, parse_mode: "html"
            });
            setTimeout(() => { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); }, 5000);
        } catch (error) {
            const fallbackText = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n📱 Produk: ${escapeHTML(name)}\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>🔑 Data Akun: </b></blockquote>\n<code>${escapeHTML(sentAccount)}</code>\n\n⚠️ Note: Akun ini untuk personal use`;
            await ctx.telegram.sendMessage(ctx.chat.id, fallbackText, { parse_mode: "html" });
        }
    });


// Handler untuk kembali ke pilihan paket
bot.action(/back_to_packages/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});

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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
    try { await ctx.deleteMessage(); } catch (e) { return; }

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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
    await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
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

    // ===== OPSI PEMBAYARAN PANEL (DENGAN DISKON) =====
    bot.action(/confirm_panel_payment\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;
        
        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];
        if (!basePrice) return ctx.reply("Harga panel tidak ditemukan!");

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);
        
        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // Bikin UI coret harga kalau dapet diskon
        let teksHarga = `💰 <b>Harga Normal:</b> Rp${basePrice.toLocaleString('id-ID')}`;
        if (harga.diskonPersen > 0) {
            teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${basePrice.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
        }

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Panel ${ram === "unli" ? "Unlimited" : ram}\n👤 Username: ${username}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `pay_saldo_panel|${ram}|${username}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_panel|${ram}|${username}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        ).catch(err => console.log("Gagal edit pesan:", err));
    });

    // ===== BAYAR PANEL VIA QRIS =====
    bot.action(/pay_qris_panel\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Panel...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;
        
        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];
        if (!basePrice) return ctx.editMessageText("❌ Harga panel tidak ditemukan!").catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);
        const fee = generateRandomFee();
        const price = harga.finalPrice + fee;

        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b>.</i></blockquote>`, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } 
            }).catch(()=>{});
        }

        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;
        const paymentType = config.paymentGateway;
        try {
            const pay = await createPayment(paymentType, price, config);
            if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS dari Server Payment");

            orders[userId] = { type: "panel", username, ram, name, amount: price, fee, orderId: pay.orderId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            try { await ctx.deleteMessage(); } catch (e) {}

            // Bikin Struk Keren
            let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
            const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : ${escapeHTML(name)}\n• Harga Normal    : Rp${basePrice.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

            const qrMsg = await ctx.replyWithPhoto(photo, { caption: captionStruk, parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch(e) { await ctx.editMessageText(`❌ Gagal membuat QRIS:\n<code>${e.message}</code>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } }).catch(()=>{}); }
    });

    // ===== BAYAR PANEL VIA SALDO =====
    bot.action(/pay_saldo_panel\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & memproses Panel...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const [ram, username] = ctx.match[1].split("|");
        const userId = ctx.from.id;
        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];
        if (!basePrice) return ctx.editMessageText("❌ Harga panel tidak ditemukan!").catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);
        const price = harga.finalPrice;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Final: Rp${price.toLocaleString('id-ID')}`, { parse_mode: "HTML" }).catch(()=>{});

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "panel", details: `Username: ${username}, RAM: ${ram === "unli" ? "Unlimited" : ram + "GB"}`, timestamp: new Date().toISOString() });
        saveUsers(users);

        const buyerInfo = { id: userId, name: ctx.from.first_name, username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "panel", name, amount: price, username, ram }, buyerInfo);

        const ramVal = ram === "unli" ? "Unlimited" : `${ram}GB`;
        const fixUsername = username + randomNumber(3);
        let res = await createPanel(fixUsername, ramVal.toLowerCase());
        
        if (!res.success) return ctx.editMessageText(`❌ Error membuat panel.\nHubungi admin @${config.ownerUsername}`).catch(()=>{});
        res = res.data;
        
        const teksPanel = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n👤 Username: <code>${escapeHTML(res.username)}</code>\n🔑 Password: <code>${escapeHTML(res.password)}</code>\n💾 RAM: ${ramVal}\n🆔 Server ID: ${res.serverId}\n📛 Server Name: ${escapeHTML(res.serverName)}\n⏳ Expired: 1 Bulan\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>📌 Cara Login:</b></blockquote>\n1. Klik tombol Login Panel di bawah\n2. Masukkan username & password\n3. Server siap dipakai!`;
        await ctx.editMessageText(teksPanel, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "🔗 Login Panel", url: res.panelUrl }]] } }).catch(()=>{});
    });


    // ===== OPSI PEMBAYARAN ADMIN PANEL (DENGAN DISKON) =====
    bot.action(/confirm_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const username = ctx.match[1];
        const userId = ctx.from.id;

        const basePrice = hargaAdminPanel;
        if (!basePrice) return ctx.reply("❌ Harga admin panel tidak ditemukan!");

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);

        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // Bikin UI coret harga kalau dapet diskon
        let teksHarga = `💰 <b>Harga Normal:</b> Rp${basePrice.toLocaleString('id-ID')}`;
        if (harga.diskonPersen > 0) {
            teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${basePrice.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
        }

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Admin Panel\n👤 Username: ${escapeHTML(username)}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `pay_saldo_admin|${username}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_admin|${username}` }],
                        [{ text: "❌ Batalkan", callback_data: "cancel_order" }]
                    ]
                }
            }
        ).catch(err => console.log("Gagal edit pesan:", err));
    });

    // ===== BAYAR ADMIN VIA QRIS =====
    bot.action(/pay_qris_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Admin Panel...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const username = ctx.match[1];
        const userId = ctx.from.id;
        const basePrice = hargaAdminPanel;

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);
        const fee = generateRandomFee();
        const price = harga.finalPrice + fee;
        
        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b>.</i></blockquote>`, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } 
            }).catch(()=>{});
        }

        const name = "Admin Panel";
        const paymentType = config.paymentGateway;

        try {
            const pay = await createPayment(paymentType, price, config);
            if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS dari Server Payment");

            orders[userId] = { username: username, type: "admin", name, amount: price, fee, orderId: pay.orderId || null, paymentType: paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            
            // 🔥 2. HAPUS LOADING & MUNCULKAN QRIS 🔥
            try { await ctx.deleteMessage(); } catch (e) {}

            // Bikin Struk Keren
            let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
            const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : ${escapeHTML(name)}\n• Harga Normal    : Rp${basePrice.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

            const qrMsg = await ctx.replyWithPhoto(photo, { caption: captionStruk, parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            await ctx.editMessageText(`❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti atau gunakan metode Saldo.`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
        }
    });

    // ===== BAYAR ADMIN VIA SALDO =====
    bot.action(/pay_saldo_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & membuat Admin Panel...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const username = ctx.match[1];
        const userId = ctx.from.id;
        const basePrice = hargaAdminPanel;

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, basePrice);
        const price = harga.finalPrice;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) {
            return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Final: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" }).catch(()=>{});
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = "Admin Panel";
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "admin", details: `Username: ${username}`, timestamp: new Date().toISOString() });
        saveUsers(users);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "admin", name, amount: price, username }, buyerInfo);

        const fixUsername = username + randomNumber(3);
        try {
            const res = await createAdmin(fixUsername);
            const teksAdmin = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n🆔 User ID: ${res.id}\n👤 Username: <code>${escapeHTML(res.username)}</code>\n🔑 Password: <code>${escapeHTML(res.password)}</code>\n⏳ Expired: 1 Bulan\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>📌 Cara Login:</b></blockquote>\n1. Klik tombol Login Panel di bawah\n2. Masukkan username & password\n3. Admin panel siap digunakan!`;
            
            // 🔥 2. UBAH LOADING JADI TEKS SUKSES 🔥
            await ctx.editMessageText(teksAdmin, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "🔗 Login Panel", url: res.panel }]] } }).catch(()=>{});
        } catch (e) {
            return ctx.editMessageText(`❌ Error! Terjadi kesalahan saat membuat admin panel.\nSilahkan hubungi admin @${config.ownerUsername}`).catch(()=>{});
        }
    });




bot.action(/^script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
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
━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Produk: Script ${escapeHTML(sc.name)}\n
💰 Harga: Rp${Number(sc.price).toLocaleString("id-ID")}
🕒 Waktu: ${waktu}
━━━━━━━━━━━━━━━━━━━━━━━━━━
<blockquote><b>📝 Deskripsi:</b></blockquote>
${escapeHTML(sc.desk || "-")}
━━━━━━━━━━━━━━━━━━━━━━━━━━
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

    // ===== OPSI PEMBAYARAN SCRIPT (DENGAN DISKON) =====
    bot.action(/confirm_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);

        const users = loadUsers();
        const user = users.find(u => u.id === userId);
        const saldo = user ? (user.balance || 0) : 0;

        // Bikin UI coret harga kalau dapet diskon
        let teksHarga = `💰 <b>Harga Normal:</b> Rp${sc.price.toLocaleString('id-ID')}`;
        if (harga.diskonPersen > 0) {
            teksHarga = `💰 <b>Harga Normal:</b> <s>Rp${sc.price.toLocaleString('id-ID')}</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -Rp${harga.potongan.toLocaleString('id-ID')}\n💳 <b>Harga Akhir: Rp${harga.finalPrice.toLocaleString('id-ID')}</b>`;
        }

        return ctx.editMessageText(
            `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n${teksHarga}\n\n💳 Saldo Anda: Rp${saldo.toLocaleString('id-ID')}`, 
            {
                parse_mode: "html",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `💰 Bayar via Saldo (Rp${harga.finalPrice.toLocaleString('id-ID')})`, callback_data: `pay_saldo_script|${sc.name}` }],
                        [{ text: `📷 Bayar via QRIS`, callback_data: `pay_qris_script|${sc.name}` }],
                        [{ text: "❌ Batalkan", callback_data: "back_to_script" }]
                    ]
                }
            }
        ).catch(err => console.log("Gagal edit pesan:", err));
    });

    // ===== BAYAR SCRIPT VIA QRIS =====
    bot.action(/pay_qris_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS otomatis...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        
        // ⏱️ KASIH DELAY 2 DETIK BIAR KELIATAN MIKIR
        await new Promise(resolve => setTimeout(resolve, 2000)); 

        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.editMessageText("<blockquote><b>❌ Script tidak ditemukan</b></blockquote>", { parse_mode: "HTML" }).catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);
        const fee = generateRandomFee();
        const price = harga.finalPrice + fee; 
        
        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b> untuk transaksi nominal kecil.</i></blockquote>`, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } 
            }).catch(()=>{});
        }

        const paymentType = config.paymentGateway;

        try {
            const pay = await createPayment(paymentType, price, config);
            if (!pay || !pay.qris) throw new Error("Gagal membuat QRIS dari Server Payment");
            
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;

            orders[userId] = {
                type: "script", name: sc.name, amount: price, fee, file: sc.file,
                orderId: pay.orderId || null, paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000
            };

            try { await ctx.deleteMessage(); } catch (e) {}
            
            // Bikin Struk Keren
            let infoDiskon = harga.potongan > 0 ? `\n• Diskon Kasta    : -Rp${harga.potongan.toLocaleString('id-ID')}` : "";
            const captionStruk = `<blockquote><b>━〔 DETAIL PEMBAYARAN QRIS 〕━</b></blockquote>\n<blockquote>🧾 <b>Informasi Pesanan</b>\n• Produk          : ${escapeHTML(sc.name)}\n• Harga Normal    : Rp${sc.price.toLocaleString('id-ID')}${infoDiskon}\n• Biaya Layanan   : Rp${fee.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n<blockquote>💳 <b>Total Tagihan</b> : Rp${price.toLocaleString('id-ID')}</blockquote>\n<blockquote>⏳ <b>Batas Waktu:</b> 6 Menit.</blockquote>`;

            const qrMsg = await ctx.replyWithPhoto(photo, {
                caption: captionStruk,
                parse_mode: "html",
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] }
            });

            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            await ctx.editMessageText(`❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti.`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
        }
    });

    // ===== BAYAR SCRIPT VIA SALDO =====
    bot.action(/pay_saldo_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo Anda cukup dan memproses file...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        
        // ⏱️ KASIH DELAY 2 DETIK
        await new Promise(resolve => setTimeout(resolve, 2000)); 

        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.editMessageText("❌ Script tidak ditemukan.", { parse_mode: "HTML" }).catch(()=>{});

        // 🔥 MESIN DISKON BEKERJA 🔥
        const harga = getDiscountPrice(userId, sc.price);
        const price = harga.finalPrice;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) {
            return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Final: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" }).catch(()=>{});
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: `Script: ${sc.name}`, amount: price, type: "script", details: sc.desk || "-", timestamp: new Date().toISOString() });
        saveUsers(users);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "script", name: sc.name, amount: price }, buyerInfo);

        await ctx.editMessageText(`<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n💰 Harga Dibayar: Rp${price.toLocaleString('id-ID')} <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<i>File script sedang dikirim...</i>`, { parse_mode: "html" }).catch(()=>{});

        try {
            await ctx.telegram.sendDocument(ctx.chat.id, { source: sc.file }, { caption: `📁 Script: ${escapeHTML(sc.name)}\n🎉 <i>Terima kasih telah menggunakan diskon ${harga.roleName}!</i>`, parse_mode: "html" });
        } catch (err) {
            await ctx.reply("❌ Gagal mengirim file script. Silakan hubungi admin.");
        }
    });

bot.action("back_to_script", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderScriptPage(ctx, 0); // Kembalikan ke katalog rapi
});


    // ===== BAYAR ADMIN VIA QRIS =====
    bot.action(/pay_qris_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>🔄 <i>Sedang membuat QRIS Admin Panel...\nMohon tunggu sebentar.</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const user = ctx.match[1];
        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = fee + hargaAdminPanel;
        
        // 🔥 FIX: SATPAM HARGA MINIMAL QRIS (Rp 1.000) 🔥
        if (price < 1000) {
            return ctx.editMessageText(`<blockquote><b>❌ PEMBAYARAN DITOLAK!</b>\n\nTotal tagihan Anda (Rp${price}) terlalu kecil untuk menggunakan metode QRIS.\n\n⚠️ <i>Minimal transaksi QRIS adalah <b>Rp1.000</b>. Silakan gunakan metode <b>Bayar via Saldo</b> untuk transaksi nominal kecil.</i></blockquote>`, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "cancel_order" }]] } 
            }).catch(()=>{});
        }

        const name = "Admin Panel";
        const paymentType = config.paymentGateway;

        try {
            const pay = await createPayment(paymentType, price, config);

            orders[userId] = { username: user, type: "admin", name, amount: price, fee, orderId: pay.orderId || null, paymentType: paymentType, chatId: ctx.chat.id, expireAt: Date.now() + 6 * 60 * 1000 };
            const photo = paymentType === "pakasir" ? { source: pay.qris } : pay.qris;
            
            // 🔥 2. HAPUS LOADING & MUNCULKAN QRIS 🔥
            try { await ctx.deleteMessage(); } catch (e) {}
            const qrMsg = await ctx.replyWithPhoto(photo, { caption: textOrder(name, hargaAdminPanel, fee), parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]] } });
            orders[userId].qrMessageId = qrMsg.message_id;
            startCheck(userId, ctx);
        } catch (err) {
            await ctx.editMessageText(`❌ <b>Sistem Pembayaran Gangguan!</b>\n\nError: <code>${err.message}</code>\nSilakan coba lagi nanti atau gunakan metode Saldo.`, { parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: "❌ Batalkan", callback_data: "cancel_order"}]]} }).catch(()=>{});
        }
    });

    // ===== BAYAR ADMIN VIA SALDO =====
    bot.action(/pay_saldo_admin\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        // 🔥 1. EFEK LOADING ESTETIK 🔥
        await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan saldo & membuat Admin Panel...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));

        const username = ctx.match[1];
        const userId = ctx.from.id;
        const price = hargaAdminPanel;

        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        users[userIndex].balance = users[userIndex].balance || 0;
        
        if (users[userIndex].balance < price) {
            return ctx.editMessageText(`❌ <b>Saldo tidak cukup!</b>\nSaldo Anda: Rp${(users[userIndex].balance || 0).toLocaleString('id-ID')}\nHarga Produk: Rp${price.toLocaleString('id-ID')}\n\nSilakan deposit: <code>/deposit nominal</code>`, { parse_mode: "HTML" }).catch(()=>{});
        }

        users[userIndex].balance -= price;
        users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
        
        const name = "Admin Panel";
        users[userIndex].history = users[userIndex].history || [];
        users[userIndex].history.push({ product: name, amount: price, type: "admin", details: `Username: ${username}`, timestamp: new Date().toISOString() });
        saveUsers(users);

        const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
        await notifyOwner(ctx, { type: "admin", name, amount: price, username }, buyerInfo);

        const fixUsername = username + randomNumber(3);
        try {
            const res = await createAdmin(fixUsername);
            const teksAdmin = `<blockquote><b>✅ Pembelian via Saldo Berhasil!</b></blockquote>\n\n🆔 User ID: ${res.id}\n👤 Username: <code>${escapeHTML(res.username)}</code>\n🔑 Password: <code>${escapeHTML(res.password)}</code>\n⏳ Expired: 1 Bulan\n💳 Sisa Saldo: Rp${users[userIndex].balance.toLocaleString('id-ID')}\n\n<blockquote><b>📌 Cara Login:</b></blockquote>\n1. Klik tombol Login Panel di bawah\n2. Masukkan username & password\n3. Admin panel siap digunakan!`;
            
            // 🔥 2. UBAH LOADING JADI TEKS SUKSES 🔥
            await ctx.editMessageText(teksAdmin, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: "🔗 Login Panel", url: res.panel }]] } }).catch(()=>{});
        } catch (e) {
            return ctx.editMessageText(`❌ Error! Terjadi kesalahan saat membuat admin panel.\nSilahkan hubungi admin @${config.ownerUsername}`).catch(()=>{});
        }
    });
    
    // ===== ACTION BUKA HALAMAN RATING =====
bot.action("cek_rating", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderRatingPage(ctx, 0);
});

bot.action(/rating_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await renderRatingPage(ctx, page); 
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
            
            // ===== EKSEKUSI SMM (QRIS SUCCESS) =====
            if (o.type === "smm") {
                try {
                    const params = new URLSearchParams();
                    params.append('api_id', config.smm.apiId);
                    params.append('api_key', config.smm.apiKey);
                    params.append('service', o.serviceId);
                    params.append('target', o.target);
                    params.append('quantity', o.quantity);
                    
                    const res = await axios.post(`${config.smm.baseUrl}/order`, params);
                    
                    if (res.data.error) {
                        await ctx.telegram.sendMessage(o.chatId, `❌ Pembayaran sukses, TAPI Gagal memproses SMM ke pusat: <code>${res.data.error}</code>. Silakan SS struk ini dan lapor admin untuk refund/proses manual.`, { parse_mode: "HTML" });
                    } else {
                        const orderIdPusat = res.data.order || res.data.id;
                        const successText = `<blockquote><b>✅ ORDER SMM BERHASIL!</b></blockquote>\n\n📦 <b>Layanan:</b> ${escapeHTML(o.name)}\n🔗 <b>Target:</b> ${escapeHTML(o.target)}\n📈 <b>Jumlah:</b> ${o.quantity.toLocaleString('id-ID')}\n🧾 <b>ID Pesanan SMM:</b> <code>${orderIdPusat}</code>\n\n<i>Pesanan segera diproses oleh sistem.</i>`;
                        await ctx.telegram.sendMessage(o.chatId, successText, { parse_mode: "HTML" });
                    }
                } catch (e) {
                    await ctx.telegram.sendMessage(o.chatId, `❌ Terjadi kesalahan saat request ke pusat:\n<code>${e.message}</code>\nHubungi admin.`, { parse_mode: "HTML" });
                }
            }



            
            // ===== KIRIM PROMPT =====
            if (o.type === "prompt") {
                await ctx.telegram.sendDocument(
                    o.chatId,
                    { source: o.file },
                    {
                        caption: `📄 Prompt: ${escapeHTML(o.name)}`,
                        parse_mode: "html"
                    }
                );
            }
            
                        // ===== BUAT SUBDOMAIN (QRIS SUCCESS) =====
            if (o.type === "subdo") {
                const api = config.subdomain[o.domain];
                const panel = `${o.host}.${o.domain}`;
                const node = `node-${o.host}.${o.domain}`; // <--- INI UBAHNYA

                try {
                    const createSub = async (name) => {
                        await axios.post(`https://api.cloudflare.com/client/v4/zones/${api.zone}/dns_records`,
                            { type: "A", name, content: o.ip, ttl: 3600, proxied: false },
                            { headers: { Authorization: `Bearer ${api.apitoken}`, "Content-Type": "application/json" } }
                        );
                    };
                    await createSub(panel);
                    await createSub(node);

                    const textSukses = `<blockquote><b>✅ Subdomain Berhasil Dibuat!</b></blockquote>\n\n🌐 <b>Domain Panel:</b> <code>${panel}</code>\n🌐 <b>Domain Node:</b> <code>${node}</code>\n📌 <b>Target IP:</b> <code>${o.ip}</code>\n\n<i>Subdomain sudah aktif. (Propagasi DNS max 1-5 menit)</i>`;
                    await ctx.telegram.sendMessage(o.chatId, textSukses, { parse_mode: "HTML" });

                } catch (err) {
                    await ctx.telegram.sendMessage(o.chatId, `❌ Gagal membuat subdomain via API Cloudflare. Hubungi admin @${config.ownerUsername}`);
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
        await ctx.answerCbQuery().catch(() => {});
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
        await ctx.answerCbQuery().catch(() => {});
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