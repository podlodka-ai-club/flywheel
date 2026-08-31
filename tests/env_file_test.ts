/**
 * Tests for the dev-harness .env parser (tools/ui/env_file.ts): the common
 * dotenv subset — comments, `export ` prefixes, quoting, inline comments,
 * duplicate keys, invalid keys, CRLF endings, and empty input.
 */
import { assertEquals } from "@std/assert";
import { parseEnvFile } from "../tools/ui/env_file.ts";

Deno.test("parseEnvFile handles the common dotenv subset", () => {
  const text = [
    "# full-line comment",
    "",
    "PLAIN=value",
    "  SPACED  =  padded  ",
    "export EXPORTED=yes",
    'DQ="quoted value"',
    "SQ='single # not a comment'",
    "INLINE=value # trailing comment",
    "HASHVAL=abc#kept",
    "EMPTY=",
    "DUP=first",
    "DUP=last",
    "1BAD=skipped",
    "not-a-key=skipped",
    "no_equals_line",
  ].join("\n");

  const entries = parseEnvFile(text);
  assertEquals(entries.get("PLAIN"), "value");
  assertEquals(entries.get("SPACED"), "padded");
  assertEquals(entries.get("EXPORTED"), "yes");
  assertEquals(entries.get("DQ"), "quoted value");
  assertEquals(entries.get("SQ"), "single # not a comment");
  assertEquals(entries.get("INLINE"), "value");
  assertEquals(entries.get("HASHVAL"), "abc#kept");
  assertEquals(entries.get("EMPTY"), "");
  assertEquals(entries.get("DUP"), "last");
  assertEquals(entries.has("1BAD"), false);
  assertEquals(entries.size, 9);
});

Deno.test("parseEnvFile handles CRLF and an empty file", () => {
  assertEquals(parseEnvFile("A=1\r\nB=2\r\n").get("B"), "2");
  assertEquals(parseEnvFile("").size, 0);
});
