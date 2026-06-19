// Domain barrel — exposes only pure domain modules.
// `mockData.js` is intentionally NOT re-exported here so it cannot be pulled
// into the client bundle via `import { ... } from '@lkp-parduli-rasa/domain'`.
// Server code that needs seed data should import the sub-paths directly:
//   import { ... } from '@lkp-parduli-rasa/domain/defaults';
export * from './defaults.js';
export * from './domainRelations.js';
export * from './entities/index.js';
export * from './use-cases/index.js';
