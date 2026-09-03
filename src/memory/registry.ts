/**
 * Memory strategy registry: name → factory. Adding a strategy = one directory
 * under ./strategies/ plus one entry here; the engine and the dev harness pick
 * it by name (MEMORY_STRATEGY env var, `--memory=<name>` per engine start).
 * Unknown names fail fast at startup with the registered list.
 */
import { createStructuredMemoryStrategy } from "./strategies/structured/index.ts";
import type { MemoryStrategy, MemoryStrategyDeps, MemoryStrategyFactory } from "./strategy.ts";

export const MEMORY_STRATEGIES: Readonly<Record<string, MemoryStrategyFactory>> = {
  /** Spec §10 design: typed fact/episode/playbook rows, kind-priority + recency hydration, end-of-ticket summarizer. */
  structured: createStructuredMemoryStrategy,
};

export function listMemoryStrategies(): string[] {
  return Object.keys(MEMORY_STRATEGIES);
}

export function createMemoryStrategy(name: string, deps: MemoryStrategyDeps): MemoryStrategy {
  const factory = Object.hasOwn(MEMORY_STRATEGIES, name) ? MEMORY_STRATEGIES[name] : undefined;
  if (factory === undefined) {
    throw new Error(
      `Unknown memory strategy "${name}" — registered: ${listMemoryStrategies().join(", ")}. ` +
        "Set MEMORY_STRATEGY (engine and dev harness alike) or pass --memory=<name> to the engine.",
    );
  }
  return factory(deps);
}
