export interface ApiErrorPayload {
  status?: number;
  statusText?: string;
  code?: string | number;
  message: string;
  raw?: unknown;
}

export class DetailedApiError extends Error {
  status?: number;
  statusText?: string;
  code?: string | number;
  raw?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "DetailedApiError";
    this.status = payload.status;
    this.statusText = payload.statusText;
    this.code = payload.code;
    this.raw = payload.raw;
  }
}

const MESSAGE_FIELDS = [
  "detail",
  "message",
  "message_en",
  "error",
  "error_description",
  "title",
] as const;

export function getErrorMessage(error: unknown, fallback = "發生錯誤，請稍後再試。"): string {
  if (error instanceof Error && error.message) {
    return cleanErrorMessage(error.message);
  }

  if (typeof error === "string" && error.trim()) {
    return cleanErrorMessage(error);
  }

  if (isRecord(error)) {
    return extractMessage(error) || fallback;
  }

  return fallback;
}

export async function readErrorResponse(response: Response): Promise<DetailedApiError> {
  const rawText = await response.text().catch(() => "");
  const parsed = parseMaybeJson(rawText);
  const message =
    extractMessage(parsed) ||
    cleanErrorMessage(rawText) ||
    `${response.status} ${response.statusText || "HTTP error"}`;

  return new DetailedApiError({
    status: response.status,
    statusText: response.statusText,
    code: extractCode(parsed) || response.status,
    message,
    raw: parsed ?? rawText,
  });
}

export async function parseJsonOrThrow<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await readErrorResponse(response);
  }

  return response.json() as Promise<T>;
}

function extractMessage(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const nested = parseMaybeJson(value);
    if (nested && nested !== value) {
      return extractMessage(nested) || cleanErrorMessage(value);
    }
    return cleanErrorMessage(value);
  }

  if (Array.isArray(value)) {
    const messages = value.map(extractMessage).filter(Boolean);
    return messages.join("; ") || undefined;
  }

  if (!isRecord(value)) return undefined;

  for (const field of MESSAGE_FIELDS) {
    const message = extractMessage(value[field]);
    if (message) return message;
  }

  const errors = value.errors;
  if (errors) {
    const message = extractMessage(errors);
    if (message) return message;
  }

  return undefined;
}

function extractCode(value: unknown): string | number | undefined {
  if (!isRecord(value)) return undefined;
  return (
    (value.error_code as string | number | undefined) ||
    (value.code as string | number | undefined) ||
    (isRecord(value.error) ? (value.error.code as string | number | undefined) : undefined)
  );
}

function parseMaybeJson(value: string): unknown {
  const text = value.trim();
  if (!text) return undefined;

  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  }

  return value;
}

function cleanErrorMessage(message: string): string {
  const cleaned = message.replace(/^Error:\s*/i, "").trim();
  const openAiStyle = cleaned.match(/^(Error code:\s*\d+\s*-\s*)[\s\S]*['"]message['"]:\s*['"]([^'"]+)['"]/);
  if (openAiStyle) {
    return `${openAiStyle[1]}${openAiStyle[2]}`;
  }
  return cleaned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
