const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GenerateOptions {
  model?: string;
  messages: OllamaMessage[];
  format?: "json";
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

export function isOllamaAvailable(): boolean {
  return process.env.AI_ENABLED !== "false";
}

export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED !== "false";
}

export async function ollamaChat(
  options: GenerateOptions
): Promise<{ content: string }> {
  const {
    model = OLLAMA_MODEL,
    messages,
    format,
    temperature = 0.4,
    numPredict,
    timeoutMs = 120000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format,
        options: {
          temperature,
          num_ctx: 8192,
          ...(numPredict ? { num_predict: numPredict } : {}),
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama a répondu avec le statut ${res.status}`);
    }

    const data = await res.json();
    return { content: data.message?.content ?? "" };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        /* continue */
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* continue */
      }
    }
    return null;
  }
}