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
 * Optimized text generation for mobile/tablet.
 * Uses 'gemini-3-flash-preview' for the fastest response times.
 */
export const askGemini = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Error: process.env.API_KEY is missing.");
    return "⚠️ Configuration Error: API key is not set. Please check your environment variables.";
  }

  try {
    // Re-instantiate to ensure we use the latest injected environment state
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.9,
        // Disable thinking budget to achieve the lowest possible latency on mobile
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    // Access the text property directly per SDK guidelines
    return response.text || "I processed the request, but didn't get a text response back. Let's try again! 🚀";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMsg = String(error);
    
    // Mobile-centric error handling
    if (errorMsg.includes("429")) {
      return "⚠️ The mentor is handling many requests right now! Let's pause for a few seconds and try again.";
    }
    
    if (errorMsg.includes("fetch failed") || errorMsg.includes("NetworkError")) {
      return "⚠️ Connectivity issue detected. Please check your internet connection or switch to a more stable network.";
    }

    if (errorMsg.includes("safety")) {
      return "⚠️ I can't provide a response for that specific query due to safety guidelines. Let's pivot to a different topic! 😊";
    }

    return "⚠️ Something went wrong on my end. Please try re-sending your message.";
  }
};

/**
 * Optimized multimodal analysis for mobile.
 * Sends compressed frames to the 'gemini-3-flash-preview' model.
 */
export const analyzeVideoWithGemini = async (prompt: string, frames: string[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "⚠️ Vision service key missing.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Map base64 strings to correct parts format
    const imageParts = frames.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1],
        mimeType: 'image/jpeg',
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          ...imageParts, 
          { text: prompt || "Analyze these video frames and provide technical feedback for a hackathon project." }
        ] 
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nAs a Vision Mentor, analyze the visual progress shown in these frames. Look for UI patterns, logic flows, or hardware setups.",
        temperature: 0.4,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return response.text || "I've analyzed the frames but I'm having trouble describing the result. Try a different clip? 🎥";
  } catch (error: any) {
    console.error("Gemini Multimodal Analysis Error:", error);
    
    if (String(error).includes("413") || String(error).includes("payload too large")) {
      return "⚠️ The video data is too large for your current mobile bandwidth. Try a shorter segment.";
    }

    return "⚠️ Vision processing failed. Let's try a simpler text query instead!";
  }
};