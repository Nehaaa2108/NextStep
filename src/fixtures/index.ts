import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebEvidence } from '../core/types/evidence.js';
import { BackendError } from '../core/errors/backend-error.js';

export type FixtureName =
  | 'success'
  | 'partial'
  | 'empty'
  | 'duplicate'
  | 'malformed';

export const KNOWN_FIXTURES: readonly FixtureName[] = [
  'success',
  'partial',
  'empty',
  'duplicate',
  'malformed',
] as const;

/**
 * Resolves the path to a fixture JSON file.
 * Handles both development (src/) and compiled (dist/) runtime environments.
 */
export function getFixturePath(fixtureName: FixtureName): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, `../../fixtures/${fixtureName}.json`),
    path.resolve(currentDir, `../../../fixtures/${fixtureName}.json`),
    path.resolve(process.cwd(), `fixtures/${fixtureName}.json`),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new BackendError({
    stage: 'discovery',
    code: 'FIXTURE_NOT_FOUND',
    message: `Fixture "${fixtureName}" not found at any expected location`,
    details: { candidatePaths },
  });
}

/**
 * Synchronously loads a WebEvidence fixture by name.
 */
export function loadFixture(fixtureName: FixtureName): WebEvidence {
  const filePath = getFixturePath(fixtureName);
  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawContent) as WebEvidence;
    return parsed;
  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError({
      stage: 'parse',
      code: 'FIXTURE_PARSE_ERROR',
      message: `Failed to read or parse fixture "${fixtureName}" from ${filePath}`,
      cause: error,
    });
  }
}

/**
 * Asynchronously loads a WebEvidence fixture by name.
 */
export async function loadFixtureAsync(fixtureName: FixtureName): Promise<WebEvidence> {
  return loadFixture(fixtureName);
}
