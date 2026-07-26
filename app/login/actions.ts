"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) redirect("/"); // 認証無効時はそのまま入れる

  const input = String(formData.get("password") ?? "");
  if (input !== pw) return { error: "パスワードが違います" };

  const jar = await cookies();
  jar.set(AUTH_COOKIE, authToken(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
