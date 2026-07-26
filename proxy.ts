import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

/**
 * 任意のパスワードロック（apple-design §3 responsibility: プライバシー保護）。
 * APP_PASSWORD が設定されている時だけ有効化。未設定なら素通り（認証なし）。
 * Next.js 16 では middleware は proxy にリネームされ、ランタイムは nodejs。
 */
export function proxy(request: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const authed = request.cookies.get(AUTH_COOKIE)?.value === authToken(pw);

  if (pathname === "/login") {
    return authed
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 静的アセットと画像は除外
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
