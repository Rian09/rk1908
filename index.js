const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || ""; // contoh: 6281234567890
const DATA_FILE = path.join(__dirname, "..", "data", "complaints.json");

function loadComplaints() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function saveComplaints(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function ticket() {
  const d = new Date();
  const date = d.toISOString().slice(0,10).replaceAll("-","");
  const n = String(loadComplaints().length + 1).padStart(3, "0");
  return `ADU-${date}-${n}`;
}

const sessions = new Map();

const OPENING = `*🇮🇩 SELAMAT DATANG DI PORTAL PENGADUAN DAN ASPIRASI MASYARAKAT
YONIF TP 953/HARIMAU RAWA 🇮🇩*

Portal ini merupakan sarana komunikasi masyarakat untuk menyampaikan laporan, pengaduan, informasi, serta aspirasi. Kami akan menerima dan menindaklanjutinya sesuai ketentuan yang berlaku.

*Apakah ada yang bisa kami bantu?*`;

const MENU = `*📋 MENU LAYANAN*

1️⃣ Buat Pengaduan
2️⃣ Sampaikan Aspirasi
3️⃣ Laporan / Informasi
4️⃣ Cek Status Pengaduan
5️⃣ Bantuan & Informasi
6️⃣ Hubungi Petugas

Ketik *0* untuk kembali ke menu utama.`;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "yonif-953" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", qr => {
  console.log("\nSCAN QR BERIKUT DENGAN WHATSAPP:\n");
  qrcode.generate(qr, { small: true });
});
client.on("ready", () => console.log("✅ Bot WhatsApp aktif."));
client.on("authenticated", () => console.log("🔐 WhatsApp terautentikasi."));
client.on("auth_failure", msg => console.error("❌ Auth failure:", msg));
client.on("disconnected", reason => console.log("⚠️ Terputus:", reason));

async function notifyAdmin(c) {
  if (!ADMIN_NUMBER) return;
  const msg = `🔔 *PENGADUAN BARU*\n\n🎫 Tiket: *${c.id}*\n👤 Nama: ${c.name}\n📱 WA: ${c.phone}\n📌 Jenis: ${c.type}\n📍 Lokasi: ${c.location}\n📝 ${c.description}\n\nStatus: *${c.status}*`;
  await client.sendMessage(`${ADMIN_NUMBER}@c.us`, msg);
}

client.on("message", async msg => {
  if (msg.fromMe || msg.isStatus) return;
  const text = (msg.body || "").trim();
  const lower = text.toLowerCase();
  const chat = await msg.getChat();
  const sender = msg.from.replace("@c.us", "");
  let s = sessions.get(msg.from);

  if (["halo","hai","hi","menu","start","mulai"].includes(lower)) {
    sessions.delete(msg.from);
    await msg.reply(OPENING + "\n\n" + MENU);
    return;
  }
  if (text === "0") {
    sessions.delete(msg.from);
    await msg.reply(MENU);
    return;
  }

  if (!s) {
    if (text === "1") {
      sessions.set(msg.from, { mode: "complaint", step: "name", data: {} });
      await msg.reply("📝 *FORMULIR PENGADUAN*\n\nSilakan tulis *nama Anda*.");
      return;
    }
    if (text === "2") {
      sessions.set(msg.from, { mode: "aspiration", step: "name", data: {} });
      await msg.reply("💡 *FORMULIR ASPIRASI*\n\nSilakan tulis *nama Anda*.");
      return;
    }
    if (text === "3") {
      sessions.set(msg.from, { mode: "info", step: "name", data: {} });
      await msg.reply("📢 *LAPORAN / INFORMASI*\n\nSilakan tulis *nama Anda*.");
      return;
    }
    if (text === "4") {
      sessions.set(msg.from, { mode: "status", step: "ticket", data: {} });
      await msg.reply("🔎 Silakan kirim *nomor tiket* Anda.\nContoh: ADU-20260829-001");
      return;
    }
    if (text === "5") {
      await msg.reply("ℹ️ *BANTUAN & INFORMASI*\n\nBot ini digunakan untuk menerima pengaduan, aspirasi, dan informasi masyarakat.\n\nKetik *1* untuk membuat pengaduan atau *0* untuk kembali.");
      return;
    }
    if (text === "6") {
      await msg.reply("☎️ *HUBUNGI PETUGAS*\n\nSilakan tuliskan pesan Anda. Petugas akan menindaklanjuti sesuai ketentuan yang berlaku.");
      return;
    }
    await msg.reply(OPENING + "\n\n" + MENU);
    return;
  }

  if (s.mode === "status") {
    const c = loadComplaints().find(x => x.id.toLowerCase() === lower);
    sessions.delete(msg.from);
    if (!c) return msg.reply("❌ Nomor tiket tidak ditemukan.\n\nKetik *0* untuk kembali ke menu.");
    return msg.reply(`🔎 *STATUS PENGADUAN*\n\n🎫 Tiket: *${c.id}*\n📌 Jenis: ${c.type}\n📅 Dibuat: ${c.createdAt}\n🔄 Status: *${c.status}*\n💬 Catatan: ${c.note || "-"}`);
  }

  if (s.step === "name") {
    s.data.name = text; s.data.phone = sender;
    s.step = "location";
    return msg.reply("📍 Silakan tulis *lokasi kejadian / wilayah*.");
  }
  if (s.step === "location") {
    s.data.location = text; s.step = "description";
    return msg.reply("📝 Silakan tulis *uraian pengaduan/aspirasi/informasi* secara jelas.");
  }
  if (s.step === "description") {
    s.data.description = text;
    if (s.mode === "complaint") {
      s.step = "media";
      return msg.reply("📎 Jika ada bukti foto/video/dokumen, silakan kirim sekarang.\nJika tidak ada, ketik *LEWATI*.");
    }
    const c = {
      id: ticket(), name: s.data.name, phone: s.data.phone, location: s.data.location,
      description: s.data.description,
      type: s.mode === "aspiration" ? "Aspirasi" : "Laporan / Informasi",
      status: "Menunggu Verifikasi", note: "", media: null,
      createdAt: new Date().toLocaleString("id-ID")
    };
    const data = loadComplaints(); data.push(c); saveComplaints(data);
    sessions.delete(msg.from); await notifyAdmin(c);
    return msg.reply(`✅ *${c.type.toUpperCase()} BERHASIL DITERIMA*\n\n🎫 Nomor Tiket: *${c.id}*\n🔄 Status: *${c.status}*\n\nSimpan nomor tiket untuk mengecek perkembangan laporan Anda.\n\nKetik *0* untuk menu utama.`);
  }
  if (s.step === "media") {
    if (lower === "lewati") {
      s.data.media = null;
    } else if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        const ext = (media.mimetype || "application/octet-stream").split("/")[1] || "bin";
        const filename = `${Date.now()}-${sender}.${ext}`;
        fs.writeFileSync(path.join(__dirname, "..", "data", filename), Buffer.from(media.data, "base64"));
        s.data.media = filename;
      } catch {}
    } else {
      return msg.reply("Silakan kirim foto/video/dokumen atau ketik *LEWATI*.");
    }
    const c = {
      id: ticket(), name: s.data.name, phone: s.data.phone, location: s.data.location,
      description: s.data.description, type: "Pengaduan", status: "Menunggu Verifikasi",
      note: "", media: s.data.media, createdAt: new Date().toLocaleString("id-ID")
    };
    const data = loadComplaints(); data.push(c); saveComplaints(data);
    sessions.delete(msg.from); await notifyAdmin(c);
    return msg.reply(`✅ *PENGADUAN BERHASIL DITERIMA*\n\n🎫 Nomor Tiket: *${c.id}*\n🔄 Status: *${c.status}*\n\nSimpan nomor tiket tersebut untuk mengecek perkembangan pengaduan.\n\nKetik *0* untuk menu utama.`);
  }
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/complaints", (req,res) => res.json(loadComplaints()));

app.post("/api/complaints/:id/status", (req,res) => {
  const { status, note } = req.body || {};
  const allowed = ["Menunggu Verifikasi","Diproses","Selesai","Ditolak"];
  if (!allowed.includes(status)) return res.status(400).json({error:"Status tidak valid"});
  const data = loadComplaints();
  const c = data.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({error:"Tiket tidak ditemukan"});
  c.status = status; c.note = note || "";
  saveComplaints(data);
  res.json(c);
});

app.listen(PORT, () => console.log(`🖥️ Dashboard: http://localhost:${PORT}`));
client.initialize();
