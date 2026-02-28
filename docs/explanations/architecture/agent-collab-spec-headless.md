# Spec: Headless Agent CRDT Peer (Architecture A)

A standalone Node.js agent that participates in Gutenberg's real-time
collaboration protocol as a first-class Yjs CRDT peer, enabling an AI agent to
co-edit WordPress posts alongside a human user in the block editor.

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Protocol Specification](#4-protocol-specification)
5. [Block Tree Operations](#5-block-tree-operations)
6. [Implementation Guide](#6-implementation-guide)
7. [Error Handling](#7-error-handling)
8. [Testing Strategy](#8-testing-strategy)
9. [Architectural Decisions](#9-architectural-decisions)

---

## 1. Overview

### Goal

Build a Node.js library (`wp-agent-collab`) that allows an AI agent to:

- Connect to a WordPress site's collaboration endpoint as a Yjs peer
- Read the current state of a post (title, blocks, excerpt, meta)
- Apply targeted edits (insert text, add/remove blocks, change attributes)
- See the human's edits arrive in near-real-time
- Have its edits appear in the human's block editor in near-real-time
- Disconnect cleanly without data loss

### Non-Goals

- Replacing the block editor UI
- Implementing a full WordPress client (post creation, media upload, etc.)
- WebSocket transport (HTTP polling only, matching the existing protocol)
- Server-side changes to Gutenberg or WordPress

### Key Constraint

The agent operates on the **Yjs CRDT document**, not on serialized HTML. It must
understand the block tree data structure and produce Yjs operations, not block
markup.

---

## 2. Architecture

```
┌──────────────────────────────────────────┐
│              AI Agent Process            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        wp-agent-collab library     │  │
│  │                                    │  │
│  │  ┌──────────┐   ┌──────────────┐  │  │
│  │  │ Y.Doc    │   │ BlockTree    │  │  │
│  │  │ (yjs)    │   │ Abstraction  │  │  │
│  │  └────┬─────┘   └──────┬───────┘  │  │
│  │       │                │          │  │
│  │  ┌────▼────────────────▼───────┐  │  │
│  │  │    SyncClient               │  │  │
│  │  │  - HTTP polling             │  │  │
│  │  │  - Yjs sync protocol        │  │  │
│  │  │  - Awareness heartbeat      │  │  │
│  │  │  - Auth (app passwords)     │  │  │
│  │  └────────────┬────────────────┘  │  │
│  └───────────────│────────────────────┘  │
└──────────────────│───────────────────────┘
                   │ HTTPS POST
                   ▼
    ┌──────────────────────────────────┐
    │  WordPress + Gutenberg Plugin   │
    │  POST /wp-sync/v1/updates       │
    │  WP_HTTP_Polling_Sync_Server    │
    └──────────────────────────────────┘
```

### Components

| Component | Responsibility |
|-----------|---------------|
| `SyncClient` | HTTP polling loop, Yjs sync protocol, authentication, connection lifecycle |
| `Y.Doc` | The Yjs CRDT document — source of truth for the post during editing |
| `BlockTree` | High-level API for reading/writing blocks without raw Yjs operations |
| `Awareness` | Presence heartbeat so the human sees the agent as a collaborator |

---

## 3. Prerequisites

### WordPress Site

- WordPress with the Gutenberg plugin active (or WordPress 7.0+)
- Real-time collaboration enabled:
  `wp_option: wp_enable_real_time_collaboration = true`
- A user account with `edit_post` capability for the target post
- An application password generated for that user (Settings > Security >
  Application Passwords)

### Node.js Environment

```json
{
  "dependencies": {
    "yjs": "^13.6.0",
    "y-protocols": "^1.0.0",
    "lib0": "^0.2.90"
  }
}
```

The `yjs` version must be compatible with Gutenberg's bundled version. Check
`wp.sync.YJS_VERSION` (currently `'13'`) to confirm major version compatibility.
The agent runs in a separate process, so the Yjs singleton constraint
(yjs/yjs#438) does not apply.

---

## 4. Protocol Specification

### 4.1 Endpoint

```
POST {site_url}/wp-json/wp-sync/v1/updates
```

Authentication: HTTP Basic Auth with application password.

```
Authorization: Basic base64(username:application_password)
```

Content-Type: `application/json`

### 4.2 Request Schema

```typescript
interface SyncPayload {
  rooms: SyncEnvelopeFromClient[];
}

interface SyncEnvelopeFromClient {
  room: string;           // "postType/post:123"
  client_id: number;      // doc.clientID (Yjs-assigned, 53-bit integer)
  after: number;          // Cursor from previous response (0 on first request)
  awareness: object|null; // Local awareness state, or null to disconnect
  updates: SyncUpdate[];  // Yjs updates to send
}

interface SyncUpdate {
  type: "sync_step1" | "sync_step2" | "update" | "compaction";
  data: string;           // Base64-encoded Uint8Array
}
```

### 4.3 Response Schema

```typescript
interface SyncResponse {
  rooms: SyncEnvelopeFromServer[];
}

interface SyncEnvelopeFromServer {
  room: string;
  end_cursor: number;        // Use as `after` in next request
  awareness: Record<string, object|null>;  // clientId → state
  updates: SyncUpdate[];     // Updates from other peers
  should_compact?: boolean;  // Server requests compaction
}
```

### 4.4 Room Naming

Rooms follow the pattern `{entity_kind}/{entity_name}:{object_id}`.

For a post with ID 123: `postType/post:123`
For a page with ID 456: `postType/page:456`

### 4.5 Sync Protocol Flow

#### Initial Connection

```
Agent                          Server
  │                              │
  │  POST (sync_step1)           │
  │  ──────────────────────────► │
  │                              │
  │  Response (sync_step2 +      │
  │  awareness)                  │
  │  ◄────────────────────────── │
  │                              │
  │  [Agent now has full Y.Doc]  │
  │                              │
```

**Step 1**: Agent creates a sync_step1 update containing its state vector:

```typescript
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';

const encoder = encoding.createEncoder();
syncProtocol.writeSyncStep1(encoder, doc);
const step1Data = encoding.toUint8Array(encoder);
// Base64-encode and send as { type: "sync_step1", data: base64(step1Data) }
```

**Step 2**: Server responds with sync_step2 containing missing updates. Agent
applies them:

```typescript
import * as decoding from 'lib0/decoding';

const data = base64ToUint8Array(update.data);
const decoder = decoding.createDecoder(data);
const encoder = encoding.createEncoder();
syncProtocol.readSyncMessage(decoder, encoder, doc, 'sync-client');
// If encoder has content, queue it as a sync_step2 response
```

#### Steady-State Polling

```
Agent                          Server
  │                              │
  │  POST (incremental updates,  │
  │  awareness heartbeat)        │
  │  ──────────────────────────► │
  │                              │
  │  Response (remote updates,   │
  │  awareness state)            │
  │  ◄────────────────────────── │
  │                              │
  │  [250ms pause]               │
  │                              │
  │  POST (next cycle)           │
  │  ──────────────────────────► │
  │                              │
```

#### Compaction

When `should_compact === true` in the response, the agent encodes its full
document state and sends it back:

```typescript
const fullState = Y.encodeStateAsUpdate(doc);
// Send as { type: "compaction", data: base64(fullState) }
// Clear any pending updates in the queue (compaction replaces them)
```

#### Disconnect

Send a final request with `awareness: null`:

```typescript
await post({
  rooms: [{
    room: "postType/post:123",
    client_id: doc.clientID,
    after: 0,
    awareness: null,
    updates: []
  }]
});
```

### 4.6 Polling Intervals

| Condition | Interval |
|-----------|----------|
| Solo (no other collaborators in awareness) | 1000ms |
| With collaborators (2+ in awareness) | 250ms |
| After HTTP error | Exponential backoff: interval × 2, max 30000ms |
| After success following error | Reset to base interval |

### 4.7 Update Queue Behavior

The queue starts **paused**. Updates are buffered but not sent until a
collaborator is detected in the awareness response. Once `awareness` contains
more than one client ID, the queue resumes and buffered updates are sent.

On HTTP failure, sent updates are **restored to the front** of the queue for
retry (except compaction updates, which are discarded on failure).

---

## 5. Block Tree Operations

### 5.1 Y.Doc Structure

The CRDT document for a post has this structure:

```
Y.Doc
 └─ Y.Map ("record")                    ← getRootMap(doc, "record")
     ├─ title: Y.Text                   ← character-level CRDT
     ├─ excerpt: Y.Text                 ← character-level CRDT
     ├─ content: Y.Text                 ← serialized HTML (read-only during editing)
     ├─ status: string                  ← "draft", "publish", etc.
     ├─ slug: string
     ├─ author: number
     ├─ categories: number[]
     ├─ tags: number[]
     ├─ meta: Y.Map                     ← post meta key-value pairs
     ├─ blocks: Y.Array<YBlock>         ← THE LIVE EDITING TARGET
     │   └─ YBlock: Y.Map
     │       ├─ name: string            ← "core/paragraph", "core/heading", etc.
     │       ├─ clientId: string        ← UUID (not synced across peers)
     │       ├─ isValid: boolean
     │       ├─ originalContent: string ← HTML for validation
     │       ├─ attributes: Y.Map
     │       │   ├─ [rich-text attr]: Y.Text  ← character-level merging
     │       │   └─ [other attr]: any         ← last-writer-wins
     │       └─ innerBlocks: Y.Array<YBlock>  ← recursive
     └─ [other fields]
```

### 5.2 Identifying Rich-Text Attributes

An attribute is stored as `Y.Text` (with character-level CRDT merging) when the
block's `block.json` declares it with `"type": "rich-text"`. Common examples:

| Block | Attribute | Type |
|-------|-----------|------|
| `core/paragraph` | `content` | `rich-text` (Y.Text) |
| `core/heading` | `content` | `rich-text` (Y.Text) |
| `core/list-item` | `content` | `rich-text` (Y.Text) |
| `core/image` | `caption` | `rich-text` (Y.Text) |
| `core/quote` | `citation` | `rich-text` (Y.Text) |
| `core/image` | `url` | `string` (plain value) |
| `core/heading` | `level` | `integer` (plain value) |
| `core/paragraph` | `dropCap` | `boolean` (plain value) |

The agent must know which attributes are rich-text to use the correct Yjs
operations. This can be determined by loading block type definitions from the
WordPress REST API (`GET /wp/v2/block-types`) or by embedding a static mapping
of common core blocks.

### 5.3 High-Level Operations

All operations must be wrapped in a `doc.transact()` call with a consistent
origin string (e.g., `'agent'`) so the sync client can distinguish local changes
from remote changes.

#### Read Current Block State

```typescript
const rootMap = doc.getMap('record');
const blocks = rootMap.get('blocks') as Y.Array<Y.Map<any>>;

// Iterate blocks
for (let i = 0; i < blocks.length; i++) {
  const block = blocks.get(i);
  const name = block.get('name');           // "core/paragraph"
  const attrs = block.get('attributes');    // Y.Map
  const content = attrs.get('content');     // Y.Text or plain value

  if (content instanceof Y.Text) {
    console.log(content.toString());        // "Hello world"
  }
}
```

#### Edit Text in a Paragraph (Surgical Delta)

```typescript
doc.transact(() => {
  const blocks = doc.getMap('record').get('blocks') as Y.Array<Y.Map<any>>;
  const paragraph = blocks.get(2);  // 3rd block
  const attrs = paragraph.get('attributes') as Y.Map<any>;
  const content = attrs.get('content') as Y.Text;

  // Insert " beautiful" after "Hello" (position 5)
  content.insert(5, ' beautiful');
  // Result: "Hello beautiful world"
}, 'agent');
```

#### Replace a Word

```typescript
doc.transact(() => {
  const content = getBlockContent(doc, blockIndex);
  const text = content.toString();
  const pos = text.indexOf('world');
  if (pos !== -1) {
    content.delete(pos, 'world'.length);
    content.insert(pos, 'universe');
  }
}, 'agent');
```

#### Add a New Block

```typescript
doc.transact(() => {
  const blocks = doc.getMap('record').get('blocks') as Y.Array<Y.Map<any>>;

  const newBlock = new Y.Map();
  newBlock.set('name', 'core/paragraph');
  newBlock.set('clientId', crypto.randomUUID());
  newBlock.set('isValid', true);

  const attrs = new Y.Map();
  attrs.set('content', new Y.Text('New paragraph added by agent.'));
  newBlock.set('attributes', attrs);

  newBlock.set('innerBlocks', new Y.Array());

  // Insert after block 3
  blocks.insert(4, [newBlock]);
}, 'agent');
```

#### Delete a Block

```typescript
doc.transact(() => {
  const blocks = doc.getMap('record').get('blocks') as Y.Array<Y.Map<any>>;
  blocks.delete(2, 1);  // Remove block at index 2
}, 'agent');
```

#### Change a Block Attribute

```typescript
doc.transact(() => {
  const blocks = doc.getMap('record').get('blocks') as Y.Array<Y.Map<any>>;
  const heading = blocks.get(0);
  const attrs = heading.get('attributes') as Y.Map<any>;
  attrs.set('level', 3);  // Change H2 to H3
}, 'agent');
```

#### Edit the Post Title

```typescript
doc.transact(() => {
  const rootMap = doc.getMap('record');
  const title = rootMap.get('title') as Y.Text;
  title.delete(0, title.length);
  title.insert(0, 'New Title');
}, 'agent');
```

### 5.4 Operations to Avoid

- **Do NOT replace the entire `blocks` Y.Array.** This destroys CRDT history and
  causes the human to lose all concurrent edits.
- **Do NOT write to the `content` Y.Text field** during editing. This field
  contains the serialized HTML and is derived from the `blocks` array. The
  `blocks` array is authoritative.
- **Do NOT modify `clientId` on existing blocks.** The collaboration system
  uses clientId for internal tracking; changing it can cause duplicate block
  detection issues.

---

## 6. Implementation Guide

### 6.1 Project Structure

```
wp-agent-collab/
├── src/
│   ├── index.ts              # Public API exports
│   ├── sync-client.ts        # HTTP polling + Yjs sync protocol
│   ├── block-tree.ts         # High-level block operations
│   ├── awareness.ts          # Awareness state management
│   ├── encoding.ts           # Base64 <-> Uint8Array helpers
│   └── types.ts              # TypeScript interfaces
├── package.json
├── tsconfig.json
└── tests/
    ├── sync-client.test.ts
    ├── block-tree.test.ts
    └── integration.test.ts
```

### 6.2 Public API

```typescript
// wp-agent-collab public API

interface AgentCollabOptions {
  siteUrl: string;           // "https://example.com"
  username: string;          // WordPress username
  appPassword: string;       // Application password
  postId: number;            // Post ID to edit
  postType?: string;         // Default: "post"
  agentName?: string;        // Displayed in collaborator presence
  onRemoteChange?: (blocks: BlockSnapshot[]) => void;
  debug?: boolean;
}

interface BlockSnapshot {
  index: number;
  name: string;
  attributes: Record<string, any>;
  innerBlocks: BlockSnapshot[];
}

class AgentCollab {
  // Lifecycle
  async connect(options: AgentCollabOptions): Promise<void>;
  async disconnect(): Promise<void>;

  // Read state
  getTitle(): string;
  getExcerpt(): string;
  getBlocks(): BlockSnapshot[];
  getBlockCount(): number;
  getBlockText(index: number): string;

  // Write operations (all atomic via doc.transact)
  setTitle(text: string): void;
  setExcerpt(text: string): void;
  insertText(blockIndex: number, offset: number, text: string): void;
  deleteText(blockIndex: number, offset: number, length: number): void;
  replaceText(blockIndex: number, search: string, replacement: string): void;
  addBlock(position: number, blockName: string, attributes: Record<string, any>): void;
  removeBlock(index: number): void;
  setBlockAttribute(blockIndex: number, attrName: string, value: any): void;

  // Events
  on(event: 'sync', callback: () => void): void;
  on(event: 'remote-change', callback: (blocks: BlockSnapshot[]) => void): void;
  on(event: 'status', callback: (status: 'connected'|'connecting'|'disconnected') => void): void;
}
```

### 6.3 SyncClient Implementation Steps

1. **Initialize Y.Doc and Awareness**:
   ```typescript
   const doc = new Y.Doc();
   const awareness = new Awareness(doc);
   awareness.setLocalState({ user: agentName });
   ```

2. **Create sync_step1**:
   ```typescript
   const encoder = encoding.createEncoder();
   syncProtocol.writeSyncStep1(encoder, doc);
   const step1 = { type: 'sync_step1', data: base64(encoding.toUint8Array(encoder)) };
   ```

3. **Start polling loop**:
   ```typescript
   let cursor = 0;
   let interval = 1000;
   let queuePaused = true;
   const updateQueue: SyncUpdate[] = [step1];

   async function poll() {
     const payload = {
       rooms: [{
         room: `postType/${postType}:${postId}`,
         client_id: doc.clientID,
         after: cursor,
         awareness: awareness.getLocalState(),
         updates: queuePaused ? [] : updateQueue.splice(0),
       }]
     };

     const response = await fetch(url, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Basic ${btoa(`${username}:${appPassword}`)}`
       },
       body: JSON.stringify(payload),
     });

     const { rooms } = await response.json();
     const room = rooms[0];

     // Update cursor
     cursor = room.end_cursor;

     // Process awareness
     processAwareness(room.awareness, awareness);

     // Resume queue if collaborators detected
     if (Object.keys(room.awareness).length > 1) {
       queuePaused = false;
       interval = 250;
     }

     // Process incoming updates
     for (const update of room.updates) {
       processUpdate(update, doc);
     }

     // Handle compaction
     if (room.should_compact) {
       updateQueue.length = 0;
       updateQueue.push({
         type: 'compaction',
         data: base64(Y.encodeStateAsUpdate(doc))
       });
     }

     setTimeout(poll, interval);
   }
   ```

4. **Listen for local changes**:
   ```typescript
   doc.on('update', (update: Uint8Array, origin: unknown) => {
     if (origin === 'sync-client') return;  // Ignore remote
     updateQueue.push({ type: 'update', data: base64(update) });
   });
   ```

5. **Process incoming updates**:
   ```typescript
   function processUpdate(update: SyncUpdate, doc: Y.Doc) {
     const data = base64ToUint8Array(update.data);

     switch (update.type) {
       case 'sync_step1': {
         const decoder = decoding.createDecoder(data);
         const encoder = encoding.createEncoder();
         syncProtocol.readSyncMessage(decoder, encoder, doc, 'sync-client');
         const response = encoding.toUint8Array(encoder);
         if (response.length > 0) {
           updateQueue.push({ type: 'sync_step2', data: base64(response) });
         }
         break;
       }
       case 'sync_step2': {
         const decoder = decoding.createDecoder(data);
         const encoder = encoding.createEncoder();
         syncProtocol.readSyncMessage(decoder, encoder, doc, 'sync-client');
         // Sync complete — doc now has full state
         break;
       }
       case 'update':
       case 'compaction':
         Y.applyUpdate(doc, data, 'sync-client');
         break;
     }
   }
   ```

### 6.4 Loading Initial Post State

The Y.Doc will be populated after sync_step2 completes. Before that, the agent
can optionally pre-load the post via REST API to understand the current content:

```
GET /wp-json/wp/v2/posts/123?context=edit
```

However, the authoritative state comes from the CRDT document. The REST API
response may be stale if the human has unsaved edits.

---

## 7. Error Handling

### Connection Failures

- On HTTP error: double the polling interval (max 30s), restore queued updates
  to front of queue for retry.
- On success after error: reset interval to base (1000ms or 250ms).
- On authentication failure (401/403): stop polling, emit error event.

### Conflict Scenarios

The Yjs CRDT handles conflicts automatically. However, the agent should be aware
of edge cases:

- **Same Y.Text concurrent edit**: Yjs merges character operations
  deterministically. Result is always consistent across peers, but may not be
  semantically meaningful if both peers rewrote the same sentence.
- **Same Y.Map key concurrent set**: Last-writer-wins at the Yjs level. The
  "last" writer is determined by Yjs client ID ordering, not wall-clock time.
- **Block inserted at same position**: Both insertions are preserved. The order
  is determined by Yjs's conflict resolution (lower client ID goes first).

### Graceful Shutdown

Always send a disconnect signal (`awareness: null`) before exiting. Use a
process signal handler:

```typescript
process.on('SIGINT', async () => {
  await agentCollab.disconnect();
  process.exit(0);
});
```

---

## 8. Testing Strategy

### Unit Tests

- **Encoding**: Base64 round-trip for Uint8Array
- **Block operations**: Create, read, update, delete blocks on a local Y.Doc
- **Rich-text deltas**: Insert, delete, replace text in Y.Text
- **Update processing**: sync_step1 → sync_step2 → update flow on local docs

### Integration Tests

Use Gutenberg's existing E2E test infrastructure as a reference
(`test/e2e/specs/editor/collaboration/`). The integration tests should:

1. Start a wp-env instance with collaboration enabled
2. Open the block editor in a browser (Playwright)
3. Connect the Node.js agent to the same post
4. Verify edits flow bidirectionally:
   - Agent inserts text → human sees it in the editor
   - Human types text → agent's Y.Doc is updated
5. Verify concurrent edits merge correctly
6. Verify disconnect cleans up awareness

### Manual Testing Checklist

- [ ] Agent connects and appears in collaborators presence UI
- [ ] Agent adds a paragraph → appears in editor without reload
- [ ] Agent edits a heading → text updates live in editor
- [ ] Human types while agent edits different block → no conflicts
- [ ] Agent disconnects → removed from presence UI
- [ ] Agent reconnects after network interruption → resumes correctly
- [ ] Compaction works when update count exceeds threshold

---

## 9. Architectural Decisions

### Why HTTP Polling Instead of WebSocket

The existing Gutenberg sync server uses HTTP polling. Implementing a WebSocket
transport would require:
- A new server-side component (WordPress doesn't natively support WebSocket)
- Changes to Gutenberg core
- Additional deployment complexity

HTTP polling at 250ms intervals provides acceptable latency for agent workflows
and requires zero server changes.

### Why Not Use the REST API Directly

The REST API (`PUT /wp/v2/posts/123`) writes directly to the database, bypassing
the CRDT layer. This causes:
- The CRDT document and database to diverge
- The human's editor to not see the changes until reload
- Potential data loss when either party saves

The CRDT path ensures both parties see each other's changes in real-time with
automatic conflict resolution.

### Why Bundle a Separate Yjs Instance

The Yjs singleton constraint (yjs/yjs#438) only applies when two Yjs instances
share the same JavaScript runtime. Since the agent runs in a separate Node.js
process, there's no shared runtime with the browser editor. Bundling Yjs
directly is safe and simpler than depending on `@wordpress/sync`.

### Why the Agent Needs Block Structure Knowledge

The CRDT document stores blocks as `Y.Map` instances with typed attributes, not
as serialized HTML. An agent that only understands block markup (HTML with
`<!-- wp: -->` comment delimiters) cannot directly operate on the Y.Doc.

The agent must know:
- Which block types exist and their attribute schemas
- Which attributes are `rich-text` (stored as Y.Text) vs plain values
- How `innerBlocks` nest for container blocks (groups, columns)

This knowledge can be compiled statically for core blocks or fetched dynamically
from `GET /wp-json/wp/v2/block-types`.

### Why Prefer Surgical Edits

Large wholesale replacements (e.g., replacing an entire paragraph's Y.Text)
produce large deltas that are more likely to conflict with concurrent human
keystrokes. Surgical edits (insert 5 characters at position 42) produce small
deltas that merge predictably with any concurrent text changes.
