// Lightweight local replacements for `clsx` and `tailwind-merge` to avoid external deps.
// These implementations are intentionally small but handle the common cases used in this project.

// A ClassValue type compatible with typical clsx usage (strings, numbers, arrays, objects, etc).
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassDictionary
  | ClassValue[];

interface ClassDictionary {
  [id: string]: unknown;
}

/**
 * clsx - minimal implementation
 * Accepts the same variety of inputs as the original `clsx` package:
 * - strings / numbers
 * - arrays of ClassValue
 * - objects where truthy values include the key
 */
export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const push = (v: ClassValue) => {
    if (!v && v !== 0) return;
    const t = typeof v;
    if (t === "string" || t === "number") {
      classes.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) push(item);
      return;
    }
    if (t === "object") {
      const dict = v as Record<string, unknown>;
      for (const key in dict) {
        if (
          Object.prototype.hasOwnProperty.call(dict, key) &&
          (dict as Record<string, unknown>)[key]
        ) {
          classes.push(key);
        }
      }
    }
  };

  for (const input of inputs) push(input);
  return classes.join(" ");
}

/**
 * twMerge - very small approximation
 * This basic implementation:
 * - joins class lists
 * - collapses duplicate class names while preserving order
 *
 * Note: The real `tailwind-merge` has complex logic to handle conflicting utility classes
 * (like `px-2` vs `px-4`) and groupings. If you rely on those behaviors, consider
 * installing the real package. For many projects a simple duplicate-filter is sufficient.
 */
export function twMerge(...classes: string[]): string {
  const all = classes.filter(Boolean).join(" ").trim();
  if (!all) return "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cls of all.split(/\s+/)) {
    if (!seen.has(cls)) {
      seen.add(cls);
      out.push(cls);
    }
  }
  return out.join(" ");
}

/**
 * cn - convenience helper used across the codebase.
 * Mirrors previous behavior: merge class values via clsx, then run through twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
