import { spawn } from "node:child_process";

export interface WebcmdRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Executes a webcmd CLI command as a child process.
 *
 * The webcmd binary is resolved from PATH.
 * All arguments are passed as-is; no shell injection is possible because
 * spawn() is used without a shell.
 *
 * @param args  Array of CLI arguments (e.g. ["web", "fetch", "--url", "..."])
 * @param timeoutMs  Maximum execution time in milliseconds (default: 15000)
 * @returns Promise resolving to stdout, stderr, and exit code
 */
export async function runWebcmd(
  args: string[],
  timeoutMs = 15_000
): Promise<WebcmdRunResult> {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const binary = isWindows ? "webcmd.cmd" : "webcmd";

    const child = spawn(binary, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        stdout,
        stderr: `${stderr}\n[webcmd-runner] Process killed after ${timeoutMs}ms timeout`,
        exitCode: 124, // Unix timeout exit code
      });
    }, timeoutMs);

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: `${stderr}\n[webcmd-runner] spawn error: ${err.message}`,
        exitCode: 1,
      });
    });
  });
}

/**
 * Parses JSON from webcmd stdout.
 * webcmd -f json output is the raw JSON value (not wrapped).
 * Returns null if parsing fails.
 */
export function parseWebcmdJson<T = unknown>(stdout: string): T | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
