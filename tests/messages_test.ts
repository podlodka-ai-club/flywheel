/**
 * Tests for the database client and messages table access (src/db/client.ts,
 * src/db/messages.ts): schema application with WAL on open and idempotent
 * re-open, ingest round-tripping every field, webhook-redelivery dedup via
 * the external id, thread ordering, scoped thread deletion, and thread-list
 * aggregation.
 */
import { assert, assertEquals } from "@std/assert";
import { join } from "node:path";
import { openDb } from "../src/db/client.ts";
import {
  deleteThread,
  getMessage,
  getThreadMessages,
  insertCustomerMessage,
  insertHumanEscalationResponse,
  listHumanEscalations,
  listThreads,
} from "../src/db/messages.ts";
import { claimNextMessage, completeWithReply } from "../src/db/queue.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>, path: string) => void) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_test_" });
  const path = join(dir, "test.db");
  const db = openDb(path);
  try {
    fn(db, path);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("openDb applies schema, enables WAL, and is idempotent", async () => {
  await withTempDb((db, path) => {
    const mode = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    assertEquals(mode.journal_mode, "wal");

    // Re-opening (schema re-applied) must not throw or wipe data.
    insertCustomerMessage(db, { id: "ext_1", threadId: "tkt_1", content: "hello" });
    const again = openDb(path);
    const count = again.prepare("SELECT COUNT(*) AS n FROM messages").get() as { n: number };
    again.close();
    assertEquals(Number(count.n), 1);
  });
});

Deno.test("insertCustomerMessage + getMessage round-trips all fields", async () => {
  await withTempDb((db) => {
    const { inserted } = insertCustomerMessage(db, {
      id: "ext_42",
      threadId: "tkt_9",
      content: "where is my order?",
      customerId: "cust_7",
      metadata: { channel: "dev-ui" },
      createdAt: 1000,
    });
    assert(inserted);

    const record = getMessage(db, "ext_42");
    assert(record !== null);
    assertEquals(record.threadId, "tkt_9");
    assertEquals(record.customerId, "cust_7");
    assertEquals(record.role, "customer");
    assertEquals(record.status, "pending");
    assertEquals(record.content, "where is my order?");
    assertEquals(record.metadata, { channel: "dev-ui" });
    assertEquals(record.createdAt, 1000);
    assertEquals(record.attemptCount, 0);
    assertEquals(record.inReplyTo, null);
    assertEquals(record.sentToCustomerAt, null);
  });
});

Deno.test("same external id is deduplicated (webhook redelivery)", async () => {
  await withTempDb((db) => {
    const first = insertCustomerMessage(db, { id: "ext_dup", threadId: "tkt_1", content: "original" });
    const second = insertCustomerMessage(db, { id: "ext_dup", threadId: "tkt_1", content: "redelivered copy" });
    assertEquals(first.inserted, true);
    assertEquals(second.inserted, false);

    const messages = getThreadMessages(db, "tkt_1");
    assertEquals(messages.length, 1);
    assertEquals(messages[0].content, "original");
  });
});

Deno.test("getThreadMessages orders by created_at, then id", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "ext_b", threadId: "tkt_1", content: "second", createdAt: 2000 });
    insertCustomerMessage(db, { id: "ext_a", threadId: "tkt_1", content: "first", createdAt: 1000 });
    insertCustomerMessage(db, { id: "ext_other", threadId: "tkt_2", content: "elsewhere", createdAt: 500 });

    const messages = getThreadMessages(db, "tkt_1");
    assertEquals(messages.map((m) => m.content), ["first", "second"]);
  });
});

Deno.test("deleteThread removes only that thread's rows", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "ext_1", threadId: "tkt_gone", content: "one" });
    insertCustomerMessage(db, { id: "ext_2", threadId: "tkt_gone", content: "two" });
    insertCustomerMessage(db, { id: "ext_3", threadId: "tkt_kept", content: "survivor" });

    assertEquals(deleteThread(db, "tkt_gone"), 2);
    assertEquals(deleteThread(db, "tkt_gone"), 0);
    assertEquals(getThreadMessages(db, "tkt_gone"), []);
    assertEquals(listThreads(db).map((t) => t.threadId), ["tkt_kept"]);
  });
});

Deno.test("listThreads aggregates counts and sorts by recency", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "ext_1", threadId: "tkt_old", content: "old thread", createdAt: 1000 });
    insertCustomerMessage(db, { id: "ext_2", threadId: "tkt_new", content: "newer thread", createdAt: 2000 });
    insertCustomerMessage(db, { id: "ext_3", threadId: "tkt_new", content: "latest message", createdAt: 3000 });

    const threads = listThreads(db);
    assertEquals(threads.map((t) => t.threadId), ["tkt_new", "tkt_old"]);
    assertEquals(threads[0].messageCount, 2);
    assertEquals(threads[0].pendingCount, 2);
    assertEquals(threads[0].completedCount, 0);
    assertEquals(threads[0].lastContent, "latest message");
    assertEquals(threads[0].lastActivityAt, 3000);
  });
});

Deno.test("human escalation response is scoped, one-shot, and exposes derived lifecycle state", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, {
      id: "customer_1",
      threadId: "ticket_1",
      customerId: "google",
      content: "I need a refund",
      createdAt: 1000,
    });
    const claimed = claimNextMessage(db, "worker_1", 1100);
    assertEquals(claimed?.id, "customer_1");
    assertEquals(completeWithReply(db, {
      anchorId: "customer_1",
      threadId: "ticket_1",
      workerId: "worker_1",
      now: 1200,
      reply: {
        id: "assistant_escalation",
        content: "A specialist is reviewing this.",
        model: "test",
        tokensIn: null,
        tokensOut: null,
        costUsd: null,
        metadata: {
          escalated: true,
          escalation_reason: "refund action required",
          escalation_request: "Confirm whether the refund was issued",
          escalation_reference: "esc_test123",
        },
      },
    }), "committed");

    assertEquals(listHumanEscalations(db).map((e) => e.state), ["awaiting_human"]);
    const inserted = insertHumanEscalationResponse(db, {
      escalationMessageId: "assistant_escalation",
      content: "Refund issued; settlement takes 3-5 days.",
      externalId: "human_event_1",
      channel: "test",
      responder: "maria",
      createdAt: 1300,
    });
    assertEquals(inserted.outcome, "inserted");
    assert(inserted.response !== null);
    assertEquals(inserted.response.role, "system");
    assertEquals(inserted.response.status, "pending");
    assertEquals(inserted.response.threadId, "ticket_1");
    assertEquals(inserted.response.customerId, "google");
    assertEquals(inserted.response.inReplyTo, "assistant_escalation");
    assertEquals(inserted.response.metadata, {
      type: "human_escalation_response",
      channel: "test",
      escalation_reference: "esc_test123",
      responder: "maria",
    });
    assertEquals(listHumanEscalations(db).map((e) => e.state), ["queued"]);

    const duplicate = insertHumanEscalationResponse(db, {
      escalationMessageId: "assistant_escalation",
      content: "A conflicting second answer",
      externalId: "human_event_2",
    });
    assertEquals(duplicate.outcome, "duplicate");
    assertEquals(duplicate.response?.id, "human_event_1");

    assertEquals(insertHumanEscalationResponse(db, {
      escalationMessageId: "missing",
      content: "answer",
    }).outcome, "not_found");
    assertEquals(insertHumanEscalationResponse(db, {
      escalationMessageId: "customer_1",
      content: "answer",
    }).outcome, "not_escalated");
  });
});
