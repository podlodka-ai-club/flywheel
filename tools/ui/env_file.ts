/**
 * Minimal .env parser for the dev harness Config view. The file is treated as
 * TEXT for display — nothing here touches the process environment. Covers the
 * common dotenv subset: blank lines, # comment lines, optional `export `,
 * KEY=VALUE with single or double quotes, and ` #` inline comments on
 * unquoted values. Values are returned verbatim (quotes stripped, no escape
 * processing); duplicate keys keep the last occurrence, like dotenv.
 */
export function parseEnvFile(text: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const assignment = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line;
    const eq = assignment.indexOf("=");
    if (eq === -1) continue;
    const key = assignment.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = assignment.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trimEnd();
    }
    entries.set(key, value);
  }
  return entries;
}
