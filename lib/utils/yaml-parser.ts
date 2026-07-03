import { parse } from "yaml";

/** Thin wrapper around the `yaml` package so callers depend on one place. */
export function parseYaml<T = unknown>(source: string): T {
  return parse(source) as T;
}
