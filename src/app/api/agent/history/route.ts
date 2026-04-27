import { NextRequest, NextResponse } from "next/server";
import { agentCache } from "@/lib/cache";

export async function GET() {
  try {
    const history = agentCache.getAll().map((entry) => ({
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

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const username = typeof data.username === "string" ? data.username : "";
    const interest = typeof data.interest === "string" ? data.interest : "";

    if (!username) {
      return NextResponse.json(
        { error: "Username is required for deletion" },
        { status: 400 }
      );
    }

    const deleted = agentCache.delete(username, interest);
    if (!deleted) {
      return NextResponse.json(
        { error: "History entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete history entry" },
      { status: 500 }
    );
  }
}
