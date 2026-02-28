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

---

## 7. Deep Dive: Option A + Block Markup Skill — Would It Work?

This section evaluates whether an agent that (a) participates as a Yjs CRDT peer
and (b) has a comprehensive skill for reading and writing block markup could
effectively co-edit a post alongside a human in the block editor.

### 7.1 The Two Layers the Agent Must Operate On

The CRDT document does **not** store block HTML. It stores a structured tree:

```
Y.Doc
 └─ Y.Map ("record")
     ├─ title: Y.Text           ← character-level CRDT
     ├─ excerpt: Y.Text         ← character-level CRDT
     ├─ content: Y.Text         ← serialized HTML (used for persistence)
     ├─ blocks: Y.Array<YBlock> ← the live collaboration target
     │   ├─ YBlock (Y.Map)
     │   │   ├─ name: "core/paragraph"
     │   │   ├─ clientId: "uuid"
     │   │   ├─ attributes: Y.Map
     │   │   │   ├─ content: Y.Text("Hello world")  ← rich-text = Y.Text
     │   │   │   └─ dropCap: false                   ← non-rich-text = raw value
     │   │   └─ innerBlocks: Y.Array<YBlock>
     │   └─ YBlock (Y.Map)
     │       ├─ name: "core/image"
     │       ├─ attributes: Y.Map
     │       │   ├─ url: "https://..."               ← raw value
     │       │   ├─ alt: "description"                ← raw value
     │       │   └─ caption: Y.Text("Photo credit")  ← rich-text = Y.Text
     │       └─ innerBlocks: Y.Array<>
     └─ meta: Y.Map
         └─ ... post meta fields
```

The agent must understand this distinction: **rich-text attributes** (those
declared as `"type": "rich-text"` in `block.json`) are stored as `Y.Text` and
get character-level CRDT merging. All other attributes are stored as plain values
and are replaced wholesale on change.

### 7.2 What Works Well

**Text editing in separate blocks — low conflict risk.**
If the human is editing paragraph 3 and the agent is editing paragraph 7, the
edits are on different `YBlock` entries in the `Y.Array`. The diff algorithm in
`mergeCrdtBlocks()` (crdt-blocks.ts:193-383) uses left/right skipping to avoid
touching unchanged blocks. These edits compose cleanly with zero conflict.

**Structural operations — adding, removing, reordering blocks.**
The agent can insert new `YBlock` entries into the `Y.Array` or delete existing
ones. The Yjs array CRDT handles concurrent insertions at different positions
deterministically. For example, if the human adds a block at position 2 and the
agent adds one at position 5 simultaneously, both insertions are preserved in a
consistent order across peers.

**Non-rich-text attribute changes.**
Attributes like `url`, `alt`, `level` (heading), `dropCap`, `align`, etc. are
plain values in the `Y.Map`. The agent can set these directly. If the human and
agent modify different attributes on the same block, both changes are preserved.
If they modify the same attribute, last-writer-wins at the Yjs map level (but
this is a rare scenario for agent + human collaboration).

**Title and excerpt editing.**
These are top-level `Y.Text` fields on the post record. The agent can apply
character-level deltas, and concurrent edits merge via CRDT just like paragraph
content.

### 7.3 Where It Gets Nuanced

**Concurrent edits to the same rich-text attribute (e.g., same paragraph).**

This is the hardest case. The Gutenberg CRDT system works as follows
(crdt-blocks.ts:542-574):

1. The editor receives the **full string value** of a rich-text attribute on each
   keystroke — not a granular delta.
2. `mergeRichTextUpdate()` computes a character-level diff between the old Y.Text
   value and the new string using a Quill Delta algorithm with cursor-aware
   disambiguation (`diffWithCursor()`).
3. The resulting delta is applied to the Y.Text, which Yjs merges with any
   concurrent remote deltas.

An agent would follow the same pattern: read the current Y.Text value, compute
the desired new value, diff them, apply the delta. This works correctly as long
as:

- The agent reads the **current** Y.Text value (not a stale cached copy).
- The agent applies its change as a delta (not a wholesale replacement of the
  Y.Text).
- The agent provides a cursor position for `diffWithCursor()` to disambiguate
  (or uses `null`, which disables cursor-aware shifting — acceptable for
  programmatic edits that aren't driven by a visible cursor).

**The risk scenario**: the human is typing in the middle of a paragraph while the
agent simultaneously rewrites the entire paragraph. The Yjs CRDT will merge both
sets of character operations, but the result may be semantically nonsensical —
the human's mid-paragraph keystrokes interleaved with the agent's replacement
text. This is the same problem two humans would face, but an agent is more likely
to produce large wholesale text replacements.

**Mitigation**: The agent should prefer **surgical edits** (change specific
sentences or phrases) over whole-block replacements. Smaller deltas merge more
predictably.

**Rich-text formatting (bold, italic, links) in the CRDT.**

The current Y.Text implementation in Gutenberg stores **plain text only** — it
does not store inline formatting marks. Rich-text formatting is part of the
block's `originalContent` HTML and is re-parsed on load. The `Y.Text` for a
paragraph's `content` attribute contains the raw text string (e.g.,
`"This is bold and italic."`) without formatting metadata.

This means:
- The agent can safely edit the text content of rich-text attributes.
- Inline formatting (bold, italic, links) is **not** tracked at the CRDT level.
  It is reconstructed from the serialized HTML when the post is saved and
  reloaded.
- If the agent wants to add or change formatting, it would need to modify the
  `originalContent` field or work at the serialized HTML level, which is a
  less-collaborative path.

**Block validation.**

When blocks are parsed, Gutenberg validates them by re-running the block's
`save()` function and comparing the output to the `originalContent`. If they
diverge, the block is marked `isValid: false` and may show a "This block contains
unexpected content" warning. An agent that constructs block attributes
incorrectly could trigger validation failures.

This is where a **comprehensive block markup skill** becomes essential: the agent
must produce attribute values that, when run through the block's `save()`
function, generate valid HTML matching what the block type expects.

### 7.4 The Block Markup Skill Requirements

For the agent to be an effective CRDT peer, its block markup skill must cover:

| Capability | Why It's Needed |
|-----------|----------------|
| Parse `<!-- wp:name {...} -->` delimiters | Read current post content from REST API or CRDT |
| Understand block.json attribute schemas | Know which attributes are `rich-text` vs `string` vs `boolean` etc. |
| Produce valid attribute combinations | Avoid block validation failures |
| Map between HTML and block tree | Translate "add a heading before paragraph 3" into Y.Array operations |
| Handle nested blocks (innerBlocks) | Groups, columns, cover blocks, etc. require tree manipulation |
| Understand rich-text as plain text in CRDT | Know that `content: Y.Text` stores raw text, not HTML |
| Construct surgical text deltas | Prefer "insert 'very ' at position 10" over "replace entire paragraph" |

### 7.5 Agent Interaction Model

Given the architecture, the most effective co-editing model would be:

```
Agent reads current Y.Doc state (via polling)
  ↓
Agent identifies which blocks to modify
  ↓
Agent applies targeted operations:
  • Text edits → Y.Text delta operations on rich-text attributes
  • Attribute changes → Y.Map.set() on block attributes
  • Structural changes → Y.Array insert/delete on blocks array
  ↓
Yjs generates update → queued for next poll cycle
  ↓
Human's editor receives update → blocks update in real-time
```

The agent should **avoid**:
- Replacing the entire `blocks` Y.Array (destroys CRDT history, loses concurrent
  edits)
- Writing to the `content` Y.Text directly (this is the serialized HTML field,
  not the live editing target — the `blocks` Y.Array is authoritative during
  editing)
- Making large batched changes without yielding (let poll cycles interleave so
  the human sees incremental progress)

### 7.6 Feasibility Assessment

| Scenario | Feasibility | Notes |
|----------|------------|-------|
| Agent adds/removes blocks while human edits text | High | Different Y.Array positions, clean merge |
| Agent edits paragraph A while human edits paragraph B | High | Independent YBlocks, no conflict |
| Agent edits same paragraph as human (small change) | Medium | Delta merge works, but semantic coherence depends on edit size |
| Agent rewrites entire paragraph while human types in it | Low | CRDT merges characters but result may be nonsensical |
| Agent changes block attributes (alignment, image URL) | High | Y.Map set, non-overlapping with text edits |
| Agent restructures nested blocks (columns, groups) | Medium | innerBlocks recursion works, but human may be confused by layout shifts |
| Agent adds inline formatting (bold, links) | Low | Formatting not tracked in Y.Text; requires working at HTML/originalContent level |

### 7.7 Conclusion: Would It Work?

**Yes, with caveats.** An agent participating as a Yjs CRDT peer with a
comprehensive block markup skill can effectively co-edit a post alongside a
human user. The system works best when:

1. **The agent and human work on different blocks** — the most common and most
   reliable scenario. Agent adds a new section at the end while human refines
   the introduction. Zero conflict risk.

2. **The agent makes surgical, targeted edits** — replacing a specific word,
   fixing a typo, updating a URL. Small deltas merge cleanly with concurrent
   human edits via the Yjs CRDT.

3. **The agent avoids wholesale replacements of content the human is actively
   editing** — rewriting an entire paragraph while the human is typing in it
   will produce CRDT-merged but potentially semantically incoherent results.

The primary technical investment is implementing the Yjs sync client (the polling
protocol is straightforward HTTP) and building the block-aware edit layer that
translates high-level instructions ("make the heading an H3", "add a paragraph
after the image") into targeted Y.Doc operations. The block markup skill doesn't
need to produce HTML — it needs to produce **Yjs operations on the block tree**.

The polling latency (250ms with collaborators) is acceptable for an agent
workflow. The human would see the agent's changes appear in near-real-time, and
the agent would see the human's changes with the same delay — comparable to the
experience of two humans collaborating today.

---

## 8. Plugin vs. Core: Implementation Options

This section evaluates whether an agent CRDT peer can be implemented as a
standalone WordPress plugin, or whether it would require changes to Gutenberg
core or WordPress core.

### 8.1 What the Plugin Gets for Free

The existing collaboration infrastructure provides several key extension points
that a plugin can leverage without any core changes:

**Yjs library access (`wp.sync.Y`).**
The `@wordpress/sync` package has `"wpScript": true` in its `package.json`,
meaning it is registered as a WordPress script and exposed as `wp.sync` on the
global scope. A plugin can declare `wp-sync` as a script dependency and access
`wp.sync.Y` (the full Yjs library) and `wp.sync.Awareness` directly. This is
explicitly documented in `packages/sync/README.md` and `packages/sync/src/index.ts`
as the required way for external code to consume Yjs — sharing a single Yjs
instance avoids a known singleton conflict (yjs/yjs#438).

**The `sync.providers` filter hook.**
This is the most important finding. In `packages/sync/src/providers/index.ts`
(line 52), the list of provider creators is passed through a WordPress
`applyFilters('sync.providers', ...)` hook before being used:

```javascript
const filteredProviderCreators = applyFilters(
    'sync.providers',
    getDefaultProviderCreators()
);
```

This means **a plugin can add, replace, or augment sync providers** by hooking
into `sync.providers`. A plugin could add a custom provider that bridges to an
agent's Yjs client, or replace the default HTTP polling provider entirely.

**REST API endpoint (`wp-sync/v1/updates`).**
The sync server registers a REST endpoint at `POST /wp-sync/v1/updates`. This
endpoint uses standard WordPress REST API permission callbacks (`edit_post`
capability). Any authenticated client — including a headless Node.js agent using
application passwords — can POST to this endpoint. No special plugin registration
is required to participate in a sync room.

**Collaboration admin setting.**
The `wp_enable_real_time_collaboration` option is a standard WordPress setting
registered via `register_setting()`. A plugin can programmatically enable it with
`update_option('wp_enable_real_time_collaboration', true)`, or it can be toggled
by an admin in Settings > Writing. The setting gates everything: it sets
`window._wpCollaborationEnabled = true` (which enables the JS-side CRDT system)
and enables the sync REST routes.

**Awareness protocol.**
`Awareness` from `y-protocols/awareness` is exported publicly from
`@wordpress/sync`. A plugin or agent can create and manage awareness instances
for presence tracking.

### 8.2 Two Plugin Architectures

#### Architecture A: Headless Agent (Node.js sidecar — no core changes)

The agent runs as a **standalone Node.js process** outside WordPress, connecting
to the sync server via HTTP:

```
┌─────────────────────────┐     ┌──────────────────────┐
│  Human (Block Editor)   │     │  Agent (Node.js)     │
│                         │     │                       │
│  Y.Doc ←→ HTTP Polling  │     │  Y.Doc ←→ HTTP POST  │
│       Provider          │     │    to wp-sync/v1      │
└────────────┬────────────┘     └──────────┬───────────┘
             │                             │
             ▼                             ▼
      ┌──────────────────────────────────────────┐
      │  WordPress (wp-sync/v1/updates endpoint) │
      │  WP_HTTP_Polling_Sync_Server             │
      │  WP_Sync_Post_Meta_Storage               │
      └──────────────────────────────────────────┘
```

**What this needs:**
- A Node.js application using the `yjs` npm package
- HTTP client that authenticates via application passwords (HTTP Basic Auth)
- Implementation of the polling protocol (POST to `wp-sync/v1/updates` with
  room, client_id, after cursor, updates, awareness)
- Knowledge of the block tree data structure for constructing Y.Doc operations

**What this does NOT need:**
- Any WordPress plugin code
- Any Gutenberg core changes
- The block editor running (the agent is a pure protocol peer)

**Trade-off:** The agent must bundle its own Yjs instance. Since it runs in a
separate process, the Yjs singleton constraint doesn't apply — there's no shared
JS runtime with the editor.

#### Architecture B: WordPress Plugin (in-browser bridge — no core changes)

A WordPress plugin that acts as a bridge between an external agent and the
collaboration system, running inside the block editor's browser context:

```
┌─────────────────────────────────────────────────┐
│  Block Editor (browser)                          │
│                                                   │
│  ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Human Editor  │   │ Agent Bridge Plugin      │ │
│  │ (core-data)   │   │ - Receives instructions  │ │
│  │               │   │   from external agent     │ │
│  │  Y.Doc ←────────→ │ - Applies Y.Doc ops      │ │
│  │               │   │ - Uses wp.sync.Y          │ │
│  └──────────────┘   └──────────────────────────┘ │
│           ↕                      ↕                │
│     HTTP Polling Provider (shared)                │
└───────────────────────┬──────────────────────────┘
                        ▼
              WordPress sync server
```

**What this needs:**
- A WordPress plugin that enqueues a JS script with `wp-sync` as a dependency
- The script hooks into `sync.providers` to access the shared Y.Doc
- An external communication channel (WebSocket, long-poll, or REST endpoint
  provided by the plugin) for the agent to send instructions
- The plugin translates agent instructions into Y.Doc operations

**Advantage:** Shares the same Yjs instance and Y.Doc as the human editor — no
separate polling needed, edits are instant.

**Trade-off:** Requires the block editor to be open in a browser tab. The agent
can't edit without a human having the editor open.

### 8.3 What Requires Core Changes (and What Doesn't)

| Requirement | Plugin possible? | Notes |
|------------|-----------------|-------|
| Participate in sync protocol via HTTP | Yes | `wp-sync/v1/updates` is a standard REST endpoint |
| Access Yjs library | Yes | Exported as `wp.sync.Y` |
| Add/replace sync providers | Yes | `sync.providers` filter hook |
| Enable collaboration setting | Yes | `update_option()` call |
| Authenticate headless agent | Yes | Application passwords (since WP 5.6) |
| Access Gutenberg's sync manager instance | No (private API) | Locked behind `__dangerousOptInToUnstableAPIsOnlyForCoreModules` |
| Modify how blocks map to CRDT types | No (private API) | `crdt.ts`, `crdt-blocks.ts` are internal |
| Add agent presence to collaborators UI | Partially | Awareness protocol is public, but presence UI is hardcoded |
| Server-side CRDT gateway (Option B from section 4) | No | Would require PHP Yjs implementation in core |

### 8.4 The WordPress 7.0 Question

All the collaboration code lives in `lib/compat/wordpress-7.0/`, indicating it
targets **WordPress 7.0** for core merge. Today it only exists in the Gutenberg
plugin. This means:

- **Today**: The agent plugin requires the **Gutenberg plugin** to be active
  (for the sync server, CRDT post meta, and `@wordpress/sync` script).
- **After WordPress 7.0**: The sync infrastructure will be in WordPress core,
  and the agent plugin will work with a vanilla WordPress installation.

Either way, no changes to Gutenberg or WordPress core are needed for the agent
plugin itself.

### 8.5 Conclusion

**A standalone plugin is entirely viable.** The cleanest architecture is a
**headless Node.js agent** (Architecture A) that participates in the sync
protocol via HTTP. It requires:

1. Zero changes to Gutenberg core or WordPress core
2. The Gutenberg plugin active (or WordPress 7.0+) with collaboration enabled
3. A WordPress user account with `edit_post` capability and an application
   password
4. A Node.js process running the `yjs` npm package with HTTP polling to
   `wp-sync/v1/updates`

The existing `sync.providers` filter hook and the open REST endpoint make this a
first-class extension pattern — it's exactly how the system was designed to be
extended.
