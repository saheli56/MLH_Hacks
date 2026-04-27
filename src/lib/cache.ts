import fs from "fs";
import path from "path";
import type { PipelineResult } from "./types";

const CACHE_FILE = path.join(process.cwd(), "agent-cache.json");

interface CacheEntry {
  username: string;
  interest: string;
  result: PipelineResult;
  timestamp: number;
}

class CacheSystem {
  private cache: Map<string, CacheEntry> = new Map();

  constructor() {
    this.loadCache();
  }

  private getKey(username: string, interest: string): string {
    return `${username.toLowerCase()}:${interest.toLowerCase()}`;
  }

  private loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, entry]) => {
          this.cache.set(key, entry as CacheEntry);
        });
      }
    } catch (err) {
      console.error("Failed to load cache:", err);
    }
  }

  private saveCache() {
    try {
      const data: Record<string, CacheEntry> = {};
      this.cache.forEach((value, key) => {
        data[key] = value;
      });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to save cache:", err);
    }
  }

  public get(username: string, interest: string): PipelineResult | null {
    const key = this.getKey(username, interest);
    const entry = this.cache.get(key);
    return entry ? entry.result : null;
  }

  public set(username: string, interest: string, result: PipelineResult) {
    const key = this.getKey(username, interest);
    this.cache.set(key, {
      username,
      interest,
      result,
      timestamp: Date.now(),
    });
    this.saveCache();
  }

  public getAll(): CacheEntry[] {
    return Array.from(this.cache.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const agentCache = new CacheSystem();
