import http from 'node:http';
import { UserRequest } from '../core/types/request.js';
import { WebEvidenceProvider } from '../webcmd/provider.js';
import { MockWebEvidenceProvider } from '../webcmd/mock-provider.js';
import { runOpportunitySearch } from '../orchestrator/orchestrate.js';

/**
 * Reads the full request body as a UTF-8 string.
 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Writes a JSON response with the given status code.
 */
function jsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

/**
 * Validates that the parsed body is a structurally valid UserRequest.
 * Returns a list of validation error messages (empty = valid).
 */
function validateUserRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    errors.push('Request body must be a JSON object');
    return errors;
  }
  const b = body as Record<string, unknown>;
  if (typeof b['query'] !== 'string' || b['query'].trim() === '') {
    errors.push('"query" must be a non-empty string');
  }
  if (b['opportunityTypes'] !== undefined && !Array.isArray(b['opportunityTypes'])) {
    errors.push('"opportunityTypes" must be an array when provided');
  }
  if (b['skills'] !== undefined && !Array.isArray(b['skills'])) {
    errors.push('"skills" must be an array when provided');
  }
  if (b['remote'] !== undefined && typeof b['remote'] !== 'boolean') {
    errors.push('"remote" must be a boolean when provided');
  }
  return errors;
}

/**
 * Creates the Opportunity Radar HTTP server.
 *
 * Routes:
 *   GET  /api/health  → liveness check
 *   POST /api/search  → run intelligence pipeline, return ProductResult
 *
 * @param provider Evidence provider to use (defaults to MockWebEvidenceProvider)
 * @returns node:http Server instance (not yet listening)
 */
export function createServer(
  provider?: WebEvidenceProvider
): http.Server {
  const activeProvider: WebEvidenceProvider =
    provider ?? new MockWebEvidenceProvider('success');

  const server = http.createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';

    // ── CORS preflight ─────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // ── GET /api/health ────────────────────────────────────────────────────
    if (method === 'GET' && url === '/api/health') {
      jsonResponse(res, 200, {
        status: 'ok',
        provider: activeProvider.providerName,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ── POST /api/search ───────────────────────────────────────────────────
    if (method === 'POST' && url === '/api/search') {
      let rawBody: string;
      try {
        rawBody = await readBody(req);
      } catch {
        jsonResponse(res, 400, {
          error: 'Failed to read request body',
          code: 'BODY_READ_ERROR',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        jsonResponse(res, 400, {
          error: 'Request body must be valid JSON',
          code: 'INVALID_JSON',
        });
        return;
      }

      const validationErrors = validateUserRequest(parsed);
      if (validationErrors.length > 0) {
        jsonResponse(res, 400, {
          error: 'Invalid UserRequest',
          code: 'VALIDATION_ERROR',
          details: validationErrors,
        });
        return;
      }

      const userRequest = parsed as UserRequest;

      try {
        const result = await runOpportunitySearch(userRequest, {
          provider: activeProvider,
        });
        jsonResponse(res, 200, result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Internal server error';
        jsonResponse(res, 500, {
          error: message,
          code: 'PIPELINE_ERROR',
        });
      }
      return;
    }

    // ── 404 fallback ───────────────────────────────────────────────────────
    jsonResponse(res, 404, {
      error: `Cannot ${method} ${url}`,
      code: 'NOT_FOUND',
    });
  });

  return server;
}

/**
 * Starts the server on the given port (default: 3000).
 * Logs the listening address to stdout.
 */
export function startServer(
  provider?: WebEvidenceProvider,
  port = 3000
): http.Server {
  const server = createServer(provider);
  server.listen(port, () => {
    console.log(`[Opportunity Radar] Server running on http://localhost:${port}`);
    console.log(`[Opportunity Radar] Provider: ${(provider ?? new MockWebEvidenceProvider()).providerName}`);
    console.log(`[Opportunity Radar] Routes:`);
    console.log(`   GET  http://localhost:${port}/api/health`);
    console.log(`   POST http://localhost:${port}/api/search`);
  });
  return server;
}
