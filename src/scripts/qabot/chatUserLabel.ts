export function chatUserLabel(token: string | null, fullName: string | null, userId: string): string {
  if (token && fullName?.trim()) return fullName.trim();
  return `ID: ${userId.substring(0, 8)}...`;
}
