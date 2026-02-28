# Agent + Human Real-Time Collaboration: Technical Analysis

This document investigates whether an AI agent (interacting via MCP or REST API)
and a human user (editing in the block editor) could co-edit a WordPress post
simultaneously, and what barriers exist in the current Gutenberg architecture.

## Executive Summary

Gutenberg already has a **production-ready real-time collaboration system** built
on CRDTs (Yjs). However, it was designed for **browser-to-browser** collaboration
via the block editor UI. An external agent interacting through the standard REST
API or MCP would operate **outside this collaboration layer**, creating a
two-worlds problem: the CRDT document and the persisted post can diverge, leading
to data loss or duplicate content. True co-editing is possible only if the agent
participates in the CRDT sync protocol.

---

## 1. Current Architecture Overview

### 1.1 The Collaboration Stack

Gutenberg's real-time collaboration is gated behind an admin setting
(`wp_enable_real_time_collaboration`, default: `false`) and is built on these
layers:

| Layer | Package / Location | Role |
|-------|-------------------|------|
| CRDT Engine | `@wordpress/sync` (Yjs) | Conflict-free merge of concurrent edits |
| Entity Sync Config | `packages/core-data/src/utils/crdt.ts` | Maps post fields to CRDT types (Y.Text, Y.Array, Y.Map) |
| Sync Manager | `packages/sync/src/manager.ts` | Orchestrates CRDT doc lifecycle, undo, and provider connections |
| Transport | `packages/sync/src/providers/http-polling/` | HTTP polling provider (POST to `wp-sync/v1/updates`) |
| Server | `lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php` | Stores/distributes CRDT updates, manages awareness and compaction |
| Storage | `lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php` | Persists updates as post meta on `wp_sync_storage` CPT |
| Awareness | `packages/core-data/src/awareness/` | Tracks collaborator presence, cursors, and selections |
| UI | `packages/editor/src/components/collaborators-presence/` | Shows active collaborator avatars and cursors |

### 1.2 How Collaboration Works Between Two Browser Editors

1. **Entity loaded**: `getEntityRecord` in `core-data` fetches the post via REST
   API and loads it into the sync manager, which creates a Yjs `Y.Doc`.
2. **CRDT document initialized**: The persisted CRDT document (stored in
   `_crdt_document` post meta) is deserialized into the `Y.Doc`, or a fresh
   document is created from the post fields.
3. **Local edits**: `editEntityRecord` applies changes to the local `Y.Doc` via
   `applyPostChangesToCRDTDoc()`. Text fields use `Y.Text` with character-level
   deltas; blocks use `Y.Array` with tree-diffing.
4. **Sync transport**: The HTTP polling provider periodically POSTs updates to
   `wp-sync/v1/updates`, sending binary Yjs update payloads and awareness state.
5. **Remote changes**: Incoming updates from other peers are applied to the local
   `Y.Doc`. The sync manager extracts changes via `getPostChangesFromCRDTDoc()`
   and dispatches them as edits to the local store.
6. **Conflict resolution**: Yjs CRDTs guarantee eventual consistency — concurrent
   text insertions are merged deterministically without data loss.
7. **Save**: When a user saves, the post is updated via REST API, the CRDT
   document is persisted in `_crdt_document` meta, and a `SAVED_AT_KEY` timestamp
   is broadcast so other peers can refetch.

### 1.3 The Legacy Post Lock System

Without collaboration enabled, WordPress uses a **single-writer lock** system:

- The Heartbeat API refreshes a per-post lock every ~15 seconds
  (`packages/editor/src/components/post-locked-modal/index.js`).
- If User B opens a post locked by User A, a modal blocks editing entirely.
- User B can "Take over" (stealing the lock) or exit.
- On page unload, the lock is released via `wp-remove-post-lock` AJAX.

**Key detail**: When collaboration is enabled, the lock modal is suppressed
(line 155-157 of `post-locked-modal/index.js`), and multiple editors are allowed.

---

## 2. How an Agent Would Interact Today

### 2.1 Via Standard REST API (No Collaboration)

An agent using the WordPress REST API (`PUT /wp/v2/posts/{id}`) to update a post
operates completely outside the collaboration layer:

```
Agent: PUT /wp/v2/posts/123 { "content": "..." }
```

**What happens:**
- The REST API directly updates `wp_posts` in the database.
- There is **no ETag, If-Match, or version checking** — the last write wins.
- The editor's in-memory state is not notified of the change.
- The CRDT document (`_crdt_document` meta) is not updated.

### 2.2 Via MCP (Model Context Protocol)

MCP does not have a native WordPress integration in Gutenberg today. An MCP
server would likely wrap the REST API, meaning the same limitations apply. The
agent's edits would bypass the CRDT layer entirely.

### 2.3 The Collision Scenario

```
Timeline:
  T0: Human opens post in editor → CRDT doc loaded, sync polling starts
  T1: Human edits paragraph 2 → change applied to Y.Doc, queued for sync
  T2: Agent PUTs new content via REST API → database updated directly
  T3: Human saves → REST API PUT overwrites agent's changes (or vice versa)
  T4: Human reloads → CRDT doc and DB are now inconsistent
```

The fundamental issue: **the REST API save path and the CRDT collaboration path
are parallel, non-intersecting systems.** An agent writing through REST API is
invisible to the collaboration layer.

---

## 3. Barriers and Technical Constraints

### 3.1 No CRDT Participation Path for External Clients

The collaboration system assumes all participants are running the full
`@wordpress/sync` JavaScript stack in a browser. There is no:

- Server-side Yjs integration (the PHP sync server only relays binary updates; it
  does not interpret or produce them)
- REST API endpoint that accepts edits and routes them through the CRDT layer
- Headless/CLI Yjs client for agents

**Impact**: An agent cannot participate in the CRDT document without implementing
a Yjs client, which is a non-trivial JavaScript/TypeScript dependency.

### 3.2 HTTP Polling Transport (Not WebSocket)

The sync transport is HTTP polling (`POST /wp-sync/v1/updates`), not WebSocket.
This has implications:

- **Latency**: Polling intervals are configurable but inherently introduce delay
  (the polling manager increases frequency when collaborators are detected).
- **Agent compatibility**: An agent could theoretically participate in polling, but
  would need to implement the full Yjs sync protocol (sync step 1, sync step 2,
  incremental updates, compaction).
- **No push notifications**: The agent cannot be notified of changes in real-time;
  it must poll.

### 3.3 Awareness Protocol Assumes Browser Context

The awareness system (`packages/core-data/src/awareness/post-editor-awareness.ts`)
tracks:
- Cursor positions as `Y.RelativePosition` objects
- Block selections
- User identity (name, avatar, color)

An agent would need to:
- Maintain an awareness state (even if it doesn't have a visual cursor)
- Update awareness periodically (the server expires clients after 30 seconds of
  inactivity: `AWARENESS_TIMEOUT = 30`)
- Handle awareness from other peers (to understand where the human is editing)

### 3.4 Block Serialization Complexity

The CRDT layer operates on the **block tree** (`Y.Array<YBlock>`), not raw HTML.
An agent editing via REST API sends serialized block HTML (`<!-- wp:paragraph -->
...`), but the CRDT document stores blocks as structured Yjs types with
character-level text tracking.

If an agent sends HTML content via REST API while a human is editing via the CRDT
layer:
- The CRDT document still contains the old block structure
- The database contains the agent's new HTML
- On next load, the system tries to reconcile by diffing serialized CRDT blocks
  against the DB content (`getPostChangesFromCRDTDoc`, crdt.ts lines 316-348),
  which can produce incorrect merges

### 3.5 Autosave Behavior Under Collaboration

When collaboration is enabled, the autosave controller
(`class-gutenberg-rest-autosaves-controller.php`, lines 79-115) changes behavior:

- **Without collaboration**: Draft autosaves from the original author update the
  post directly.
- **With collaboration**: All autosaves create revisions (never update the post
  directly). This prevents the saved post from diverging from the CRDT document.

An agent saving via the standard REST API (not the autosave endpoint) would bypass
this safeguard entirely.

### 3.6 No Conflict Detection at the HTTP Level

The REST API save path has **no optimistic concurrency control**:
- No `ETag` / `If-Match` headers
- No `If-Unmodified-Since` checks
- No HTTP 409 Conflict responses
- No version counter or revision comparison before writes

The only conflict handling exists in the CRDT layer (Yjs merge) and the
client-side edit reducer (three-way merge of persisted edits in
`packages/core-data/src/reducer.js`, lines 210-259).

### 3.7 Store-Level Locking Is Client-Side Only

The hierarchical lock engine (`packages/core-data/src/locks/engine.js`) prevents
concurrent store operations within a single browser tab. It does not extend across
tabs, users, or API clients. An agent's REST API call is not subject to these
locks.

---

## 4. What Would Be Required for True Co-Editing

### 4.1 Option A: Agent as a CRDT Peer (Recommended)

The agent implements a Yjs client and participates in the collaboration protocol:

**Requirements:**
1. **Yjs client library**: Use `yjs` (available as an npm package) to create and
   manage a `Y.Doc`.
2. **Sync protocol**: Implement the HTTP polling protocol against
   `wp-sync/v1/updates` — send sync step 1/2, process incoming updates, send
   incremental updates.
3. **Block-aware edits**: Convert the agent's intended changes into Yjs operations
   on the CRDT document (apply text deltas to `Y.Text`, modify block tree in
   `Y.Array`).
4. **Awareness heartbeat**: Periodically send awareness state to maintain presence
   (even a minimal state with just a user identifier).
5. **Authentication**: Use standard WordPress authentication (cookie + nonce, or
   application password) with `edit_post` capability.

**Advantages:**
- Full conflict resolution via Yjs CRDTs
- Human sees agent's edits appear in real-time
- Agent sees human's edits in real-time
- No data loss or divergence

**Challenges:**
- Requires implementing or wrapping the Yjs library (JavaScript/TypeScript)
- Must understand the block tree structure for non-trivial edits
- Polling latency means edits are not truly instant

### 4.2 Option B: Server-Side CRDT Gateway

Add a new REST API endpoint that accepts plain edits (text or block HTML) and
applies them to the CRDT document server-side:

```
POST /wp/v2/posts/{id}/collaborative-edit
{
  "field": "content",
  "operation": "replace_block",
  "block_index": 2,
  "new_content": "<!-- wp:paragraph --><p>Updated text</p><!-- /wp:paragraph -->"
}
```

**Requirements:**
1. A server-side Yjs implementation (e.g., a PHP Yjs library, or a Node.js
   sidecar service) that can apply updates to the CRDT document.
2. The server broadcasts the resulting Yjs update to all polling peers.
3. The server updates the post in the database.

**Advantages:**
- Agent uses a simple REST API — no Yjs implementation needed client-side
- Server handles CRDT complexity

**Challenges:**
- No mature PHP Yjs implementation exists today
- Would require a significant new server component
- Adds complexity to the sync server

### 4.3 Option C: Optimistic REST API with Notifications (Partial Solution)

Improve the REST API save path with optimistic concurrency and change
notifications:

1. Add `ETag` / `If-Match` support to post endpoints
2. Broadcast a signal through the sync layer when a REST API save occurs
3. Trigger a refetch in the editor when the signal is received

This doesn't achieve true character-level co-editing, but prevents silent
overwrites and keeps the editor aware of external changes.

---

## 5. Summary of Current Constraints

| Constraint | Impact | Severity |
|-----------|--------|----------|
| Agent edits bypass CRDT layer | Edits invisible to human; CRDT/DB divergence | Critical |
| No server-side Yjs | Cannot route REST API edits through CRDT | Critical |
| No HTTP-level conflict detection | Last write wins; silent data loss | High |
| Awareness assumes browser | Agent has no presence indicator | Medium |
| HTTP polling (not WebSocket) | Added latency for real-time feel | Medium |
| Block tree vs. HTML mismatch | Agent sends HTML; CRDT operates on tree | High |
| Autosave behavior differences | Agent saves bypass collaboration safeguards | High |
| Store locks are client-side | No cross-client operation serialization | Medium |

## 6. Conclusion

**Can an agent and a human co-edit a post today?** Not safely. The agent can
read and write posts via the REST API, but those writes are invisible to the
collaboration layer. Concurrent editing will lead to data loss when either party
saves.

**What's the shortest path to enabling it?** Option A (agent as CRDT peer) is the
most viable near-term approach, requiring the agent to implement a Yjs client in
JavaScript/TypeScript and participate in the HTTP polling sync protocol. This
leverages the existing collaboration infrastructure without server-side changes.

**What's the most scalable long-term solution?** Option B (server-side CRDT
gateway) would allow any client — REST API, MCP, CLI, mobile app — to participate
in collaboration without implementing Yjs. This requires significant new server
infrastructure but would make collaboration truly universal.
