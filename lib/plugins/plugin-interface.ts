/**
 * The strict contract every template plugin must satisfy.
 * A plugin runs at a specific point in the form lifecycle (`trigger`) and
 * returns a partial `{ [fieldKey]: value }` object merged into form values.
 * The engine never inspects what the plugin does internally.
 */
export type PluginTrigger = "onMount";

export interface Plugin {
  name: string;
  description: string;
  trigger: PluginTrigger;
  execute(context: Record<string, any>): Promise<Record<string, any>>;
}

const TRIGGERS: PluginTrigger[] = ["onMount"];

/** Runtime guard so a malformed plugin file fails loudly, not silently. */
export function isPlugin(value: unknown): value is Plugin {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Plugin).name === "string" &&
    typeof (value as Plugin).execute === "function" &&
    TRIGGERS.includes((value as Plugin).trigger)
  );
}
