import fs from "node:fs";

export function normalizeUnixNewlines(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

export function writeTextFileUnix(filePath: string, content: string): void {
  fs.writeFileSync(filePath, normalizeUnixNewlines(content), "utf8");
}
