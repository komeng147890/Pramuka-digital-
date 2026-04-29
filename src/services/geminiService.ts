import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const getScoutAssistantResponse = async (prompt: string, context?: { members?: any[], badges?: any[], activities?: any[] }) => {
  try {
    let contextString = "";
    if (context) {
      contextString = "\n\nKonteks Data Saat Ini:\n";
      if (context.members) contextString += `- Daftar Anggota: ${JSON.stringify(context.members.map(m => ({ name: m.name, level: m.skuLevel, unit: m.unit, badges: m.badges })))}\n`;
      if (context.badges) contextString += `- Daftar Lencana Tersedia: ${JSON.stringify(context.badges.map(b => ({ name: b.name, desc: b.description })))}\n`;
      if (context.activities) contextString += `- Daftar Kegiatan: ${JSON.stringify(context.activities.map(a => ({ title: a.title, date: a.date, category: a.category })))}\n`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt + contextString,
      config: {
        systemInstruction: "Kamu adalah asisten cerdas untuk ONE KERTA (Gugusdepan Digital). Tugasmu adalah membantu Pembina Pramuka dalam menganalisa data siswa (sortir/filter), memberikan rekomendasi lencana berdasarkan data, merencanakan kegiatan, dan menjawab pertanyaan kepramukaan. Gunakan data konteks yang diberikan untuk memberikan jawaban yang spesifik. Gunakan gaya bahasa yang ramah, santai khas 'Kakak Pembina', dan gunakan banyak emoji. Selalu sebut pengguna dengan sebutan 'Kakak'.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Waduh, asisten pintarnya lagi istirahat nih kak. Coba cek koneksi atau kunci API kakak ya!");
  }
};
