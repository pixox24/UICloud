import { NextResponse } from "next/server";
import fs from "fs";
import { DB_PATH } from "@/lib/runtime-paths";

export async function GET() {
  const dbExists = fs.existsSync(DB_PATH);
  const dbSize = dbExists ? fs.statSync(DB_PATH).size : 0;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbExists ? "connected" : "not_initialized",
    databaseSize: dbSize,
  });
}
