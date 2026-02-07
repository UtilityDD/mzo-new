
import { GoogleGenAI } from "@google/genai";
import { ReportData, User, DocketData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getReportInsights = async (data: ReportData[], user: User, dockets: DocketData[] = []): Promise<string> => {
  if (data.length === 0 && dockets.length === 0) return "No data available for analysis.";

  const dataSummary = data.slice(0, 10).map(r =>
    `Date: ${r.date}, Revenue: ${r.revenue}, Efficiency: ${r.efficiency}%`
  ).join("\n");

  const docketSummary = dockets.length > 0 ?
    `Active Dockets: ${dockets.length}. Samples: ` + dockets.slice(0, 3).map(d => `${d.prob_type} (${d.ccc_code})`).join(", ") :
    "No active dockets.";

  const prompt = `
    As a data analyst for a hierarchical utility organization, analyze the following data for ${user.full_name} (${user.role} role).
    Structure: Zone -> Region -> Division -> CCC.
    
    Performance Data:
    ${dataSummary}
    
    Consumer Complaints (Dockets):
    ${docketSummary}

    Provide a concise, 3-point executive summary (Android-friendly mobile view):
    1. Overall performance trend
    2. Operational concern (e.g. docket volume or efficiency dips)
    3. One strategic recommendation for their hierarchy level.
    
    Keep it professional, action-oriented, and extremely brief. Use bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    // Standard response parsing
    const text = (response as any).text?.() || "Insight generation completed.";
    return text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "AI Insight service temporarily unavailable.";
  }
};
