
import { GoogleGenAI } from "@google/genai";
import { User, AIResponse, Source } from '../types';
import { decrypt } from './security';
import * as db from './database';

// SYSTEM DEFAULT KEY (Fallback)
const SYSTEM_GEMINI_KEY = (import.meta as any).env?.VITE_API_KEY;

export interface AIRequestConfig {
    systemInstruction?: string;
    jsonMode?: boolean;
    tools?: any[]; // Allow passing tools like googleSearch
}

/**
 * Unified function to generate text from any configured AI provider.
 * Now accepts 'contents' as string or array of parts for multimodal input.
 */
export const generateAIContent = async (contents: string | any[], config: AIRequestConfig = {}): Promise<AIResponse> => {
    // 1. Get Current User to check preferences
    const user = await db.getLastActiveUser();
    const provider = user?.active_ai_provider || 'gemini';
    
    // 2. Decrypt User Keys
    const userGeminiKey = user?.gemini_key ? decrypt(user.gemini_key) : null;
    const userOpenAIKey = user?.openai_key ? decrypt(user.openai_key) : null;
    const userAnthropicKey = user?.anthropic_key ? decrypt(user.anthropic_key) : null;

    // console.log(`[AI Service] Using Provider: ${provider.toUpperCase()}`);

    try {
        switch (provider) {
            case 'openai':
                if (!userOpenAIKey) throw new Error("OpenAI API Key not configured.");
                // OpenAI call expects prompt as string, so if contents is an array, we'll extract text.
                // For multimodal, OpenAI would need explicit image data handling here.
                return await callOpenAI(userOpenAIKey, typeof contents === 'string' ? contents : (contents as any[]).map(p => {
                    if ('text' in p) return p.text;
                    return ''; // Ignore non-text parts for now
                }).join(' '), config);
            
            case 'anthropic':
                if (!userAnthropicKey) throw new Error("Anthropic API Key not configured.");
                // Anthropic call expects prompt as string, similar to OpenAI.
                return await callAnthropic(userAnthropicKey, typeof contents === 'string' ? contents : (contents as any[]).map(p => {
                    if ('text' in p) return p.text;
                    return ''; // Ignore non-text parts for now
                }).join(' '), config);
            
            case 'gemini':
            default:
                // Use user key if available, else system key
                const keyToUse = userGeminiKey || SYSTEM_GEMINI_KEY;
                if (!keyToUse) throw new Error("No Gemini API Key available.");
                return await callGemini(keyToUse, contents, config);
        }
    } catch (error: any) {
        const errorMsg = error.message || JSON.stringify(error);
        const isQuotaError = 
            error.status === 429 || 
            error.code === 429 ||
            errorMsg.includes('429') || 
            errorMsg.toLowerCase().includes('quota') || 
            errorMsg.includes('RESOURCE_EXHAUSTED') ||
            errorMsg.toLowerCase().includes('rate limit'); // Added for OpenAI/Anthropic
        
        // If it's a specific key configuration error (thrown from switch), re-throw it directly.
        if (errorMsg.includes("API Key not configured.") || errorMsg.includes("No Gemini API Key available.")) {
            throw error; // Propagate the specific config error
        }

        // Graceful handling for Quota Exceeded or Rate Limits
        if (isQuotaError) {
             console.warn(`[AI Service] Quota exceeded for ${provider}.`);
             // Attempt fallback to System Gemini if possible
             if (provider !== 'gemini' && SYSTEM_GEMINI_KEY) {
                try {
                    console.warn("[AI Service] Falling back to System Gemini on quota...");
                    // When falling back, only send text part as other models might not handle image parts easily.
                    const textOnlyContents = typeof contents === 'string' ? contents : (contents as any[]).map(p => {
                        if ('text' in p) return p.text;
                        return ''; // Ignore non-text parts for now
                    }).join(' ');
                    return await callGemini(SYSTEM_GEMINI_KEY, textOnlyContents, config);
                } catch (fallbackError: any) {
                     // If fallback also hits quota or fails, throw specific quota error
                     const fallbackMsg = fallbackError.message || JSON.stringify(fallbackError);
                     const isFallbackQuotaError = 
                        fallbackError.status === 429 || 
                        fallbackMsg.includes('429') || 
                        fallbackMsg.toLowerCase().includes('quota') ||
                        fallbackMsg.toLowerCase().includes('rate limit') ||
                        fallbackMsg.includes('RESOURCE_EXHAUSTED');

                     if (isFallbackQuotaError) {
                         console.error("[AI Service] Fallback Gemini also hit quota/failed.");
                         throw new Error(`AI Quota Exceeded for ${provider} (and System Gemini fallback)`); 
                     }
                     throw fallbackError; // Re-throw other fallback errors
                }
             }
             // If no fallback, or fallback also failed due to quota
             throw new Error(`AI Quota Exceeded for ${provider}`);
        }

        console.error(`[AI Service] Unhandled Error with ${provider}:`, error);
        
        // For other unhandled non-quota errors, re-throw for specific handling in UI.
        throw error;
    }
};

/**
 * Tests the Gemini API key by making a minimal request.
 */
export const testGeminiConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
        return { success: false, message: "API Key is empty." };
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'test',
            config: { maxOutputTokens: 5 }, // minimal output
        });
        if (response.text !== undefined) { // Check if text property exists, indicates successful response
            return { success: true, message: "Gemini connection successful!" };
        } else {
            return { success: false, message: "Gemini connected, but no content in response. Check API status." };
        }
    } catch (e: any) {
        return { success: false, message: `Gemini connection failed: ${e.message || JSON.stringify(e)}` };
    }
};

/**
 * Tests the OpenAI API key by making a minimal request.
 */
export const testOpenAIConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
        return { success: false, message: "API Key is empty." };
    }
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // Use a cheaper/faster model for testing
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 5, // Minimal tokens
            })
        });

        if (response.ok) {
            // Further check if the response contains expected structure, though 200 is usually enough for key validation
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                return { success: true, message: "OpenAI connection successful!" };
            } else {
                return { success: false, message: "OpenAI connected, but no choices in response. Check API status." };
            }
        } else {
            const err = await response.json();
            return { success: false, message: `OpenAI connection failed: ${err.error?.message || response.statusText}` };
        }
    } catch (e: any) {
        return { success: false, message: `OpenAI connection failed: Network error or invalid key. (${e.message || JSON.stringify(e)})` };
    }
};

/**
 * Tests the Anthropic API key by making a minimal request.
 */
export const testAnthropicConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
        return { success: false, message: "API Key is empty." };
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-3-haiku-20240307", // Use a cheaper/faster model for testing
                max_tokens: 5, // Minimal tokens
                messages: [
                    { role: "user", content: "Hello" }
                ]
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.content && data.content.length > 0) {
                return { success: true, message: "Anthropic connection successful!" };
            } else {
                return { success: false, message: "Anthropic connected, but no content in response. Check API status." };
            }
        } else {
            const err = await response.json();
            return { success: false, message: `Anthropic connection failed: ${err.error?.message || response.statusText}` };
        }
    } catch (e: any) {
        return { success: false, message: `Anthropic connection failed: Network error or invalid key. (${e.message || JSON.stringify(e)})` };
    }
};

// --- PROVIDER IMPLEMENTATIONS ---

const callGemini = async (apiKey: string, contents: string | any[], config: AIRequestConfig): Promise<AIResponse> => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Check if using Google Search tool
    const hasGoogleSearch = config.tools?.some((t: any) => t.googleSearch !== undefined);

    // Config object for Gemini
    const geminiConfig: any = {
        // systemInstruction: config.systemInstruction, // System instruction handled in contents
    };

    // CRITICAL: Google Search Grounding is incompatible with responseMimeType.
    // Only set responseMimeType if NOT using Google Search.
    if (!hasGoogleSearch) {
        geminiConfig.responseMimeType = config.jsonMode ? "application/json" : "text/plain";
    }

    // Attach tools if provided (e.g. googleSearch)
    if (config.tools) {
        geminiConfig.tools = config.tools;
    }

    // NEW: Handle systemInstruction as part of contents for multimodal input for Gemini
    let finalContents: any[] = [];
    if (config.systemInstruction) {
        finalContents.push({ text: config.systemInstruction });
    }

    if (typeof contents === 'string') {
        finalContents.push({ text: contents });
    } else {
        // Ensure that text parts are objects with a 'text' property and inlineData parts are correctly formed.
        contents.forEach(part => {
            if ('text' in part) {
                finalContents.push({ text: part.text });
            } else if ('inlineData' in part) {
                finalContents.push({ inlineData: part.inlineData });
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalContents, // Use the new 'contents' parameter directly
            config: geminiConfig,
        });
        
        // Extract grounding sources
        const groundingSources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
            .filter((chunk: any) => chunk.web?.uri) // Only consider web sources
            .map((chunk: any) => ({
                title: chunk.web.title || chunk.web.uri,
                uri: chunk.web.uri
            }));

        return { text: response.text || '', groundingSources };
    } catch (e: any) {
        // RETRY LOGIC: If the call failed and we were using Tools (like Search), 
        // try again WITHOUT tools as a fallback to ensure we get SOME content.
        if (config.tools && config.tools.length > 0) {
            console.warn("Gemini Search/Tools failed, retrying with standard generation...", e.message);
            
            // Create clean config for retry without tools
            const fallbackConfig: any = {
                // systemInstruction: config.systemInstruction, // System instruction handled in contents
                responseMimeType: config.jsonMode ? "application/json" : "text/plain"
            };

            // Ensure to extract only text content for fallback if original was multimodal
            const textOnlyContents = finalContents.map(p => {
                if ('text' in p) return p.text;
                return ''; // Ignore inlineData parts for text-only fallback
            }).join(' ');

            const retryResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: textOnlyContents,
                config: fallbackConfig,
            });
            // On fallback, there won't be grounding sources
            return { text: retryResponse.text || '', groundingSources: [] };
        }
        
        // Re-throw if it wasn't a tool error or if retry failed
        throw new Error(`Gemini Error: ${e.message || JSON.stringify(e)}`);
    }
};

const callOpenAI = async (apiKey: string, prompt: string, config: AIRequestConfig): Promise<AIResponse> => {
    const messages = [];
    if (config.systemInstruction) {
        messages.push({ role: "system", content: config.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o", // or gpt-3.5-turbo
            messages: messages,
            response_format: config.jsonMode ? { type: "json_object" } : undefined
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { text: data.choices[0]?.message?.content || '', groundingSources: [] };
};

const callAnthropic = async (apiKey: string, prompt: string, config: AIRequestConfig): Promise<AIResponse> => {
    // Note: Anthropic calls from browser might fail CORS unless a proxy is used. 
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1024,
            system: config.systemInstruction,
            messages: [
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Anthropic Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { text: data.content[0]?.text || '', groundingSources: [] };
};
