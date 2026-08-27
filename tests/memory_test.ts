import { assert, assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { join } from "node:path";
import { openDb } from "../src/db/client.ts";
import {
  archiveMemory,
  countActiveMemories,
  createMemoryAccess,
  eraseCustomerMemories,
  listActiveMemories,
  listAllMemories,
  renderMemoriesForPrompt,
  saveMemory,
  type MemoryRecord,
} from "../src/memory/store.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => void) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_memory_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("memory save/list round-trip, scoped strictly by customer", async () => {
  await withTempDb((db) => {
    saveMemory(db, {
      customerId: "google",
      kind: "fact",
      content: "maintenance window Sunday 02:00",
      provenance: "customer_stated",
      sourceThreadId: "tkt_1",
      now: 1000,
    });
    saveMemory(db, {
      customerId: "facebook",
      kind: "fact",
      content: "uses Docker Compose",
      provenance: "customer_stated",
      now: 2000,
    });

    const google = listActiveMemories(db, "google", 5000);
    assertEquals(google.length, 1);
    assertEquals(google[0].content, "maintenance window Sunday 02:00");
    // Isolation: facebook's listing never contains google's memory.
    assertEquals(
      listActiveMemories(db, "facebook", 5000).map((m) => m.content),
      ["uses Docker Compose"],
    );
  });
});

Deno.test("supersede chains: old entry stops hydrating; cross-customer supersede is impossible", async () => {
  await withTempDb((db) => {
    const original = saveMemory(db, {
      customerId: "google",
      kind: "fact",
      content: "window Sunday 02:00",
      provenance: "customer_stated",
      now: 1000,
    });
    const corrected = saveMemory(db, {
      customerId: "google",
      kind: "fact",
      content: "window moved to Saturday 23:00",
      provenance: "customer_stated",
      supersedes: original.id,
      now: 2000,
    });
    const active = listActiveMemories(db, "google", 3000);
    assertEquals(active.map((m) => m.id), [corrected.id]);
    assertEquals(listAllMemories(db, "google").length, 2);

    const foreign = saveMemory(db, {
      customerId: "facebook",
      kind: "fact",
      content: "x",
      provenance: "customer_stated",
      now: 2500,
    });
    assertThrows(
      () =>
        saveMemory(db, {
          customerId: "google",
          kind: "fact",
          content: "hijack",
          provenance: "customer_stated",
          supersedes: foreign.id,
          now: 3000,
        }),
      Error,
      "Cannot supersede",
    );
  });
});

Deno.test("active cap archives oldest-first; expiry filters; archive is customer-fenced", async () => {
  await withTempDb((db) => {
    for (let i = 0; i < 3; i++) {
      saveMemory(db, {
        customerId: "google",
        kind: "fact",
        content: `fact ${i}`,
        provenance: "customer_stated",
        activeCap: 2,
        now: 1000 + i,
      });
    }
    const active = listActiveMemories(db, "google", 5000);
    assertEquals(active.map((m) => m.content).sort(), ["fact 1", "fact 2"]);

    const expiring = saveMemory(db, {
      customerId: "google",
      kind: "episode",
      content: "old ticket",
      provenance: "ticket_summary",
      sourceThreadId: "tkt_old",
      expiresAt: 6000,
      now: 1500,
    });
    assert(listActiveMemories(db, "google", 5999).some((m) => m.id === expiring.id));
    assert(!listActiveMemories(db, "google", 6001).some((m) => m.id === expiring.id));

    const target = listActiveMemories(db, "google", 5000)[0];
    assertEquals(archiveMemory(db, "facebook", target.id), false); // fenced
    assertEquals(archiveMemory(db, "google", target.id), true);
  });
});

Deno.test("erasure hard-deletes everything for the customer, others untouched", async () => {
  await withTempDb((db) => {
    saveMemory(db, { customerId: "google", kind: "fact", content: "a", provenance: "customer_stated", now: 1 });
    const archived = saveMemory(db, { customerId: "google", kind: "fact", content: "b", provenance: "customer_stated", now: 2 });
    archiveMemory(db, "google", archived.id);
    saveMemory(db, { customerId: "facebook", kind: "fact", content: "keep", provenance: "customer_stated", now: 3 });

    assertEquals(eraseCustomerMemories(db, "google"), 2);
    assertEquals(listAllMemories(db, "google"), []);
    assertEquals(listAllMemories(db, "facebook").length, 1);
  });
});

Deno.test("rendering: facts+playbooks before episodes, claims labeled, budget enforced", () => {
  const mk = (kind: MemoryRecord["kind"], provenance: MemoryRecord["provenance"], content: string, updatedAt: number): MemoryRecord => ({
    id: `mem_${content}`,
    customerId: "google",
    kind,
    content,
    provenance,
    sourceThreadId: kind === "episode" ? "tkt_9" : null,
    createdAt: updatedAt,
    updatedAt,
    expiresAt: null,
    supersededBy: null,
    archivedAt: null,
  });
  const rendered = renderMemoriesForPrompt([
    mk("episode", "ticket_summary", "old ticket about exports", 3000),
    mk("fact", "customer_stated", "maintenance window Sunday", 1000),
    mk("playbook", "human_resolution", "Symptom: webhook timeouts -> Fix: raise batch size", 2000),
  ], 1000);
  const lines = rendered.text.split("\n");
  assertStringIncludes(lines[0], "claimed by customer");
  assertStringIncludes(lines[0], "unverified");
  assertStringIncludes(lines[1], "playbook from human resolution");
  assertStringIncludes(lines[2], "past ticket tkt_9");

  const tight = renderMemoriesForPrompt([
    mk("fact", "customer_stated", "x".repeat(400), 1000),
    mk("fact", "customer_stated", "y".repeat(400), 2000),
  ], 150);
  assertEquals(tight.omitted, 1);
  assertStringIncludes(tight.text, "older memories omitted");
});

Deno.test("memory access: provenance forced to customer_stated, write cap enforced", async () => {
  await withTempDb((db) => {
    const access = createMemoryAccess(db, {
      customerId: "google",
      threadId: "tkt_1",
      hydrationBudgetTokens: 500,
      runWriteCap: 2,
      activeCap: 100,
    });
    const first = access.saveFact("deploys via Terraform");
    assertEquals(first.provenance, "customer_stated");
    assertEquals(first.kind, "fact");
    access.saveFact("window Sunday");
    assertEquals(access.writesRemaining(), 0);
    assertThrows(() => access.saveFact("one too many"), Error, "write cap");
    assertEquals(countActiveMemories(db, "google", Date.now()), 2);

    assertEquals(access.archive(first.id), true);
    assertEquals(access.listActive().length, 1);
  });
});
