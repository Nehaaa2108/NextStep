/**
 * Opportunity Radar - Person 3 Backend: Contracts, Intelligence Layer & Orchestration
 *
 * Exports all canonical data contracts, domain types, error structures,
 * fixtures loader, normalization module, validation module, deduplication module,
 * filtering module, eligibility module, scoring module, ranking engine,
 * orchestration service, and WebEvidenceProvider interfaces.
 */

export * from './core/types/index.js';
export * from './core/errors/index.js';
export * from './core/config/index.js';
export * from './fixtures/index.js';
export * from './normalize/index.js';
export * from './validate/index.js';
export * from './dedupe/index.js';
export * from './filter/index.js';
export * from './eligibility/index.js';
export * from './scoring/index.js';
export * from './ranking/index.js';
export * from './orchestrator/index.js';
export * from './webcmd/index.js';
