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

/**
 * Sends a text prompt to Gemini. 
 * Optimized with gemini-3-flash-preview for the best performance on mobile and tablet devices.
 */
export const askGemini = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        topP: 0.95,
        // Using a small thinking budget if necessary, but flash-preview is generally fast enough.
      },
    });

    return response.text || "I'm processing your brilliant idea... but I'm a bit speechless! Try rephrasing?";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Graceful error handling for mobile users who might face connectivity or quota issues
    if (String(error).includes("429")) {
      return "⚠️ The hackathon is busy! Let's take a 60-second breather before we dive back in.";
    }
    return "⚠️ I had a momentary glitch. Please ensure your environment is correctly configured!";
  }
};

/**
 * Analyzes video frames using Gemini's multimodal capabilities.
 */
export const analyzeVideoWithGemini = async (prompt: string, frames: string[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert base64 frames to the parts format required by the SDK
    const parts: any[] = frames.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1],
        mimeType: 'image/jpeg',
      },
    }));

    // Add the text prompt to the multimodal request
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nYou are now acting as a Video Analysis Mentor. Use the visual cues from the provided frames to give insightful advice.",
        temperature: 0.4,
      },
    });

    return response.text || "I saw the video, but I'm struggling to find the words to describe it.";
  } catch (error: any) {
    console.error("Gemini Multimodal Error:", error);
    return "⚠️ Vision processing encountered an error. Please check your configuration and try again.";
  }
};