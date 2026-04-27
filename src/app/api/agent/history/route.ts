import { NextResponse } from "next/server";
import { agentCache } from "@/lib/cache";

export async function GET() {
  try {
    const history = agentCache.getAll().map(entry => ({
      username: entry.username,
      interest: entry.interest,
      timestamp: entry.timestamp,
    }));
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
