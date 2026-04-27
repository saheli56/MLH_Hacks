/**
 * Lightweight local implementation of a subset of `class-variance-authority` (CVA).
 *
 * - Exports `cva` to create variant-aware class generators.
 * - Exports `VariantProps<typeofX>` to extract variant props types for components.
 *
 * This implementation focuses on the features used in the codebase:
 * - `variants` (map of variantName -> map of variantValue -> class string)
 * - `defaultVariants`
 * - Returned function accepts an object with variant selections and an optional `className`
 *
 * Note: This is a simplified implementation intended to satisfy build-time imports
 * and common usages in the project. It does not implement the full CVA feature set
 * (compoundVariants, boolean variants, complex merging behavior, etc.).
 */

/* eslint-disable */

type VariantMap = Record<string, Record<string, string>>;

type Config<V extends VariantMap | object = Record<string, never>> = {
  variants?: V;
  defaultVariants?: V extends VariantMap
    ? Partial<{ [K in keyof V]: keyof V[K] & string }>
    : Record<string, never>;
};

type OptionsFromVariants<
  V extends VariantMap | object = Record<string, never>,
> = V extends VariantMap
  ? Partial<{ [K in keyof V]: keyof V[K] & string }> & { className?: string }
  : { className?: string };

/**
 * cva - create a variant-aware className generator
 *
 * Example:
 * const btn = cva("base", {
 *   variants: { size: { sm: "text-sm", lg: "text-lg" } },
 *   defaultVariants: { size: "sm" }
 * })
 *
 * btn({ size: "lg", className: "extra" }) -> "base text-lg extra"
 */
export function cva<V extends VariantMap | object = Record<string, never>>(
  base: string | string[],
  config?: Config<V>,
) {
  const baseStr = Array.isArray(base)
    ? base.filter(Boolean).join(" ")
    : base || "";

  const fn = (options?: OptionsFromVariants<V>) => {
    const parts: string[] = [];

    if (baseStr) parts.push(baseStr);

    const variants = (config && (config.variants as VariantMap)) || {};
    const defaults =
      (config && (config.defaultVariants as Record<string, string>)) || {};

    // If options is not provided, treat as empty object
    const opts = (options || {}) as Record<string, unknown>;

    // Iterate known variant keys and append corresponding classes
    for (const variantKey of Object.keys(variants)) {
      const variantValues = variants[variantKey] || {};
      const optVal = (opts as Record<string, unknown>)[variantKey];
      const selected =
        optVal !== undefined ? String(optVal) : defaults[variantKey];

      if (selected && variantValues[selected]) {
        parts.push(variantValues[selected]);
      }
    }

    // Allow passing extra classes via `className`
    if (opts.className) {
      parts.push(String(opts.className));
    }

    return parts.filter(Boolean).join(" ").trim();
  };

  // Attach the variants to the returned function's type shape so TypeScript can infer them
  // at the call-site via `VariantProps<typeof returnedFn>`
  return Object.assign(fn, {
    __variants: (config && config.variants) || {},
    __defaultVariants: (config && config.defaultVariants) || {},
  }) as unknown as ((options?: OptionsFromVariants<V>) => string) & {
    __variants: V;
    __defaultVariants: Config<V>["defaultVariants"];
  };
}

/**
 * VariantProps<T>
 *
 * Extracts the allowed variant props for a cva-generated function.
 *
 * Usage:
 * const v = cva(...);
 * type Props = VariantProps<typeof v>;
 *
 * This will produce a type like `{ variant?: "default" | "secondary"; className?: string }`
 */
export type VariantProps<T> = T extends { __variants: infer V }
  ? V extends VariantMap
    ? Partial<{ [K in keyof V]: keyof V[K] & string }> & { className?: string }
    : { className?: string }
  : { className?: string };
