/**
 * The strict contract every template provider must satisfy.
 * A provider takes the running context and returns an object that is
 * merged back into it. The engine never inspects the returned shape.
 */
export interface Provider {
  name: string;
  description: string;
  execute(context: Record<string, any>): Promise<Record<string, any>>;
}

/** Runtime guard so a malformed provider file fails loudly, not silently. */
export function isProvider(value: unknown): value is Provider {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Provider).name === "string" &&
    typeof (value as Provider).execute === "function"
  );
}
