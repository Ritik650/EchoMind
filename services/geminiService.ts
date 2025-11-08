import { GoogleGenAI, Modality } from '@google/genai';
import { Message, Persona } from '../types';
import { PERSONA_SYSTEM_PROMPTS, PERSONA_VOICES } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable not set');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const textModel = 'gemini-2.5-flash';
const ttsModel = 'gemini-2.5-flash-preview-tts';

// --- Audio Decoding Utilities ---
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
  
export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext
): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


// --- Core AI Services ---

export async function getAIResponseStream(
  history: Message[],
  newMessage: string
) {
  const personaOptions = Object.values(Persona).join('", "');

  const systemInstruction = `You are EchoMind, an AI cognitive co-pilot. Your task is to analyze the user's message and then respond using a specific persona to help them reflect.

    1.  **Analyze Emotion**: Read the user's latest message and the conversation history to understand their emotional state (e.g., anxiety, sadness, stress, feeling stuck).
    2.  **Select Persona**: Based on the emotion, choose the *single best* persona to respond with from this list: ["${personaOptions}"].
    3.  **Format and Respond**: Your entire response MUST begin with a special tag on its own line to identify the chosen persona, like this: \`[PERSONA: The Pragmatist]\`. On the next line, write your response from the perspective of that persona.
    
    **Persona Descriptions:**
    ${Object.entries(PERSONA_SYSTEM_PROMPTS)
      .map(([key, value]) => `- **${key}**: ${value}`)
      .join('\n')}

    Start with an empathetic acknowledgment of the user's feelings, then transition into the persona's specific style. Focus on their most recent message in the context of the history.`;

  const chatHistory = history.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const contents = [...chatHistory, { role: 'user', parts: [{ text: newMessage }] }];
  
  try {
    const response = await ai.models.generateContentStream({
      model: textModel,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response;
  } catch (error) {
    console.error('Error getting AI stream:', error);
    throw new Error('Failed to get streaming response from AI.');
  }
}

export async function getSpeech(text: string, persona: Persona): Promise<AudioBuffer | null> {
    try {
        const voiceName = PERSONA_VOICES[persona] || 'Zephyr';
        const response = await ai.models.generateContent({
            model: ttsModel,
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            // FIX: Cast window to `any` to access non-standard `webkitAudioContext`.
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext);
            return audioBuffer;
        }
        return null;
    } catch (error) {
        console.error('Error generating speech:', error);
        return null;
    }
}