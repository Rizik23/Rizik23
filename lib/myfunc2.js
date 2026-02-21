require("./myfunc.js");
const config = require("../config.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const axios = require("axios");

async function createPanel(username, ramKey) {
  const email = `${username}@gmail.com`;
  const name = `${global.capital ? global.capital(username) : username} Server`;
  const password = `${username}001`;

  const resourceMap = {
    "1gb": { ram: "1000", disk: "1000", cpu: "40" },
    "2gb": { ram: "2000", disk: "1000", cpu: "60" },
    "3gb": { ram: "3000", disk: "2000", cpu: "80" },
    "4gb": { ram: "4000", disk: "2000", cpu: "100" },
    "5gb": { ram: "5000", disk: "3000", cpu: "120" },
    "6gb": { ram: "6000", disk: "3000", cpu: "140" },
    "7gb": { ram: "7000", disk: "4000", cpu: "160" },
    "8gb": { ram: "8000", disk: "4000", cpu: "180" },
    "9gb": { ram: "9000", disk: "5000", cpu: "200" },
    "10gb": { ram: "10000", disk: "5000", cpu: "220" },
    "unlimited": { ram: "0", disk: "0", cpu: "0" },
    "unli": { ram: "0", disk: "0", cpu: "0" }
  };

  const { ram, disk, cpu } = resourceMap[ramKey] || resourceMap["unli"];

  try {
    // ===== CREATE USER =====
    const f = await fetch(`${config.domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        email,
        username,
        first_name: name,
        last_name: "Server",
        language: "en",
        password
      })
    });

    const data = await f.json();
    if (data.errors) {
      return { success: false, message: data.errors[0]?.detail || "Create user failed" };
    }

    const user = data.attributes;

    // ===== GET EGG =====
    const f1 = await fetch(
      `${config.domain}/api/application/nests/${config.nestid}/eggs/${config.egg}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apikey}`
        }
      }
    );

    const data2 = await f1.json();
    const startup_cmd = data2.attributes?.startup || "npm start";

    // ===== CREATE SERVER =====
    const f2 = await fetch(`${config.domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        name,
        description: global.tanggal
          ? global.tanggal(Date.now())
          : new Date().toLocaleString(),
        user: user.id,
        egg: parseInt(config.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: startup_cmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: { memory: ram, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: {
          locations: [parseInt(config.loc)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const result = await f2.json();
    if (result.errors) {
      return { success: false, message: result.errors[0]?.detail || "Create server failed" };
    }

    const server = result.attributes;
    const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

    return {
      success: true,
      data: {
        username,
        email,
        password,
        serverId: server.id,
        serverName: server.name,
        panelUrl: `https://${domainClean}`
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function createAdmin(username) {
  const uname = username.toLowerCase();
  const email = `${uname}@gmail.com`;
  const name = global.capital ? global.capital(uname) : uname;
  const password = `${uname}001`;

  try {
    const res = await fetch(`${config.domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`,
      },
      body: JSON.stringify({
        email,
        username: uname,
        first_name: name,
        last_name: "Admin",
        root_admin: true,
        language: "en",
        password,
      }),
    });

    const data = await res.json();
    if (data.errors) {
      return { 
        success: false, 
        message: data.errors[0]?.detail || "Create admin failed" 
      };
    }

    const user = data.attributes;
    const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

    return {
      success: true,
      id: user.id,
      username: user.username,
      email: user.email,
      password,
      panel: `https://${domainClean}`,
      raw: user,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function randomOrderId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Create payment (OrderKuota / Pakasir)
 */
async function createPayment(type, amount, paymentConfig) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    try {
      // Ambil dari config.orderkuota
      const { apikey, username, token, qrisCode } = paymentConfig.orderkuota;
      
      console.log('[OrderKuota] Config check:', {
        apikey: apikey ? '✓ Found' : '✗ Missing',
        username: username ? '✓ Found' : '✗ Missing',
        token: token ? '✓ Found' : '✗ Missing',
        qrisCode: qrisCode ? '✓ Found' : '✗ Missing',
        amount: amount
      });

      // Validasi konfigurasi WAJIB
      if (!apikey) {
        throw new Error("Config 'orderkuota.apikey' tidak ditemukan");
      }

      if (!qrisCode || qrisCode.trim() === '') {
        throw new Error("Config 'orderkuota.qrisCode' tidak ditemukan atau kosong. Wajib diisi!");
      }

      // Build URL seperti WhatsApp
      const url = `https://api.verlang.id/orderkuota/createpayment?apikey=${apikey}&amount=${amount}&codeqr=${qrisCode}`;

      console.log(`[OrderKuota] Creating payment...`);
      console.log(`[OrderKuota] URL: ${url.replace(qrisCode, 'QRIS_HIDDEN')}`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'TelegramBot/1.0',
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      console.log('[OrderKuota] Response status:', data?.status);
      console.log('[OrderKuota] Response:', JSON.stringify(data, null, 2));

      if (!data || data.status === false) {
        const errorMsg = data?.error || data?.message || 'API mengembalikan status false';
        throw new Error(errorMsg);
      }

      const result = data.result;
      
      if (!result || !result.idtransaksi) {
        throw new Error('ID transaksi tidak ditemukan dalam response');
      }

      const qrisUrl = result.imageqris?.url;
      
      if (!qrisUrl) {
        console.error('[OrderKuota] Missing QRIS URL. Full result:', result);
        throw new Error('URL gambar QRIS tidak ditemukan dalam response');
      }

      console.log(`[OrderKuota] ✅ Payment created successfully`);
      console.log(`[OrderKuota] Transaction ID: ${result.idtransaksi}`);

      return {
        success: true,
        type,
        amount,
        qris: qrisUrl,
        orderId: result.idtransaksi,
        transactionId: result.idtransaksi,
        expiredAt: result.expired_at || null,
        raw: data
      };

    } catch (err) {
      console.error('[OrderKuota] ❌ Error:', err.message);
      
      if (err.response) {
        console.error('[OrderKuota] Response status:', err.response.status);
        console.error('[OrderKuota] Response data:', JSON.stringify(err.response.data, null, 2));
      }

      return {
        success: false,
        type,
        amount,
        message: `OrderKuota Error: ${err.message}`
      };
    }
  }

  // ===== PAKASIR =====
  if (type === "pakasir") {
    try {
      const { slug, apiKey } = paymentConfig.pakasir;
      
      if (!slug || !apiKey) {
        throw new Error("Konfigurasi Pakasir tidak lengkap");
      }

      const orderId = randomOrderId("PKS");

      const url = "https://app.pakasir.com/api/transactioncreate/qris";
      const body = {
        project: slug,
        order_id: orderId,
        amount,
        api_key: apiKey
      };

      console.log(`[Pakasir] Creating payment for order: ${orderId}`);

      const res = await axios.post(url, body, {
        timeout: 15000,
        headers: { "Content-Type": "application/json" }
      });

      const payment = res.data?.payment;
      if (!payment?.payment_number) {
        throw new Error("Payment number tidak ditemukan dalam response Pakasir");
      }

      const qrString = payment.payment_number;

      // Generate QR image otomatis
      const qrDir = path.join(__dirname, "temp_qr");
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      const filePath = path.join(qrDir, `${orderId}.png`);
      await QRCode.toFile(filePath, qrString, {
        type: "png",
        width: 500,
        margin: 2
      });
      
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Pakasir] QR file deleted: ${orderId}.png`);
          }
        } catch (e) {
          console.error(`[Pakasir] Failed to delete QR: ${e.message}`);
        }
      }, 60000);

      return {
        success: true,
        type,
        amount,
        orderId,
        qris: filePath,
        expiredAt: payment.expired_at || null,
        raw: res.data
      };

    } catch (err) {
      console.error("[Pakasir] Error:", err.message);
      return {
        success: false,
        type,
        amount,
        message: `Pakasir Error: ${err.message}`
      };
    }
  }

  return {
    success: false,
    message: "Type payment tidak dikenal. Gunakan 'orderkuota' atau 'pakasir'"
  };
}

/**
 * Check payment status
 */
async function cekPaid(type, paymentData, paymentConfig, extra = {}) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    try {
      // Ambil dari config.orderkuota
      const { apikey, username, token } = paymentConfig.orderkuota;

      if (!apikey || !username || !token) {
        console.error("[OrderKuota] Config tidak lengkap untuk cek payment");
        return false;
      }

      const cekUrl = `https://api.verlang.id/orderkuota/mutasiqr?apikey=${apikey}&username=${username}&token=${token}`;
      
      console.log(`[OrderKuota] Checking payment status...`);

      const response = await axios.get(cekUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'TelegramBot/1.0',
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      console.log("[OrderKuota] Mutasi response status:", data?.status);

      if (!data || data.status === false) {
        console.warn("[OrderKuota] Status check returned false");
        return false;
      }

      const transactions = data.result;
      
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log("[OrderKuota] Tidak ada mutasi masuk");
        return false;
      }

      const expectedAmount = paymentData?.amount || paymentData?.totalAmount || 0;
      const expectedAmountStr = expectedAmount.toString();

      console.log(`[OrderKuota] Looking for payment: Rp${expectedAmount}`);
      console.log(`[OrderKuota] Total transactions: ${transactions.length}`);

      // Logic matching seperti WhatsApp
      const matchFound = transactions.find(trx => {
        const credit = trx.kredit;
        
        if (credit == expectedAmount) return true;
        if (credit === expectedAmount) return true;
        if (credit.toString() === expectedAmountStr) return true;
        
        const creditNumeric = credit.toString().replace(/[^\d]/g, '');
        const expectedNumeric = expectedAmountStr.replace(/[^\d]/g, '');
        if (creditNumeric === expectedNumeric) return true;
        
        try {
          const creditInt = parseInt(creditNumeric);
          const expectedInt = parseInt(expectedNumeric);
          if (!isNaN(creditInt) && !isNaN(expectedInt) && creditInt === expectedInt) return true;
        } catch {}
        
        return false;
      });

      if (matchFound) {
        console.log(`[OrderKuota] ✅ Payment FOUND!`);
        console.log(`[OrderKuota] Transaction:`, matchFound);
        return true;
      }

      console.log("[OrderKuota] Payment not found yet");
      return false;

    } catch (err) {
      console.error("[OrderKuota] cekPaid Error:", err.message);
      if (err.response) {
        console.error("[OrderKuota] Response status:", err.response.status);
        console.error("[OrderKuota] Response data:", err.response.data);
      }
      return false;
    }
  }

  // ===== PAKASIR =====
  if (type === "pakasir") {
    try {
      const { slug, apiKey } = paymentConfig.pakasir;

      if (!slug || !apiKey || !paymentData?.orderId) {
        console.error("[Pakasir] Data tidak lengkap untuk cek payment");
        return false;
      }

      const cekUrl = "https://app.pakasir.com/api/transactiondetail";
      const params = {
        project: slug,
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        api_key: apiKey
      };

      console.log(`[Pakasir] Checking payment: ${paymentData.orderId}`);

      const res = await axios.get(cekUrl, { 
        params,
        timeout: 15000 
      });

      const status =
        res.data?.transaction?.status ||
        res.data?.payment?.status ||
        res.data?.status ||
        "";

      const isPaid = ["paid", "success", "completed", "settlement"].includes(
        String(status).toLowerCase()
      );

      if (isPaid) {
        console.log(`[Pakasir] ✅ Payment CONFIRMED: ${paymentData.orderId}`);
      } else {
        console.log(`[Pakasir] Payment status: ${status}`);
      }

      return isPaid;

    } catch (err) {
      console.error("[Pakasir] cekPaid Error:", err.message);
      return false;
    }
  }

  console.error(`[Payment] Unknown type: ${type}`);
  return false;
}

// ===== VPS SPECS =====
const vpsSpecs = {
    r2c2: { size: "s-2vcpu-2gb", name: "2GB RAM • 2 CPU Cores", icon: "✅" },
    r4c2: { size: "s-2vcpu-4gb", name: "4GB RAM • 2 CPU Cores", icon: "✅" },
    r8c4: { size: "s-4vcpu-8gb", name: "8GB RAM • 4 CPU Cores", icon: "✅" },
    r16c4: { size: "s-4vcpu-16gb-amd", name: "16GB RAM • 4 CPU Cores", icon: "✅" },
    r16c8: { size: "s-8vcpu-16gb-amd", name: "16GB RAM • 8 CPU Cores", icon: "✅" },
    r32c8: { size: "s-8vcpu-32gb-amd", name: "32GB RAM • 8 CPU Cores", icon: "✅" }
};

const vpsRegions = {
    sgp1: {
        name: "Singapore",
        flag: "🇸🇬",
        latency: "Tercepat untuk Asia",
        available: true
    },
    nyc1: {
        name: "New York",
        flag: "🇺🇸",
        latency: "USA Pantai Timur",
        available: true
    },
    sfo3: {
        name: "San Francisco",
        flag: "🇺🇸",
        latency: "USA Pantai Barat",
        available: true
    },
    lon1: {
        name: "London",
        flag: "🇬🇧",
        latency: "Eropa Barat",
        available: true
    },
    fra1: {
        name: "Frankfurt",
        flag: "🇩🇪",
        latency: "Eropa Tengah",
        available: true
    },
    ams3: {
        name: "Amsterdam",
        flag: "🇳🇱",
        latency: "Eropa Barat",
        available: true
    },
    tor1: {
        name: "Toronto",
        flag: "🇨🇦",
        latency: "Amerika Utara",
        available: true
    },
    blr1: {
        name: "Bangalore",
        flag: "🇮🇳",
        latency: "Asia Selatan",
        available: true
    }
};

const vpsImages = {
    // ===== UBUNTU =====
    ubuntu2404: {
        image: "ubuntu-24-04-x64",
        name: "Ubuntu 24.04 LTS",
        icon: "🐧",
        description: "Latest Ubuntu LTS",
        slug: "ubuntu-24-04-x64"
    },
    ubuntu2204: {
        image: "ubuntu-22-04-x64",
        name: "Ubuntu 22.04 LTS",
        icon: "🐧",
        description: "Stable Ubuntu LTS",
        slug: "ubuntu-22-04-x64"
    },
    ubuntu2004: {
        image: "ubuntu-20-04-x64",
        name: "Ubuntu 20.04 LTS",
        icon: "🐧",
        description: "Previous Ubuntu LTS",
        slug: "ubuntu-20-04-x64"
    },
    ubuntu2404_minimal: {
        image: "ubuntu-24-04-x64",
        name: "Ubuntu 24.04 Minimal",
        icon: "🐧",
        description: "Minimal Ubuntu 24.04",
        slug: "ubuntu-24-04-x64"
    },

    // ===== DEBIAN =====
    debian12: {
        image: "debian-12-x64",
        name: "Debian 12",
        icon: "📦",
        description: "Debian 12 Bookworm",
        slug: "debian-12-x64"
    },
    debian11: {
        image: "debian-11-x64",
        name: "Debian 11",
        icon: "📦",
        description: "Debian 11 Bullseye",
        slug: "debian-11-x64"
    },
    debian10: {
        image: "debian-10-x64",
        name: "Debian 10",
        icon: "📦",
        description: "Debian 10 Buster",
        slug: "debian-10-x64"
    },

    // ===== CENTOS =====
    centos9: {
        image: "centos-stream-9-x64",
        name: "CentOS Stream 9",
        icon: "🎯",
        description: "CentOS Stream 9",
        slug: "centos-stream-9-x64"
    },
    centos8: {
        image: "centos-stream-8-x64",
        name: "CentOS Stream 8",
        icon: "🎯",
        description: "CentOS Stream 8",
        slug: "centos-stream-8-x64"
    },

    // ===== ROCKY LINUX =====
    rocky9: {
        image: "rockylinux-9-x64",
        name: "Rocky Linux 9",
        icon: "🪨",
        description: "Rocky Linux 9",
        slug: "rockylinux-9-x64"
    },
    rocky8: {
        image: "rockylinux-8-x64",
        name: "Rocky Linux 8",
        icon: "🪨",
        description: "Rocky Linux 8",
        slug: "rockylinux-8-x64"
    },

    // ===== ALMA LINUX =====
    alma9: {
        image: "almalinux-9-x64",
        name: "AlmaLinux 9",
        icon: "🌟",
        description: "AlmaLinux 9",
        slug: "almalinux-9-x64"
    },
    alma8: {
        image: "almalinux-8-x64",
        name: "AlmaLinux 8",
        icon: "🌟",
        description: "AlmaLinux 8",
        slug: "almalinux-8-x64"
    },

    // ===== FEDORA =====
    fedora40: {
        image: "fedora-40-x64",
        name: "Fedora 40",
        icon: "🎩",
        description: "Fedora 40",
        slug: "fedora-40-x64"
    },
    fedora39: {
        image: "fedora-39-x64",
        name: "Fedora 39",
        icon: "🎩",
        description: "Fedora 39",
        slug: "fedora-39-x64"
    }
};

function getOSAdditionalCost(osKey) {
    return { additional: false, cost: 0 };
}

function validateOSForRegion(osKey, regionKey) {
    return { valid: true, message: "" };
}

function generateStrongPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}


async function createVPSDroplet(apiKey, hostname, spec, os, region, password) {
    if (!vpsSpecs[spec]) {
        throw new Error(`Spec "${spec}" tidak valid. Pilihan: ${Object.keys(vpsSpecs).join(', ')}`);
    }

    if (!vpsImages[os]) {
        throw new Error(`OS "${os}" tidak valid. Pilihan: ${Object.keys(vpsImages).join(', ')}`);
    }

    const dropletData = {
        name: hostname.toLowerCase().trim().substring(0, 63),
        region: region,
        size: vpsSpecs[spec].size,
        image: vpsImages[os].image,
        ssh_keys: [],
        backups: false,
        ipv6: true,
        monitoring: true,
        tags: [
            "autoorder-vps",
            "telegram-bot",
            `user-${hostname}`,
            new Date().toISOString().split("T")[0]
        ],
        user_data: `#cloud-config\npassword: ${password}\nchpasswd: { expire: false }\nssh_pwauth: true`
    };

    try {
        console.log(`[VPS] Creating droplet:`, JSON.stringify(dropletData, null, 2));

        const response = await fetch("https://api.digitalocean.com/v2/droplets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "User-Agent": "AutoOrder-Bot/1.0"
            },
            body: JSON.stringify(dropletData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[VPS] DigitalOcean API Error:", {
                status: response.status,
                statusText: response.statusText,
                error: data
            });

            let errorMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;

            if (data.id === "forbidden") {
                errorMsg = "API Key tidak valid atau expired";
            } else if (data.id === "unprocessable_entity") {
                errorMsg = `Invalid request: ${data.message || "Check your parameters"}`;
            } else if (response.status === 429) {
                errorMsg = "Rate limit exceeded, coba lagi nanti";
            }

            throw new Error(errorMsg);
        }

        if (!data.droplet || !data.droplet.id) {
            throw new Error("Invalid response format from Digital Ocean API");
        }

        console.log(`[VPS] Droplet created successfully: ${data.droplet.id}`);
        return data.droplet.id;

    } catch (error) {
        console.error("[VPS] Create Droplet Error:", error);
        throw new Error(`Gagal membuat VPS: ${error.message}`);
    }
}

async function getDropletInfo(apiKey, dropletId) {
    try {
        const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "User-Agent": "AutoOrder-Bot/1.0"
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}: Failed to get droplet info`);
        }

        const data = await response.json();

        if (!data.droplet) {
            throw new Error("Invalid response: droplet data missing");
        }

        return data.droplet;

    } catch (error) {
        console.error("[VPS] Get Droplet Info Error:", error);
        throw new Error(`Failed to get droplet info: ${error.message}`);
    }
}

module.exports = { 
  createAdmin, 
  createPanel, 
  createPayment, 
  cekPaid, 
  createVPSDroplet, 
  getDropletInfo, 
  vpsImages, 
  vpsRegions, 
  vpsSpecs, 
  generateStrongPassword, 
  getOSAdditionalCost, 
  validateOSForRegion 
};