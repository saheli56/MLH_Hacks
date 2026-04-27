import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Config ────────────────────────────────────────────────

export const LITE_MODEL = "gemini-3.1-flash-lite-preview";
export const REASONING_MODEL = "gemini-3-flash-preview";
export const FALLBACK_MODEL = "gemini-2.5-flash";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

function getClient(customApiKey?: string): GoogleGenerativeAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set and no API key provided");
  }
  return new GoogleGenerativeAI(apiKey);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSON Extraction ───────────────────────────────────────

/**
 * Extracts JSON from Gemini responses that may be wrapped in markdown code blocks
 */
export function extractJSON<T>(text: string): T {
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }

    // Try finding JSON-like structure
    const braceMatch = text.match(/(\{[\s\S]*\})/);
    if (braceMatch) {
      return JSON.parse(braceMatch[1]) as T;
    }

    const bracketMatch = text.match(/(\[[\s\S]*\])/);
    if (bracketMatch) {
      return JSON.parse(bracketMatch[1]) as T;
    }

    throw new Error(`Failed to extract JSON from response: ${text.substring(0, 200)}...`);
  }
}

// ── Standard Call ─────────────────────────────────────────

export async function callGemini(
  primaryModel: string,
  fallbackModel: string | undefined,
  prompt: string,
  customApiKey?: string
): Promise<string> {
  const models = [primaryModel];
  if (fallbackModel) models.push(fallbackModel);

  for (const model of models) {
    let delay = INITIAL_DELAY;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const client = getClient(customApiKey);
        const genModel = client.getGenerativeModel({
          model,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (err) {
        console.error(
          `[Gemini] Error on attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${model}:`,
          err
        );
        if (attempt < MAX_RETRIES) {
          console.log(`[Gemini] Retrying in ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
          continue;
        }
        // If this is the last model, throw
        if (model === models[models.length - 1]) {
          throw err;
        }
        // Otherwise, try next model
      }
    }
  }
  throw new Error(`All models failed after retries`);
}

// ── Streaming Call ────────────────────────────────────────

export async function callGeminiStreaming(
  primaryModel: string,
  fallbackModel: string | undefined,
  prompt: string,
  onChunk: (text: string) => void,
  customApiKey?: string
): Promise<string> {
  const models = [primaryModel];
  if (fallbackModel) models.push(fallbackModel);

  for (const model of models) {
    let delay = INITIAL_DELAY;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const client = getClient(customApiKey);
        const genModel = client.getGenerativeModel({
          model,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await genModel.generateContentStream(prompt);

        let fullText = "";
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }
        return fullText;
      } catch (err) {
        console.error(
          `[Gemini] Streaming error on attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${model}:`,
          err
        );
        if (attempt < MAX_RETRIES) {
          console.log(`[Gemini] Retrying in ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
          continue;
        }
        // If this is the last model, throw
        if (model === models[models.length - 1]) {
          throw err;
        }
        // Otherwise, try next model
      }
    }
  }
  throw new Error(`All models failed after retries`);
}
