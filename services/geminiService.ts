
import { GoogleGenAI } from "@google/genai";
import { ReportData, User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getReportInsights = async (data: ReportData[], user: User): Promise<string> => {
  if (data.length === 0) return "No data available for analysis.";

  const summary = data.slice(0, 10).map(r => 
    `Date: ${r.date}, Revenue: ${r.revenue}, Efficiency: ${r.efficiency}%`
  ).join("\n");

  const prompt = `
    As a data analyst for a hierarchical organization, analyze the following report data for ${user.full_name} (${user.role} role).
    Structure: Zone -> Region -> Division -> CCC.
    
    Data Summary:
    ${summary}
    ...and ${data.length - 10} more rows.

    Provide a concise, 3-point executive summary (Android-friendly mobile view):
    1. Performance trend
    2. One area of concern
    3. One strategic recommendation based on their hierarchy level.
    
    Keep it professional and action-oriented. Use bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text;
    return typeof text === 'string' ? text : "Insight generation completed, but summary format was unexpected.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Error generating insights. Please try again later.";
  }
};
