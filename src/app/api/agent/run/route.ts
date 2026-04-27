import { NextRequest } from "next/server";
import { extractUsername } from "@/lib/github";
import { runPipeline } from "@/lib/pipeline";
import { agentCache } from "@/lib/cache";
import type { PipelineEvent, PipelineResult } from "@/lib/types";

export const maxDuration = 120; // Allow up to 2 minutes for the pipeline

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubUrl, interest, githubToken, geminiKey } = body;

    if (!githubUrl || typeof githubUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "GitHub URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const username = extractUsername(githubUrl);
    if (!username) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub URL or username" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check Cache
    const cachedResult = agentCache.get(username, interest || "");
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: PipelineEvent) => {
          try {
            const data = JSON.stringify(event);
            controller.enqueue(
              encoder.encode(`data: ${data}\n\n`)
            );
          } catch (e) {
            console.error("[SSE] Failed to emit event:", e);
          }
        };

        if (cachedResult) {
          // If cache hit, send a special event or just the final result
          // We'll send a "cache_hit" event and then the complete result
          emit({
            type: "step_complete" as any, // Fake a step complete to show progress or just jump
            step: 1,
            stepName: "Cache",
            data: JSON.stringify({ summary: "Restored from cache" }),
            timestamp: Date.now(),
          });
          
          emit({
            type: "pipeline_complete",
            step: 0,
            stepName: "",
            data: JSON.stringify(cachedResult),
            timestamp: Date.now(),
          });
          controller.close();
          return;
        }

        try {
          const result = await runPipeline(username, interest || "", emit, githubToken, geminiKey);
          // Save to Cache
          agentCache.set(username, interest || "", result);
        } catch (err) {
          const errorEvent: PipelineEvent = {
            type: "step_error",
            step: 0,
            stepName: "Pipeline",
            data: `Pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            timestamp: Date.now(),
          };
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
            );
          } catch {
            // Controller may already be closed
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Controller may already be closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Server error: ${err instanceof Error ? err.message : "Unknown"}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
