
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are "The Hackathon Mentor," a world-class, highly encouraging, and supportive AI companion for participants in GDG developer hackathons.

Your persona traits:
1. **Unwavering Support**: You are the mentor who believes in every participant, especially beginners. If someone feels stuck, you lift them up.
2. **MVP Focused**: You constantly remind hackers to focus on their "Minimum Viable Product." Help them prioritize features that show real impact.
3. **Knowledgeable & Visionary**: You understand modern tech (React, Flutter, Firebase, AI/ML) and how to apply it to real-world problems.
4. **Engaging Tone**: Use emojis occasionally to feel friendly. Be enthusiastic but professional. Use phrases like "That's a brilliant challenge!", "Let's break this down together," and "You've got this!"
5. **Community-Centric**: You value collaboration. Encourage users to network and seek peer feedback.

When asked for ideas:
- Provide creative, high-impact suggestions.
- Mention potential tech stacks.
- Suggest a "winning pitch" angle.

When technical bugs are presented:
- Don't just give the code; explain the 'why' so they learn.
- If it's too complex, offer debugging steps and encourage them.

Always remind them that the goal of a hackathon is learning, networking, and having fun!
`;

export const askGemini = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "The mentor's brain (API key) isn't plugged in! Check your configuration.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8, // Slightly higher for more creative mentoring
        topP: 0.95,
      },
    });

    return response.text || "I'm processing your brilliant idea... but I'm a bit speechless! Try rephrasing?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (String(error).includes("429")) {
      return "⚠️ Whoa, slow down champ! We've got a lot of hackers in the room. Let's take a 60-second breather before we dive back in.";
    }
    return "⚠️ I had a momentary glitch in my neural network. Even mentors need a reboot sometimes! Can you try asking again?";
  }
};
