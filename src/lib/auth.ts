import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "design-asset-lib-secret-key-2024";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface JwtPayload {
  userId: number;
  username: string;
  role: "admin" | "user";
}

interface JwtTokenPayload extends JwtPayload {
  exp: number;
  iat: number;
}

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function createJwtKey(usage: KeyUsage) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

export async function signToken(payload: JwtPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JwtTokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await createJwtKey("sign");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    const header = JSON.parse(decoder.decode(base64UrlDecode(encodedHeader))) as { alg?: string };
    if (header.alg !== "HS256") {
      return null;
    }

    const key = await createJwtKey("verify");
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(encodedSignature),
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload))) as Partial<JwtTokenPayload>;
    if (
      typeof payload.userId !== "number" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "user") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireAdmin(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return user;
}
