import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { initializeDatabase } from "@/lib/init-db";

const [username, password, roleArg] = process.argv.slice(2);
const role = (roleArg || "user").toLowerCase();

if (!username || !password) {
  console.error("Usage: npm run user:add -- <username> <password> [admin|user]");
  process.exit(1);
}

if (!["admin", "user"].includes(role)) {
  console.error('Role must be either "admin" or "user".');
  process.exit(1);
}

initializeDatabase();

const db = getDb();
const existingUser = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get(username) as { id: number } | undefined;

if (existingUser) {
  console.error(`User "${username}" already exists.`);
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);
const result = db
  .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
  .run(username, passwordHash, role);

console.log(`User created successfully. id=${result.lastInsertRowid}, username=${username}, role=${role}`);
