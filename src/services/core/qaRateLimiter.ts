const WINDOW_MS = 60_000;
const ANONYMOUS_LIMIT = 1;
const PALAIS_LIMIT = 10;
const STORAGE_PREFIX = "qabot_rate_limit";

export interface QaRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  isPalaisUser: boolean;
}

export function checkQaRateLimit(now = Date.now()): QaRateLimitResult {
  const token = localStorage.getItem("token") || "";
  const isPalaisUser = hasPalaisAccess(token);
  const limit = isPalaisUser ? PALAIS_LIMIT : ANONYMOUS_LIMIT;
  const identity = getRateLimitIdentity(token, isPalaisUser);
  const storageKey = `${STORAGE_PREFIX}:${identity}`;
  const bucket = readBucket(storageKey);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    writeBucket(storageKey, { windowStart: now, count: 1 });
    return { allowed: true, limit, remaining: limit - 1, retryAfterMs: 0, isPalaisUser };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(0, WINDOW_MS - (now - bucket.windowStart)),
      isPalaisUser,
    };
  }

  bucket.count += 1;
  writeBucket(storageKey, bucket);
  return {
    allowed: true,
    limit,
    remaining: limit - bucket.count,
    retryAfterMs: 0,
    isPalaisUser,
  };
}

export function formatQaRateLimitMessage(result: QaRateLimitResult): string {
  const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  const userType = result.isPalaisUser ? "Palais 使用者" : "匿名使用者";
  return `QA 使用頻率過高：${userType}每分鐘最多 ${result.limit} 次，請 ${seconds} 秒後再試。`;
}

function readBucket(key: string): { windowStart: number; count: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.windowStart === "number" && typeof parsed.count === "number") {
      return parsed;
    }
  } catch (_) {}
  return null;
}

function writeBucket(key: string, value: { windowStart: number; count: number }) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function getRateLimitIdentity(token: string, isPalaisUser: boolean): string {
  if (!token || !isPalaisUser) return "anonymous";
  const claims = decodeJwtPayload(token);
  return `palais:${claims?.sub || claims?.preferred_username || "user"}`;
}

function hasPalaisAccess(token: string): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims) return false;
  return hasManageUsersRole(claims.realm_access) ||
    Object.values(claims.resource_access || {}).some(hasManageUsersRole);
}

function hasManageUsersRole(access: unknown): boolean {
  const roles = (access as { roles?: unknown })?.roles;
  return Array.isArray(roles) && roles.includes("manage-users");
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
}
