PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,             -- External ticket ID or conversation identifier
    customer_id TEXT,                    -- Stable customer/account ID from the external platform (B2B tenant of the thread)
    role TEXT NOT NULL,                  -- 'customer' | 'assistant' | 'system'
    content TEXT NOT NULL,               -- The message body
    status TEXT NOT NULL,                -- 'pending' | 'processing' | 'completed' | 'failed'
    in_reply_to TEXT,                    -- Assistant: input anchor; human response: escalated assistant anchor

    -- Worker Locking & Queue Management
    worker_id TEXT,                      -- Unique worker instance ID claiming the message
    locked_at INTEGER,                   -- Lease timestamp for zombie recovery (Unix ms)
    attempt_count INTEGER DEFAULT 0,     -- Retry counter
    error TEXT,                          -- Error details if failed

    -- Telemetry & Delivery
    model TEXT,                          -- LLM model used
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd REAL,
    metadata JSON,                       -- Channel/tags plus escalation/continuation event metadata
    sent_to_customer_at INTEGER,         -- Delivery timestamp stamped by external dispatcher (on failed customer rows: failure-acknowledged timestamp)

    created_at INTEGER NOT NULL,         -- Unix timestamp (ms)
    completed_at INTEGER                 -- Unix timestamp (ms)
);

-- Index for instant queue polling
CREATE INDEX IF NOT EXISTS idx_messages_queue
ON messages(status, created_at ASC)
WHERE status = 'pending';

-- Index for fast thread history retrieval
CREATE INDEX IF NOT EXISTS idx_messages_thread_history
ON messages(thread_id, created_at ASC);

-- Index for external outbound dispatcher polling
CREATE INDEX IF NOT EXISTS idx_messages_outbound
ON messages(sent_to_customer_at)
WHERE role = 'assistant' AND status = 'completed' AND sent_to_customer_at IS NULL;

-- Duplicate-reply backstop: at most one assistant reply per anchor customer message
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_reply_once
ON messages(in_reply_to)
WHERE role = 'assistant';

-- Human hand-back is one-shot per escalation. A colleague can start another
-- round by letting the resumed agent escalate again, producing a new anchor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_human_escalation_response_once
ON messages(in_reply_to)
WHERE role = 'system'
  AND json_extract(metadata, '$.type') = 'human_escalation_response';

-- Index for external platform to detect permanently failed messages
CREATE INDEX IF NOT EXISTS idx_messages_failed
ON messages(created_at)
WHERE status = 'failed' AND sent_to_customer_at IS NULL;

-- Per-customer queries: audit today, memory scoping in future phases
CREATE INDEX IF NOT EXISTS idx_messages_customer
ON messages(customer_id, created_at ASC);

-- Per-customer memory (spec §10). Hard-isolated by customer_id; provenance is
-- mandatory and system-assigned; superseded/archived rows never hydrate.
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,                 -- mem_<uuid>
    customer_id TEXT NOT NULL,           -- hard isolation key
    kind TEXT NOT NULL,                  -- 'fact' | 'episode' | 'playbook'
    content TEXT NOT NULL,               -- one concise fact / summary / symptom→fix
    provenance TEXT NOT NULL,            -- 'customer_stated' | 'agent_inferred' | 'ticket_summary' | 'human_resolution'
    source_thread_id TEXT,               -- ticket that produced it
    created_at INTEGER NOT NULL,         -- Unix ms
    updated_at INTEGER NOT NULL,         -- Unix ms
    expires_at INTEGER,                  -- optional decay (episodes by default)
    superseded_by TEXT,                  -- correction chain; superseded rows never hydrate
    archived_at INTEGER                  -- soft-forget (audit-preserving)
);

CREATE INDEX IF NOT EXISTS idx_memories_active
ON memories(customer_id, kind, updated_at DESC)
WHERE archived_at IS NULL AND superseded_by IS NULL;

-- One episode summary per ticket (summarizer idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_episode_once
ON memories(source_thread_id)
WHERE kind = 'episode';
