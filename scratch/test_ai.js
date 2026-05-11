const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testAI() {
  console.log("--- Memulai Test AI Assistant ---");
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error("❌ ERROR: GEMINI_API_KEY belum diisi di .env atau masih menggunakan placeholder.");
    return;
  }

  console.log("✅ API Key ditemukan (disensor):", apiKey.substring(0, 5) + "...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const title = "Laskar Pelangi";
    console.log(`📡 Mencoba menghubungi Gemini dengan judul: "${title}"...`);
    
    const prompt = `Berikan metadata buku "Laskar Pelangi" dalam JSON.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("------------------------------------");
    console.log("📩 Respon AI Berhasil:");
    console.log(text);
    console.log("------------------------------------");
    console.log("✅ Test Selesai. Jika Anda melihat JSON di atas, berarti AI sudah berfungsi.");
    
  } catch (error) {
    console.error("------------------------------------");
    console.error("❌ TEST GAGAL!");
    console.error("Pesan Error:", error.message);
    if (error.stack) {
      // console.error("Stack Trace:", error.stack);
    }
    console.error("------------------------------------");
    console.error("Saran Perbaikan:");
    if (error.message.includes("API_KEY_INVALID")) {
      console.error("-> Pastikan API Key yang Anda dapatkan dari AI Studio sudah benar.");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT")) {
      console.error("-> Masalah koneksi internet. Periksa apakah internet Anda aktif atau diblokir firewall/proxy.");
    } else {
      console.error("-> Coba periksa apakah paket @google/generative-ai sudah terinstall dengan benar (npm install).");
    }
  }
}

testAI();
