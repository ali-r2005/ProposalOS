import Anthropic from "@anthropic-ai/sdk";
import { devWarn } from "@/lib/utils/error-handler";

/** Locked model for this project (Claude Sonnet 4.6). */
const MODEL = "claude-sonnet-4-6";

/**
 * Send a prompt to Claude and parse the JSON response.
 *
 * The engine stays resilient: if no API key is configured or anything fails,
 * this returns `null` and the caller falls back to defaults — so an HTML
 * preview is always produced even without AI.
 */
export async function callClaudeForJson(
  prompt: string
): Promise<Record<string, unknown> | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    devWarn("ANTHROPIC_API_KEY not set — skipping AI, using fallback defaults.");
    return null;
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return parseJsonLoose(text);
  } catch (error) {
    devWarn("Claude call failed — using fallback defaults:", error);
    return null;
  }
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
