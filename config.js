module.exports = {

 // ==== Bot Setting ========
  botToken: "8542010252:AAEQO2TvwfrcIHd4NFhHrCAgkg5YDsHlleQ",
  botUsername: "ElikaMd_bot", // * username bot tanpa @
  prefix: "/", // * jangan di ganti
  ownerName: "kaell", // * nama ini nama telegram, tapi bebas
  ownerUsername: "Myzxa", // * username tanpa memakai @
  ownerId: "1402991119", // * ownerid pertama
  channelId: "-1003722756127", // * notifikasi pembelian ke channel memakai id
  channelLink: "https://t.me/MyThe5", // * untun channel di button
  wajibJoinChannel: "@MyThe5",
  
  // ==== Image Setting =========
  menuImage: "https://tmpfiles.org/dl/25539099/1771702158731.png", // * gambar menu utama awala pas /start
  katalogImage: "https://tmpfiles.org/dl/25538833/file_000000003d2472089efb8382ea472f0c.png", // * gambar shop menu
  referralImage: "https://tmpfiles.org/dl/25574179/file_000000004fe07206b5eeabf4aac9a109.png", // * gambar menu referral
  helpMenuImage: "https://tmpfiles.org/dl/25691547/1771835255396.png", //* help faq bantuan
  pinkInfoImage: "https://tmpfiles.org/dl/25691685/1771834760932.png", // * gambar ping
  
  // ===== Userbot Setting dapetin di web telegram org=====
  // * bisa di isi atau juga bisa di kosongin di skip
  apiId: 32424796, // api_id Telegram
  apiHash: "8013761f4631b998c60bfe92d373ee4e", // api hash telegram
  phoneNumber: "6285213354966", // nomer yang terkait di telegram kalian
  sessionFile: "./session.txt", 

  // "orderkuota" atau "pakasir"
  paymentGateway: "pakasir", // bisa di ganti orderkuota atau pakasir

  // ===== OrderKuota Config =====
  orderkuota: {
    apikey: "",
    username: "",
    token: "",
    qrisCode: ""
  },

  // ===== Pakasir Config =====
  pakasir: {
    slug: "bgzikdrgaon",
    apiKey: "GtYmYoR6hVDYyCj6Rh9rl46i3mZlnlaw"
  },
  
      // --- PAYMENT ATLANTIC (TOP UP GAME) ---
    untungTopup: 500, // Keuntungan lu per transaksi Top Up (Rp 500)
    atlantic: "https://atlantich2h.com",
    ApikeyAtlantic: "xFjN6vgx30hdaBl7gHolj1acuZwiOyJvQUOi1Rn58NYPb8ovqgJNcfaw6NZoen1O5GBa8laCIuSz5VPREXr35X1PoODnfwGuHXkm",

    // --- KATEGORI TOP UP ATLANTIC ---
    CATEGORY: {
      cat_games: [
        ['💎 Mobile Legends', 'ml'],
        ['🔥 Free Fire', 'ff'],
        ['🔫 PUBG Mobile', 'pubg']
      ],
      cat_ewallet: [
        ['💳 DANA', 'dana'],
        ['🟣 OVO', 'ovo'],
        ['🟢 GOPAY', 'gopay']
      ]
    },

    PRODUCTS: {
      ml: { provider: 'MOBILE LEGENDS' },
      ff: { provider: 'FREE FIRE' },
      pubg: { provider: 'PUBG MOBILE' },
      dana: { provider: 'DANA' },
      ovo: { provider: 'OVO' },
      gopay: { provider: 'GO PAY' }
    },


  // Info payment manual (opsional)
  payment: {
    qris: "https://files.catbox.moe/dy2m8f.jpg",
    dana: "085123668751",
    ovo: "085864521929",
    gopay: "085864521929"
  },
  
    sosmed: {
      ig: "https://instagram.com/zyntherion_",
      wa: "https://wa.me/6285864521929",
      tele: "https://t.me/Myzxa",
      tiktok: "https://tiktok.com/@zayntherion",
      chTele: "https://t.me/MyThe5",
      chWa: "https://whatsapp.com/channel/0029Vay9cpWC6ZvZIe86sd1D",
      testi: "https://t.me/TestsiKaell" // Link channel khusus bukti TF/Testi
  },

  
  // Apikey Digitalocean
  apiDigitalOcean: "", // * kalau api di isi, otomatis button vps, do, aktip dan sebalik nya kalau tidak di isi, maka otomatis ter ditect restock sedang kosong.
  
  // ===== Panel Config =====
  // * bagian domain, apikey, capikey, kalau di isi otomatis akan tersedia stock nya, tapi kalau tidak di isi maka restock akan tidak tersedia
  egg: "15",
  nestid: "5",
  loc: "1",
  domain: "", // isi kalau ada, bisa di kosongin juga
  apikey: "", // ini juga sama bisa di isi bisa di biarkan
  capikey: "", // ini juga sama bisa di isi bisa di biarkan
  
    // --- Suntik Sosmed Setting ( FayuPedia ) ---
  smm: {
      apiId: '177578', // isi dengan API ID lu dari web https://fayupedia.id/api
      apiKey: 'af2f0l-mgbqpz-qxgzsy-cdzffk-ugndvz', // isi dengan API KEY lu
      baseUrl: 'https://fayupedia.id/api', 
      profitMargin: 1.3 // Untung lu 30%
  },
  
  // ===== Setting Api Subdomain ===
  subdomain: {
    "pteroweb.my.id": {
      "zone": "714e0f2e54a90875426f8a6819f782d0",
      "apitoken": "SbRAPRzC34ccmf4cJs-0qZ939yHe3Ko6CpolxqW4"
    },
    "panelwebsite.biz.id": {
      "zone": "2d6aab40136299392d66eed44a7b1122",
      "apitoken": "SbRAPRzC34ccmf4cJs-0qZ939yHe3Ko6CpolxqW4"
    },
    "privatserver.my.id": {
      "zone": "699bb9eb65046a886399c91daacb1968",
      "apitoken": "SbRAPRzC34ccmf4cJs-0qZ939yHe3Ko6CpolxqW4"
    }
  }
};