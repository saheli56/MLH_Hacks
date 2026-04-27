import { NextRequest } from "next/server";
import { getRepositoryMaintainers } from "@/lib/github";

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const cache = new Map<string, { ts: number; data: any }>();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const owner = url.searchParams.get("owner");
    const repo = url.searchParams.get("repo");

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: "owner and repo query parameters are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const key = `${owner}/${repo}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await getRepositoryMaintainers(owner, repo);
    cache.set(key, { ts: Date.now(), data: result });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${err instanceof Error ? err.message : "Unknown"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
