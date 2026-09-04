import { homedir } from "node:os";
import { sep } from "node:path";

export function sanitizeError(error: unknown): string {
  if (error instanceof Error && error.stack) {
    const raw = error.stack.includes(error.message)
      ? error.stack
      : `${error.message}\nStack: ${error.stack}`;

    return sanitizeString(raw).slice(0, 2000);
  }

  return sanitizeString(error instanceof Error ? error.message : String(error)).slice(0, 1000);
}

function sanitizeString(value: string): string {
  return value
    .replaceAll(sep, "/")
    .replace(toPathRegExp(process.cwd()), "<process-cwd>")
    .replace(toPathRegExp(homedir()), "<homedir>");
}

function toPathRegExp(path: string): RegExp {
  const normalized = path.replaceAll(sep, "/");
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(escaped, "gi");
}
