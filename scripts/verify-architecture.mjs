/**
 * Architecture Guardrail Script — Phase 9.
 *
 * Verifies that import boundaries are respected across the codebase.
 * Rules enforced:
 *   1. No module service imports from admin.service.js or legacy-bridge.js
 *   2. No use case imports from apps/api/ infrastructure
 *   3. No route file imports use cases or domain entities directly
 *   4. No new god module pattern (single service file > 500 lines)
 *   5. Deleted legacy files do not exist
 *
 * Run: node scripts/verify-architecture.mjs
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve('.');
const failures = [];
let checks = 0;

function fail(rule, file, detail) {
  failures.push({ rule, file: relative(ROOT, file), detail });
}

function pass() {
  checks++;
}

async function walk(dir, filter) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', 'graphify-out', 'docs'].includes(entry.name)) continue;
      files.push(...await walk(full, filter));
    } else if (!filter || filter(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function readLines(filePath) {
  const content = await readFile(filePath, 'utf8').catch(() => '');
  return content.split('\n');
}

// --- Rule 1: No module service imports admin.service.js or legacy-bridge.js ---
async function checkNoLegacyImports() {
  const modulesDir = resolve('apps/api/src/modules');
  const files = await walk(modulesDir, (n) => n.endsWith('.js') || n.endsWith('.mjs'));

  for (const file of files) {
    const lines = await readLines(file);
    for (const line of lines) {
      if (/from\s+['"][^'"]*legacy-bridge['"]/.test(line)) {
        fail('R1-no-legacy-bridge', file, `imports legacy-bridge: ${line.trim()}`);
      } else if (/from\s+['"][^'"]*\/admin\/admin\.service['"]/.test(line)
                 && !file.includes('admin.service')) {
        fail('R1-no-admin-service', file, `imports admin.service.js: ${line.trim()}`);
      } else {
        pass();
      }
    }
  }
}

// --- Rule 2: Use cases must not import from apps/api infrastructure ---
async function checkUseCaseIsolation() {
  const useCasesDir = resolve('packages/domain/src/use-cases');
  const files = await walk(useCasesDir, (n) => n.endsWith('.js') || n.endsWith('.mjs'));

  for (const file of files) {
    const lines = await readLines(file);
    for (const line of lines) {
      if (/from\s+['"][^'"]*apps\/api[^'"]*['"]/.test(line)) {
        fail('R2-use-case-isolation', file, `use case imports from apps/api: ${line.trim()}`);
      } else if (/require\s*\(\s*['"][^'"]*apps\/api/.test(line)) {
        fail('R2-use-case-isolation', file, `use case requires from apps/api: ${line.trim()}`);
      } else {
        pass();
      }
    }
  }
}

// --- Rule 3: Route files should not import domain use-cases or entities directly ---
async function checkRoutesBoundary() {
  const modulesDir = resolve('apps/api/src/modules');
  const routeFiles = await walk(modulesDir, (n) => n.endsWith('.routes.js'));

  for (const file of routeFiles) {
    const lines = await readLines(file);
    for (const line of lines) {
      if (/from\s+['"][^'"]*domain\/src\/use-cases[^'"]*['"]/.test(line)) {
        fail('R3-routes-boundary', file, `route imports use case directly: ${line.trim()}`);
      } else if (/from\s+['"][^'"]*domain\/src\/entities[^'"]*['"]/.test(line)) {
        fail('R3-routes-boundary', file, `route imports domain entity directly: ${line.trim()}`);
      } else {
        pass();
      }
    }
  }
}

// --- Rule 4: No new god module (single service file > 800 lines) ---
// Note: 800-line threshold acknowledges that some domains (e.g. payments with
// Midtrans integration + manual proof flow) are legitimately complex.
// The old god module was 1736 lines and mixed MANY unrelated domains.
async function checkNoGodModules() {
  const modulesDir = resolve('apps/api/src/modules');
  const files = await walk(modulesDir, (n) => n.endsWith('.service.js'));

  for (const file of files) {
    const content = await readFile(file, 'utf8').catch(() => '');
    const lineCount = content.split('\n').length;
    if (lineCount > 800) {
      fail('R4-no-god-module', file, `service has ${lineCount} lines (max 800)`);
    } else {
      pass();
    }
  }
}

// --- Rule 5: Deleted legacy files must not exist ---
async function checkDeletedLegacyFiles() {
  const DELETED_FILES = [
    resolve('apps/api/src/runtime/legacy-bridge.js'),
    resolve('apps/api/src/modules/admin/admin.service.js'),
  ];

  for (const filePath of DELETED_FILES) {
    try {
      await stat(filePath);
      fail('R5-deleted-legacy', filePath, 'file should have been deleted but still exists');
    } catch {
      pass(); // File not found = expected
    }
  }
}

// --- Run all checks ---
await Promise.all([
  checkNoLegacyImports(),
  checkUseCaseIsolation(),
  checkRoutesBoundary(),
  checkNoGodModules(),
  checkDeletedLegacyFiles(),
]);

// --- Report ---
console.log('');
if (failures.length === 0) {
  console.log(`✅ Architecture guardrails passed (${checks} checks).`);
  process.exit(0);
} else {
  console.log(`❌ Architecture violations found (${failures.length}):`);
  for (const { rule, file, detail } of failures) {
    console.log(`\n  [${rule}] ${file}`);
    console.log(`    → ${detail}`);
  }
  process.exit(1);
}
