# Spec: In-Browser Bridge Plugin (Architecture B)

A WordPress plugin that runs inside the block editor and bridges an external AI
agent into Gutenberg's existing collaboration system, sharing the same Yjs
document instance as the human editor for zero-latency co-editing.

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Plugin Structure](#4-plugin-structure)
5. [Agent Communication Protocol](#5-agent-communication-protocol)
6. [Block Operations API](#6-block-operations-api)
7. [Implementation Guide](#7-implementation-guide)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Architectural Decisions](#10-architectural-decisions)
11. [Comparison with Architecture A](#11-comparison-with-architecture-a)

---

## 1. Overview

### Goal

Build a WordPress plugin (`wp-agent-bridge`) that:

- Runs inside the block editor as a JavaScript module
- Hooks into Gutenberg's `sync.providers` filter to access the shared Y.Doc
- Exposes a REST API endpoint that an external agent can call to send edit
  instructions
- Translates those instructions into Yjs operations on the shared CRDT document
- Returns the current document state to the agent on demand
- Makes agent edits appear instantly in the human's editor (no polling delay)

### Non-Goals

- Running without the block editor open (use Architecture A for that)
- Implementing the full Yjs sync protocol (the plugin reuses Gutenberg's
  existing sync infrastructure)
- Modifying Gutenberg core

### Key Advantage Over Architecture A

The plugin shares the **same Yjs instance and Y.Doc** as the human editor. Edits
are applied directly to the in-memory document — there is no polling delay. The
existing HTTP polling provider handles sync to the server automatically.

### Key Constraint

The block editor must be open in a browser tab for the agent to edit. The plugin
cannot operate headlessly.

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Browser (Block Editor)                      │
│                                                               │
│  ┌─────────────────┐    ┌──────────────────────────────────┐  │
│  │  Gutenberg       │    │  wp-agent-bridge Plugin (JS)     │  │
│  │  core-data       │    │                                  │  │
│  │                  │    │  ┌────────────────────────────┐  │  │
│  │  Y.Doc ◄─────────────►  │  Bridge Provider           │  │  │
│  │  (shared)        │    │  │  - Captures Y.Doc ref      │  │  │
│  │                  │    │  │  - Exposes operations API   │  │  │
│  │  Sync Manager    │    │  └────────────────────────────┘  │  │
│  │  HTTP Polling    │    │                                  │  │
│  │  Provider        │    │  ┌────────────────────────────┐  │  │
│  │                  │    │  │  WebSocket Server           │  │  │
│  │                  │    │  │  (or long-poll endpoint)    │  │  │
│  │                  │    │  │  - Receives agent commands  │  │  │
│  │                  │    │  │  - Returns doc state        │  │  │
│  └─────────────────┘    │  └─────────────┬──────────────┘  │  │
│                          └───────────────│──────────────────┘  │
│          ↕  HTTP Polling                 │  WebSocket          │
└──────────┼───────────────────────────────┼────────────────────┘
           ▼                               ▼
┌────────────────────┐         ┌───────────────────────┐
│  WordPress Server  │         │  AI Agent Process     │
│  wp-sync/v1        │         │  (any language)       │
└────────────────────┘         └───────────────────────┘
```

### Components

| Component | Runs In | Responsibility |
|-----------|---------|---------------|
| Bridge Provider | Browser (JS) | Hooks `sync.providers`, captures Y.Doc reference, applies agent commands |
| Communication Layer | Browser (JS) | WebSocket server or REST polling endpoint for agent ↔ bridge messages |
| Agent REST Endpoint | WordPress (PHP) | Custom REST route for agent to send commands and receive state |
| External Agent | Any process | Sends high-level edit instructions, receives document state |

---

## 3. Prerequisites

### WordPress Site

- WordPress with the Gutenberg plugin active (or WordPress 7.0+)
- Real-time collaboration enabled:
  `wp_option: wp_enable_real_time_collaboration = true`
- A user account with `edit_post` capability
- The block editor must be open on the target post in a browser tab

### Plugin Dependencies

The plugin JS depends on these WordPress script handles:
- `wp-sync` — provides `wp.sync.Y` (Yjs library)
- `wp-hooks` — provides `wp.hooks.addFilter`
- `wp-data` — provides access to the store for block operations
- `wp-element` — for React components (optional, for UI)

---

## 4. Plugin Structure

```
wp-agent-bridge/
├── wp-agent-bridge.php           # Plugin entry point (PHP)
├── includes/
│   └── class-agent-rest-api.php  # REST API endpoint for agent commands
├── src/
│   ├── index.ts                  # JS entry point, hooks sync.providers
│   ├── bridge-provider.ts        # Sync provider that captures Y.Doc
│   ├── command-handler.ts        # Processes agent commands → Yjs ops
│   ├── state-reader.ts           # Reads current Y.Doc state for agent
│   └── communication.ts          # Agent ↔ bridge message transport
├── build/                        # Compiled JS (wp-scripts build)
├── package.json
└── readme.txt
```

### PHP Plugin Header

```php
<?php
/**
 * Plugin Name: WP Agent Bridge
 * Description: Bridges an external AI agent into Gutenberg's collaboration system.
 * Version: 0.1.0
 * Requires Plugins: gutenberg
 */
```

### Script Registration (PHP)

```php
add_action( 'enqueue_block_editor_assets', function() {
    $asset = include plugin_dir_path( __FILE__ ) . 'build/index.asset.php';

    wp_enqueue_script(
        'wp-agent-bridge',
        plugins_url( 'build/index.js', __FILE__ ),
        array_merge( $asset['dependencies'], [ 'wp-sync' ] ),
        $asset['version']
    );

    // Pass config to JS
    wp_localize_script( 'wp-agent-bridge', 'wpAgentBridge', [
        'restUrl'  => rest_url( 'agent-bridge/v1' ),
        'nonce'    => wp_create_nonce( 'wp_rest' ),
        'postId'   => get_the_ID(),
    ] );
} );
```

---

## 5. Agent Communication Protocol

The plugin exposes a REST endpoint that the agent polls or subscribes to.

### 5.1 REST API Endpoints

**Base**: `{site_url}/wp-json/agent-bridge/v1`

#### Send Commands

```
POST /agent-bridge/v1/commands
Authorization: Basic base64(user:app_password)
Content-Type: application/json

{
  "post_id": 123,
  "commands": [
    {
      "type": "insert_text",
      "block_index": 2,
      "attribute": "content",
      "offset": 5,
      "text": " beautiful"
    },
    {
      "type": "add_block",
      "position": 4,
      "block_name": "core/paragraph",
      "attributes": {
        "content": "New paragraph from agent."
      }
    }
  ]
}
```

**Response:**
```json
{
  "status": "applied",
  "commands_applied": 2,
  "current_state": {
    "title": "My Post",
    "block_count": 6
  }
}
```

#### Get Current State

```
GET /agent-bridge/v1/state?post_id=123
Authorization: Basic base64(user:app_password)

Response:
{
  "post_id": 123,
  "connected": true,
  "title": "My Post",
  "excerpt": "",
  "blocks": [
    {
      "index": 0,
      "name": "core/heading",
      "attributes": { "content": "Introduction", "level": 2 }
    },
    {
      "index": 1,
      "name": "core/paragraph",
      "attributes": { "content": "Hello beautiful world." }
    }
  ],
  "collaborators": [
    { "client_id": 123456, "name": "Alice" },
    { "client_id": 789012, "name": "AI Agent" }
  ]
}
```

#### Subscribe to Changes (Server-Sent Events)

```
GET /agent-bridge/v1/events?post_id=123
Authorization: Basic base64(user:app_password)

Response: text/event-stream
data: {"type":"remote_change","block_index":1,"attribute":"content","value":"Hello world updated"}
data: {"type":"block_added","index":3,"name":"core/image"}
data: {"type":"title_changed","value":"New Title"}
```

### 5.2 Command Types

| Command | Parameters | Effect |
|---------|-----------|--------|
| `insert_text` | `block_index`, `attribute`, `offset`, `text` | Insert text at position in Y.Text |
| `delete_text` | `block_index`, `attribute`, `offset`, `length` | Delete characters from Y.Text |
| `replace_text` | `block_index`, `attribute`, `search`, `replacement` | Find and replace in Y.Text |
| `set_text` | `block_index`, `attribute`, `value` | Replace entire Y.Text content (use sparingly) |
| `add_block` | `position`, `block_name`, `attributes` | Insert new YBlock at position |
| `remove_block` | `block_index` | Delete YBlock from array |
| `set_attribute` | `block_index`, `attribute`, `value` | Set non-rich-text attribute |
| `set_title` | `value` | Replace post title Y.Text |
| `set_excerpt` | `value` | Replace post excerpt Y.Text |
| `move_block` | `from_index`, `to_index` | Move block to new position |

### 5.3 PHP REST Controller

```php
class Agent_REST_API {
    public function register_routes() {
        register_rest_route( 'agent-bridge/v1', '/commands', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_commands' ],
            'permission_callback' => [ $this, 'check_permissions' ],
        ] );

        register_rest_route( 'agent-bridge/v1', '/state', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_state' ],
            'permission_callback' => [ $this, 'check_permissions' ],
        ] );
    }

    public function check_permissions( $request ) {
        $post_id = $request->get_param( 'post_id' );
        return current_user_can( 'edit_post', $post_id );
    }

    public function handle_commands( $request ) {
        // Commands are stored in a transient and picked up by the
        // JS bridge on its next heartbeat check.
        $post_id  = $request['post_id'];
        $commands = $request['commands'];

        $queue_key = 'agent_bridge_commands_' . $post_id;
        $existing  = get_transient( $queue_key ) ?: [];
        $existing  = array_merge( $existing, $commands );
        set_transient( $queue_key, $existing, 60 );

        return new WP_REST_Response( [
            'status'           => 'queued',
            'commands_queued'  => count( $commands ),
        ], 200 );
    }

    public function get_state( $request ) {
        // State is written by the JS bridge and stored in a transient.
        $post_id   = $request['post_id'];
        $state_key = 'agent_bridge_state_' . $post_id;
        $state     = get_transient( $state_key );

        if ( ! $state ) {
            return new WP_REST_Response( [
                'connected' => false,
                'message'   => 'Block editor is not open for this post.',
            ], 200 );
        }

        return new WP_REST_Response( $state, 200 );
    }
}
```

### 5.4 JS Bridge Heartbeat

The JS bridge polls the command queue via a WordPress REST API call and applies
commands to the Y.Doc:

```typescript
async function pollCommands() {
  const response = await apiFetch({
    path: `/agent-bridge/v1/commands?post_id=${postId}`,
    method: 'GET',
  });

  if (response.commands?.length > 0) {
    doc.transact(() => {
      for (const cmd of response.commands) {
        executeCommand(cmd, doc);
      }
    }, 'agent-bridge');
  }

  // Write current state for agent to read
  await apiFetch({
    path: '/agent-bridge/v1/state',
    method: 'POST',
    data: { post_id: postId, state: readDocState(doc) },
  });

  setTimeout(pollCommands, 200);  // 200ms polling
}
```

---

## 6. Block Operations API

### 6.1 Reading State from Y.Doc

```typescript
function readDocState(doc: Y.Doc): DocumentState {
  const rootMap = doc.getMap('record');
  const blocks = rootMap.get('blocks') as Y.Array<Y.Map<any>>;

  return {
    title: (rootMap.get('title') as Y.Text)?.toString() ?? '',
    excerpt: (rootMap.get('excerpt') as Y.Text)?.toString() ?? '',
    blocks: readBlocks(blocks),
  };
}

function readBlocks(yblocks: Y.Array<Y.Map<any>>): BlockSnapshot[] {
  const result: BlockSnapshot[] = [];

  for (let i = 0; i < yblocks.length; i++) {
    const yblock = yblocks.get(i);
    const attrs = yblock.get('attributes') as Y.Map<any>;
    const innerBlocks = yblock.get('innerBlocks') as Y.Array<Y.Map<any>>;

    const attributes: Record<string, any> = {};
    attrs.forEach((value: any, key: string) => {
      attributes[key] = value instanceof Y.Text ? value.toString() : value;
    });

    result.push({
      index: i,
      name: yblock.get('name') as string,
      attributes,
      innerBlocks: innerBlocks ? readBlocks(innerBlocks) : [],
    });
  }

  return result;
}
```

### 6.2 Executing Commands

```typescript
function executeCommand(cmd: AgentCommand, doc: Y.Doc): void {
  const rootMap = doc.getMap('record');
  const blocks = rootMap.get('blocks') as Y.Array<Y.Map<any>>;

  switch (cmd.type) {
    case 'insert_text': {
      const block = blocks.get(cmd.block_index);
      const attrs = block.get('attributes') as Y.Map<any>;
      const ytext = attrs.get(cmd.attribute);
      if (ytext instanceof Y.Text) {
        ytext.insert(cmd.offset, cmd.text);
      }
      break;
    }

    case 'delete_text': {
      const block = blocks.get(cmd.block_index);
      const attrs = block.get('attributes') as Y.Map<any>;
      const ytext = attrs.get(cmd.attribute);
      if (ytext instanceof Y.Text) {
        ytext.delete(cmd.offset, cmd.length);
      }
      break;
    }

    case 'replace_text': {
      const block = blocks.get(cmd.block_index);
      const attrs = block.get('attributes') as Y.Map<any>;
      const ytext = attrs.get(cmd.attribute);
      if (ytext instanceof Y.Text) {
        const text = ytext.toString();
        const pos = text.indexOf(cmd.search);
        if (pos !== -1) {
          ytext.delete(pos, cmd.search.length);
          ytext.insert(pos, cmd.replacement);
        }
      }
      break;
    }

    case 'add_block': {
      const newBlock = createYBlock(cmd.block_name, cmd.attributes);
      blocks.insert(cmd.position, [newBlock]);
      break;
    }

    case 'remove_block': {
      blocks.delete(cmd.block_index, 1);
      break;
    }

    case 'set_attribute': {
      const block = blocks.get(cmd.block_index);
      const attrs = block.get('attributes') as Y.Map<any>;
      attrs.set(cmd.attribute, cmd.value);
      break;
    }

    case 'set_title': {
      const title = rootMap.get('title') as Y.Text;
      title.delete(0, title.length);
      title.insert(0, cmd.value);
      break;
    }

    case 'set_excerpt': {
      const excerpt = rootMap.get('excerpt') as Y.Text;
      excerpt.delete(0, excerpt.length);
      excerpt.insert(0, cmd.value);
      break;
    }

    case 'move_block': {
      const blockData = blocks.get(cmd.from_index).toJSON();
      blocks.delete(cmd.from_index, 1);
      const adjustedTo = cmd.to_index > cmd.from_index
        ? cmd.to_index - 1
        : cmd.to_index;
      const newBlock = createYBlockFromJSON(blockData);
      blocks.insert(adjustedTo, [newBlock]);
      break;
    }
  }
}
```

### 6.3 Creating New YBlocks

```typescript
function createYBlock(
  blockName: string,
  attributes: Record<string, any>
): Y.Map<any> {
  const yblock = new Y.Map();
  yblock.set('name', blockName);
  yblock.set('clientId', crypto.randomUUID());
  yblock.set('isValid', true);

  const yattrs = new Y.Map();
  for (const [key, value] of Object.entries(attributes)) {
    if (isRichTextAttribute(blockName, key)) {
      yattrs.set(key, new Y.Text(String(value)));
    } else {
      yattrs.set(key, value);
    }
  }
  yblock.set('attributes', yattrs);
  yblock.set('innerBlocks', new Y.Array());

  return yblock;
}
```

---

## 7. Implementation Guide

### 7.1 Step 1: Hook into sync.providers

The core mechanism: add a filter that intercepts the provider creation to capture
the Y.Doc reference.

```typescript
// src/index.ts
import { addFilter } from '@wordpress/hooks';

let capturedDocs: Map<string, Y.Doc> = new Map();

addFilter('sync.providers', 'wp-agent-bridge', (providers) => {
  // Add our bridge provider alongside the existing HTTP polling provider
  return [
    ...providers,
    async ({ objectType, objectId, ydoc, awareness }) => {
      const room = objectId ? `${objectType}:${objectId}` : objectType;
      capturedDocs.set(room, ydoc);

      // Start the command polling loop for this document
      startCommandPolling(room, ydoc, awareness);

      return {
        destroy: () => {
          capturedDocs.delete(room);
          stopCommandPolling(room);
        },
        on: (event, callback) => {
          // Bridge provider doesn't need to emit status events —
          // the HTTP polling provider handles that.
        },
      };
    },
  ];
});
```

### 7.2 Step 2: Register PHP REST Routes

```php
// includes/class-agent-rest-api.php
add_action( 'rest_api_init', function() {
    $api = new Agent_REST_API();
    $api->register_routes();
} );
```

### 7.3 Step 3: Command Queue (PHP ↔ JS Bridge)

The command flow uses WordPress transients as a lightweight message queue:

1. Agent POSTs commands to `/agent-bridge/v1/commands` (PHP stores in transient)
2. JS bridge polls `/agent-bridge/v1/pending?post_id=123` every 200ms
3. JS bridge applies commands to Y.Doc, clears the transient
4. JS bridge writes current state to `/agent-bridge/v1/state` for agent to read

### 7.4 Step 4: Awareness Integration

Set the agent's presence in the awareness protocol so the human sees the agent
as a collaborator:

```typescript
function startCommandPolling(room: string, doc: Y.Doc, awareness: Awareness) {
  // Set agent presence
  awareness.setLocalStateField('agent', {
    name: 'AI Agent',
    color: '#6366f1',
  });

  // ... start polling loop
}
```

### 7.5 Step 5: State Synchronization

Write the document state to a transient on every Y.Doc change so the agent can
read it:

```typescript
doc.on('update', debounce(() => {
  const state = readDocState(doc);
  apiFetch({
    path: '/agent-bridge/v1/state',
    method: 'POST',
    data: { post_id: postId, state },
  }).catch(() => {});
}, 500));
```

---

## 8. Error Handling

### Editor Not Open

If the agent sends commands but the block editor isn't open, the PHP endpoint
queues the commands but they won't be applied until the editor opens. The
`GET /state` endpoint returns `{ connected: false }` so the agent knows.

### Stale Commands

Commands have a 60-second TTL (transient expiry). If the editor hasn't picked
them up within 60 seconds, they are discarded. The agent should retry if needed.

### Invalid Block Index

If a command references a `block_index` that doesn't exist (e.g., the human
deleted that block), the command is silently skipped. The agent should re-read
state before retrying.

### Y.Doc Not Yet Synced

The Y.Doc may not be fully synced when the bridge provider is created. Commands
should be buffered until the HTTP polling provider emits a `connected` status.

---

## 9. Testing Strategy

### Unit Tests

- **Command handler**: Each command type on a standalone Y.Doc
- **State reader**: Verify block snapshots match expected structure
- **YBlock creation**: Rich-text vs plain attribute types
- **Edge cases**: Empty documents, deeply nested innerBlocks, missing attributes

### Integration Tests

1. Activate the plugin in a wp-env instance
2. Open the block editor (Playwright)
3. POST commands via the REST API
4. Assert that blocks appear/change in the editor
5. Type in the editor → verify state endpoint reflects changes
6. Concurrent edits → verify CRDT merge

### Manual Testing Checklist

- [ ] Plugin activates without errors
- [ ] `sync.providers` filter runs (verify via console log)
- [ ] Y.Doc reference is captured for the active post
- [ ] `POST /commands` returns 200
- [ ] Commands apply within 200ms in the editor
- [ ] `GET /state` returns current block content
- [ ] Human types → state endpoint updates within 500ms
- [ ] Agent and human edit different blocks → no conflicts
- [ ] Agent and human edit same paragraph → CRDT merge works
- [ ] Editor closed → `GET /state` returns `{ connected: false }`
- [ ] Plugin deactivated → no errors, editor works normally

---

## 10. Architectural Decisions

### Why Use sync.providers Instead of a Separate Y.Doc

The `sync.providers` filter (`packages/sync/src/providers/index.ts:52`) is the
officially supported extension point. By adding a provider, we get a reference to
the **same Y.Doc** that Gutenberg's core-data package uses. This means:

- Edits are instant (no round-trip through the sync server)
- No separate Yjs instance needed (avoids the singleton conflict)
- The existing HTTP polling provider handles server sync automatically
- Awareness state is shared — the agent appears as a real collaborator

### Why Use Transients for the Command Queue

WordPress transients provide a simple, lightweight message queue that:
- Works with any WordPress installation (no Redis, no custom tables)
- Auto-expire (60s TTL prevents stale command buildup)
- Are fast for small payloads (single commands)
- Don't require WebSocket infrastructure

For higher throughput, the transient layer could be replaced with a custom table
or an in-memory queue (e.g., via a persistent object cache).

### Why Polling Instead of WebSocket for Agent ↔ Bridge

WordPress doesn't natively support WebSocket connections. While a WebSocket
server could be added via a Node.js sidecar, this would add deployment
complexity. REST polling at 200ms provides sub-second latency, which is
acceptable for agent workflows.

If lower latency is needed, the plugin could use Server-Sent Events (SSE) for
the bridge → agent direction (state changes), keeping REST POST for the
agent → bridge direction (commands).

### Why the Agent Sends High-Level Commands (Not Raw Yjs Updates)

The agent doesn't need to understand Yjs internals. It sends commands like
`insert_text` or `add_block`, and the bridge translates them into Yjs
operations. This means:

- The agent can be written in any language (Python, Go, etc.)
- No Yjs dependency in the agent
- The bridge handles rich-text vs plain attribute distinction
- Command validation happens in the bridge before touching the Y.Doc

### Why the Editor Must Be Open

The bridge provider runs in the browser's JavaScript context alongside the block
editor. Without the editor open, there is no Y.Doc to operate on. For headless
operation (no browser required), use Architecture A instead.

---

## 11. Comparison with Architecture A

| Aspect | Architecture A (Headless) | Architecture B (Bridge Plugin) |
|--------|--------------------------|-------------------------------|
| **Runtime** | Standalone Node.js process | Inside block editor (browser JS) |
| **Y.Doc** | Own instance, syncs via HTTP polling | Shared instance with editor |
| **Edit latency** | 250ms (polling interval) | Instant (same-process) |
| **Agent language** | Must be Node.js (for Yjs) | Any language (REST API) |
| **Yjs dependency** | Required in agent | Not required in agent |
| **Editor required** | No | Yes |
| **Server changes** | None | Plugin PHP (REST routes) |
| **Gutenberg changes** | None | None |
| **Complexity** | Higher (implement sync protocol) | Lower (high-level commands) |
| **Best for** | Autonomous agents, CI pipelines, batch edits | Interactive co-editing with human present |

### When to Use Which

**Use Architecture A when:**
- The agent needs to operate without a human having the editor open
- The agent is a long-running service monitoring multiple posts
- You need the agent to work during off-hours (e.g., scheduled content updates)
- The agent is already written in Node.js

**Use Architecture B when:**
- A human is always present and wants to collaborate with the agent in real-time
- You want the simplest possible agent implementation (any language, REST API)
- Sub-second edit latency matters (agent changes appear instantly)
- You want the agent to appear as a collaborator in the editor's presence UI
