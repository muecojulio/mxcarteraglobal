import { NextRequest, NextResponse } from "next/server";
import { guardApi } from "@/lib/api-guard";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  const blocked = guardApi(req);
  if (blocked) return blocked;
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
