/** How a section acquires its raw data. */
export type SourceType = "static" | "manual" | "database" | "ai";

/** How raw data becomes one or more slide instances. */
export type ExpansionStrategy = "single" | "repeat" | "chunk";

export interface ExpansionConfig {
  strategy: ExpansionStrategy;
  /** Name of the context array to expand over (for repeat/chunk). */
  collection?: string;
  /** Items per slide (for chunk). */
  size?: number;
}

/** A single section in the blueprint's execution plan. */
export interface BlueprintSection {
  id: string;
  component: string;
  source: SourceType;
  /** Provider name (for `database` sources). */
  provider?: string;
  /** Prompt file name without extension (for `ai` sources). */
  prompt?: string;
  /** Expansion strategy — either a bare strategy string or a config object. */
  expansion: ExpansionStrategy | ExpansionConfig;
  /** Provider/section ids that must run before this one. */
  dependsOn?: string[];
  /** Inline static data (for `static` sources). */
  static?: Record<string, unknown>;
}
