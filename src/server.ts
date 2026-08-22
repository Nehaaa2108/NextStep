/**
 * Opportunity Radar — Root HTTP server entry point.
 *
 * Usage:
 *   npm run start          — starts with MockWebEvidenceProvider (default)
 *   PROVIDER=webcmd npm run start  — (future) use live WebCMD provider
 *
 * Person 2's WebCmdProvider will be wired here once it is delivered.
 */
import { MockWebEvidenceProvider } from './webcmd/mock-provider.js';
import { WebCmdProvider } from './webcmd/webcmd-provider.js';
import { startServer } from './api/server.js';
import { WebEvidenceProvider } from './webcmd/provider.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

// Provider selection: currently only mock is available.
// Swap in WebCmdProvider when Person 2 delivers the live adapter.
const PROVIDER_ENV = process.env['PROVIDER'] ?? 'mock';

let provider: WebEvidenceProvider;

if (PROVIDER_ENV === 'webcmd') {
  provider = new WebCmdProvider();
} else {
  provider = new MockWebEvidenceProvider('success');
}

startServer(provider, PORT);
