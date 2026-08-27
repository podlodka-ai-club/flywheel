/**
 * Tests for the logger (src/logger/index.ts): the file sink writes
 * spec-shaped single-line JSON entries, rotates by size into numbered
 * backups, and detaches cleanly on teardown while console logging keeps
 * working.
 */
import { assert, assertEquals } from "@std/assert";
import { join } from "node:path";
import { configureLogging, logger, teardownLogging } from "../src/logger/index.ts";

Deno.test("file sink writes spec-shaped JSON lines and rotates by size", async () => {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_logger_test_" });
  try {
    const logFile = configureLogging({
      name: "test",
      dir,
      maxBytes: 256,
      backupCount: 2,
      level: "debug",
    });
    assertEquals(logFile, join(dir, "test.log"));

    logger.info("test_event", { threadId: "t1", value: 42 });
    const firstLine = (await Deno.readTextFile(logFile)).trim().split("\n")[0];
    const parsed = JSON.parse(firstLine);
    assertEquals(parsed.level, "info");
    assertEquals(parsed.event, "test_event");
    assertEquals(parsed.threadId, "t1");
    assertEquals(parsed.value, 42);
    assert(typeof parsed.timestamp === "string" && parsed.timestamp.endsWith("Z"));

    // Overflow maxBytes several times over → numbered backup appears.
    for (let i = 0; i < 20; i++) {
      logger.warn("filler_event", { i, padding: "x".repeat(64) });
    }
    const backup = await Deno.stat(join(dir, "test.log.1")).catch(() => null);
    assert(backup !== null, "expected rotation to create test.log.1");
  } finally {
    teardownLogging();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("teardown detaches the file sink; console-only logging still works", async () => {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_logger_test_" });
  try {
    const logFile = configureLogging({ name: "gone", dir, level: "debug" });
    logger.info("before_teardown");
    teardownLogging();
    logger.info("after_teardown"); // must not throw, must not write to file
    const content = await Deno.readTextFile(logFile);
    assert(content.includes("before_teardown"));
    assert(!content.includes("after_teardown"));
  } finally {
    teardownLogging();
    await Deno.remove(dir, { recursive: true });
  }
});
