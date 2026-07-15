import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/backend/auth";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response);
    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
