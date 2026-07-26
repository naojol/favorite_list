import { createHash } from "node:crypto";

export const AUTH_COOKIE = "wl_auth";

/** APP_PASSWORD からクッキー用トークン（sha256）を導出 */
export function authToken(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
