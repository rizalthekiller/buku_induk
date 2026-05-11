const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

/**
 * Memperkaya data buku menggunakan AI (Gemini)
 * @param {string} title - Judul buku
 * @returns {Promise<Object|null>} - Data buku hasil AI
 */
async function enrichBookData(title, isbn = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error("❌ AI Error: GEMINI_API_KEY belum diisi di file .env");
    return null;
  }
  
  if (!title && !isbn) return null;
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    let context = `judul "${title}"`;
    if (isbn) context += ` dan ISBN "${isbn}"`;

    const prompt = `Kamu adalah pustakawan profesional yang ahli dalam Dewey Decimal Classification (DDC) Edisi 23.
Berikan metadata buku untuk ${context} dalam format JSON.
Field yang wajib ada:
- klasifikasi: (Nomor DDC sespesifik mungkin, gunakan hingga 6 digit setelah titik desimal jika memungkinkan. Contoh: 005.133, 297.122.6, 371.102, 332.632042. JANGAN berikan hanya 3 digit umum seperti 300 atau 370, harus detail minimal sampai subdivisi. Format: XXX.XXXX)
- pengarang: (Nama lengkap pengarang utama)
- penanggung_jawab: (Editor, penerjemah, penyunting, ilustrator, dll. Contoh: "Ed. Ahmad Dahlan" atau "Penerjemah: Budi Santoso". Kosongkan jika tidak ada)
- isbn: (Gunakan "${isbn || ''}" jika valid, atau berikan yang benar)
- penerbit: (Nama penerbit)
- subjek: (Topik buku, pisahkan dengan titik koma jika lebih dari satu)
- tahun_terbit: (Hanya tahun, contoh: 2024)
- fisik: (Contoh: xii, 250 hlm.; 21 cm)
- kota_terbit: (Nama kota)
- edisi_cetakan: (Contoh: Cet. 1 atau Ed. 3)
Pastikan hanya mengembalikan JSON, tanpa teks tambahan, dalam bahasa Indonesia.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    console.warn("⚠️ AI Response tidak mengandung JSON valid:", text);
    return null;
  } catch (error) {
    console.error("❌ AI Assistant Error:", error.message);
    if (error.message.includes('429') || error.message.includes('quota')) {
      const err = new Error('Kuota API Gemini habis (Free Tier: 20 request/hari). Tunggu besok atau upgrade ke Paid Tier.');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    } else if (error.message.includes('API_KEY_INVALID')) {
      const err = new Error('API Key Gemini tidak valid. Periksa GEMINI_API_KEY di file .env');
      err.code = 'INVALID_KEY';
      throw err;
    } else if (error.message.includes('SAFETY')) {
      const err = new Error('Konten ditolak oleh filter keamanan AI. Coba judul buku lain.');
      err.code = 'SAFETY_BLOCK';
      throw err;
    }
    return null;
  }
}

/**
 * Mendapatkan saran DDC berdasarkan subjek/judul menggunakan AI
 */
async function suggestDDCByAI(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !query) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `Kamu adalah pustakawan profesional yang ahli dalam DDC Edisi 23.
Berikan nomor klasifikasi DDC (Dewey Decimal Classification) yang paling SPESIFIK dan DETAIL untuk subjek/buku berikut: "${query}".
Gunakan hingga 6 digit setelah titik desimal jika memungkinkan.
JANGAN berikan hanya 3 digit umum (seperti 300 atau 600), harus detail hingga subdivisi terkecil.
Contoh output yang benar: 005.133, 297.122, 371.102, 332.632042
Kembalikan HANYA nomor DDC-nya saja, tanpa teks lain.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const ddc = response.text().trim();
    
    // Validasi dasar: harus mengandung angka
    if (/\d+/.test(ddc)) {
      return ddc;
    }
    return null;
  } catch (err) {
    console.error("AI DDC Error:", err);
    return null;
  }
}

module.exports = { enrichBookData, suggestDDCByAI };
