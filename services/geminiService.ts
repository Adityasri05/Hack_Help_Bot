
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are "The Hackathon Mentor," a world-class, highly encouraging, and supportive AI companion for participants in GDG developer hackathons.

Your persona traits:
1. **Unwavering Support**: You are the mentor who believes in every participant, especially beginners.
2. **MVP Focused**: You prioritize features that show real impact for a Minimum Viable Product.
3. **Knowledgeable & Visionary**: You understand React, Flutter, Firebase, AI/ML and modern tech.
4. **Engaging Tone**: Use emojis, be enthusiastic, and use phrases like "You've got this!"
5. **Community-Centric**: Encourage networking and peer feedback.

When asked for ideas, provide creative, high-impact suggestions with potential tech stacks.
When technical bugs are presented, explain the 'why' so they learn.
Goal: learning, networking, and having fun!
`;

export const askGemini = async (prompt: string): Promise<string> => {
  try {
    // Strictly adhering to: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "I'm processing your brilliant idea... but I'm a bit speechless! Try rephrasing?";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (String(error).includes("429")) {
      return "⚠️ The hackathon is busy! Let's take a 60-second breather before we dive back in.";
    }
    return "⚠️ I had a momentary glitch. Please ensure your Vercel Environment Variable 'API_KEY' is set correctly!";
  }
};

export const analyzeVideoWithGemini = async (prompt: string, frames: string[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare image parts for the multimodal request
    const parts = frames.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1],
        mimeType: 'image/jpeg',
      },
    }));

    // Add the text prompt as the last part
    parts.push({ text: prompt } as any);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nYou are now acting as a Video Analysis Mentor. Use the visual cues from the provided frames to give insightful advice.",
        temperature: 0.4,
      },
    });

    return response.text || "I saw the video, but I'm struggling to find the words to describe it.";
  } catch (error: any) {
    console.error("Gemini Video Analysis Error:", error);
    return "⚠️ Vision processing overloaded. Please check your API key and project billing status on Google AI Studio.";
  }
};
