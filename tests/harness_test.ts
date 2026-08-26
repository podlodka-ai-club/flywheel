import { assert, assertEquals, assertRejects } from "@std/assert";
import { createHarness } from "../src/agent/harness.ts";
import type { MessageRecord } from "../src/db/messages.ts";

function msg(id: string, content: string): MessageRecord {
  return {
    id,
    threadId: "t1",
    customerId: "cust_1",
    role: "customer",
    content,
    status: "processing",
    inReplyTo: null,
    workerId: "w1",
    lockedAt: 1000,
    attemptCount: 1,
    error: null,
    model: null,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    metadata: null,
    sentToCustomerAt: null,
    createdAt: 1000,
    completedAt: null,
  };
}

Deno.test("echo consolidates anchor + follow-ups into one reply", async () => {
  const harness = createHarness("echo");
  const reply = await harness.run({
    threadId: "t1",
    customerId: "cust_1",
    message: msg("m1", "first"),
    history: [],
    followUps: [msg("m2", "second"), msg("m3", "third")],
  });
  assertEquals(reply.content, "ECHO: first | second | third");
  assertEquals(reply.model, "echo");
});

Deno.test("fault markers are inert without devFaults", async () => {
  const harness = createHarness("echo");
  const reply = await harness.run({
    threadId: "t1",
    customerId: "cust_1",
    message: msg("m1", "[[fail]] should not throw"),
    history: [],
  });
  assertEquals(reply.content, "ECHO: [[fail]] should not throw");
});

Deno.test("devFaults: [[fail]] throws, [[sleep:ms]] delays", async () => {
  const harness = createHarness("echo", { devFaults: true });

  await assertRejects(
    () => harness.run({ threadId: "t1", customerId: "cust_1", message: msg("m1", "[[fail]] boom"), history: [] }),
    Error,
    "[[fail]] marker",
  );

  const started = Date.now();
  const reply = await harness.run({
    threadId: "t1",
    customerId: "cust_1",
    message: msg("m1", "[[sleep:120]] hello"),
    history: [],
  });
  assert(Date.now() - started >= 100, "sleep marker did not delay the run");
  assertEquals(reply.content, "ECHO: [[sleep:120]] hello");
});

Deno.test("devFaults: [[sleep_once:ms]] delays only the first attempt", async () => {
  const harness = createHarness("echo", { devFaults: true });

  const first = msg("m1", "[[sleep_once:120]] hello");
  let started = Date.now();
  await harness.run({ threadId: "t1", customerId: "cust_1", message: first, history: [] });
  assert(Date.now() - started >= 100, "first attempt should sleep");

  const retry = { ...first, attemptCount: 2 };
  started = Date.now();
  await harness.run({ threadId: "t1", customerId: "cust_1", message: retry, history: [] });
  assert(Date.now() - started < 80, "retry must not sleep");
});
