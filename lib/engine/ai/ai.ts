import { ChatGoogle } from "@langchain/google";
import type { MessageContent } from "@langchain/core/messages";
import { devWarn } from "@/lib/utils/error-handler";

const MODEL = process.env.AI_MODEL ?? "gemini-1.5-flash"; // default to Gemini 1.5 Flash if not set

/**
 * Ask Gemini (via LangChain's ChatGoogle) to return a JSON object.
 * Returns `null` on any failure so callers can fall back to defaults.
 */
export async function callAiForJson(
  prompt: string
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    devWarn("AI_API_KEY not set — skipping AI, using fallback defaults.");
    return null;
  }

  try {
    const client = new ChatGoogle({
      model: MODEL,
      temperature: 0.7,
      apiKey,
    });

    const message = await client.invoke(prompt);
    const text = extractText(message.content).trim();

    return parseJsonLoose(text);
  } catch (error) {
    devWarn("Gemini call failed — using fallback defaults:", error);
    return null;
  }
}

/** Flatten LangChain message content (string or content blocks) into plain text. */
function extractText(content: MessageContent): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => {
      const text = (block as unknown as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

/** Parse JSON that may be wrapped in ```json fences or surrounded by prose. */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Last resort: grab the outermost {...} span.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
