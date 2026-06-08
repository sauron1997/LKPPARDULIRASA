/**
 * Memory Repository Provider — wraps the in-memory repository adapter
 * into the same interface shape as the Drizzle provider.
 *
 * This is intentionally a thin re-export so that repositories/index.js
 * can treat both memory and Drizzle identically.
 */
import { createRepoAdapter } from '../adapters/repository-adapter.js';

export function createMemoryRepositories(backendContext) {
  return createRepoAdapter(backendContext);
}
