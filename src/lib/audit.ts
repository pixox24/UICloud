import { getDb } from "@/lib/db";
import type { JwtPayload } from "@/lib/auth";

export function logAudit(
  user: JwtPayload | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: string = ""
) {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)"
    ).run(user?.userId ?? null, action, entityType, entityId, details);
  } catch {
    // Silently fail - audit logging should not break the main operation
  }
}
