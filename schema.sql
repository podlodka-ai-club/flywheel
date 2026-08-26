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
    in_reply_to TEXT,                    -- Assistant rows: id of the anchor customer message this reply answers

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
    metadata JSON,                       -- Customer ID, channel, custom tags; assistant rows may carry {escalated, escalation_reason}
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

-- Index for external platform to detect permanently failed messages
CREATE INDEX IF NOT EXISTS idx_messages_failed
ON messages(created_at)
WHERE status = 'failed' AND sent_to_customer_at IS NULL;

-- Per-customer queries: audit today, memory scoping in future phases
CREATE INDEX IF NOT EXISTS idx_messages_customer
ON messages(customer_id, created_at ASC);
