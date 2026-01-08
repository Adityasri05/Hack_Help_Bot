
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are a helpful assistant for student hackathons organized by Google Developer Groups (GDG).
Your tone is encouraging, professional, and technical but accessible.
Provide specific guidance on:
1. Brainstorming innovative hackathon projects.
2. Technical stack advice (Firebase, Google Cloud, Flutter, Android, Web).
3. Troubleshooting common programming bugs.
4. Tips for winning a hackathon (MVP focus, presentation, impact).
If you don't know the answer, suggest where the student can find it (e.g., official docs).
`;

export const askGemini = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API key not configured. Please check environment variables.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (String(error).includes("429")) {
      return "⚠️ The AI is very busy right now. Please wait a minute before asking again!";
    }
    return "⚠️ There was an error connecting to the AI. Please try again later.";
  }
};
