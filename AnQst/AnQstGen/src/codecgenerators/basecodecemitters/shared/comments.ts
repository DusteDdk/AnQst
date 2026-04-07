export function emitStrategyComment(title: string, bullets: string[]): string {
  const lines = [
    "/**",
    ` * ${title}`,
    " *",
    ...bullets.map((bullet) => ` * - ${bullet}`),
    " */"
  ];
  return lines.join("\n");
}
