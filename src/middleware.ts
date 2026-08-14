import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];
const ADMIN_API_PREFIXES = ["/api/audit", "/api/upload", "/api/users"];
const ADMIN_API_METHOD_PATHS = [
  { prefix: "/api/assets", methods: ["PUT", "DELETE"] },
  { prefix: "/api/categories", methods: ["POST", "PUT", "DELETE"] },
  { prefix: "/api/menus", methods: ["POST", "PUT", "DELETE"] },
  { prefix: "/api/settings", methods: ["POST", "PUT", "DELETE"] },
  { prefix: "/api/ai-provider", methods: ["POST"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return handleUnauthenticated(request);
  }

  const user = await verifyToken(token);
  if (!user) {
    return handleUnauthenticated(request, "登录已过期");
  }

  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "无权限访问" }, { status: 403 })
      : NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminApiRequest(request) && user.role !== "admin") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAdminApiRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  for (let index = 0; index < ADMIN_API_METHOD_PATHS.length; index += 1) {
    const rule = ADMIN_API_METHOD_PATHS[index];
    if (
      (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) &&
      rule.methods.indexOf(request.method) >= 0
    ) {
      return true;
    }
  }

  return false;
}

function handleUnauthenticated(request: NextRequest, apiMessage = "未登录") {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: apiMessage }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
