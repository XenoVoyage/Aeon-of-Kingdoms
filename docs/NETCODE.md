# Multiplayer and netcode plan

> **Owner-selected future direction:** the first multiplayer experience will be a simple private two-player host/client room joined by a short room code. The room creator's browser is authoritative. Implementation remains deferred to the networking phase after the local simulation gates in [`REDESIGN.md`](REDESIGN.md); this decision does not authorize networking code, a provider, a dependency, or a CSP exception now.

Multiplayer was an architectural target, not a feature of the published rejected prototype. The current GitHub Pages source is local-only and makes no signaling, relay, matchmaking, or game-server request.

## Hosting reality

GitHub Pages can host the HTML, CSS, JavaScript, and assets of a multiplayer client. It cannot keep a process alive, accept WebSocket connections, run authoritative matches, conceal server secrets, or act as a WebRTC signaling/TURN service. GitHub Actions deploys files and then exits; it is not a relay.

The design therefore separates one deterministic game protocol from two future authority adapters:

| Adapter | Authority | Infrastructure | Intended use |
| --- | --- | --- | --- |
| Host/client WebRTC | One player's browser | Pages client plus signaling and, for difficult networks, TURN | Private casual matches and shareable rooms |
| Dedicated WebSocket | Server process | Small Node service on AWS or another persistent host | Public rooms, stronger availability and anti-cheat boundary |

Both adapters must feed the same validated command interface. Game rules must not import transport APIs.

## Selected first multiplayer model

Use a host-authoritative deterministic command stream rather than broadcasting every entity transform every render frame.

1. A client converts selection and orders into a compact command.
2. The host validates ownership, rate, payload bounds, resources, and target legality.
3. The host assigns an execution tick and total order.
4. Every peer receives the same ordered batch and advances the deterministic simulation.
5. Peers exchange periodic state hashes. A mismatch requests a bounded authoritative snapshot.
6. Join-in-progress, if added, starts from one snapshot plus subsequent command batches.

Commands travel on a reliable ordered data channel. Cosmetic cursor or presence data may use a separate lossy channel later, but never owns game state. An RTS does not need shooter-style rollback for the first implementation; a small command delay and visible latency state are simpler and more stable.

## Why this is bandwidth efficient

Entity state can be derived locally from the same seed, tick, configuration, and commands. A move order for a selected group is sent once, not as dozens of positions 60 times per second. Periodic hashes are tiny, while complete snapshots are exceptional recovery data with strict size and frequency limits.

This optimization is valid only while determinism is proven. If a system cannot reproduce across supported browsers, that state must be quantized or explicitly synchronized before multiplayer ships.

## Protocol envelope

Every message needs an exact versioned schema and a maximum encoded size. A conceptual envelope contains:

| Field | Purpose |
| --- | --- |
| `protocol` | Reject incompatible builds before a match starts |
| `matchId` | Prevent cross-room messages |
| `playerId` | Bind a message to an assigned seat, never a display name |
| `sequence` | Detect duplicates, gaps, and reordering |
| `tick` | Deterministic execution point |
| `kind` | Small allowlisted message or command type |
| `payload` | Type-specific bounded integer/fixed-point data |

Entity identifiers, selected-entity count, command rate, chat length, snapshot bytes, resync frequency, and lobby seats all require hard limits. Unknown fields and invalid enum values are rejected; remote data is never merged blindly into state or DOM.

## Private room lifecycle

The owner selected this deliberately narrow first milestone on 2026-08-22:

- Exactly two known players join a private room through a short room code: one host and one client.
- The creator is the match host and only authority.
- Faction, team, map layout, and mode lock before the seed and starting tick are committed.
- Readiness includes protocol version, deterministic configuration hash, and asset/build version.
- Host departure ends the first-version match. Host migration, join-in-progress, reconnect, spectators, public matchmaking, accounts, chat, and public discovery are excluded from the first version.

The room code is a discovery handle, not a credential or secret. It must not be presented as security by itself, and reusable seat material must never be placed in the URL, logs, screenshots, issues, or source.

WebRTC still needs signaling. Many real networks also require a TURN relay. A third-party helper may simplify discovery, but its license, maintainer provenance, pinned version, relay behavior, privacy impact, CSP domains, and failure modes must be reviewed before adoption. No dependency is approved merely because it has a convenient CDN build; production resources remain repository-local and version-pinned.

## Dedicated authority later

A dedicated server should implement the same protocol behind a transport interface, preferably as a small Node process using a narrowly scoped WebSocket library. The server owns seats, validates commands, advances the fixed simulation, publishes hashes/snapshots, and closes abusive or incompatible connections.

The browser client must never contain AWS credentials. Deployment configuration, secrets, logs, rate limits, process supervision, regional placement, TLS termination, and cost controls belong to a separate server deployment boundary, not the Pages workflow. Server code and its threat model should live in a clearly isolated directory or repository once authorized.

## Security and fairness

Host authority prevents ordinary clients from creating entities or spending resources they do not own, but the host can still cheat or terminate a P2P game. UI must call this model **hosted** rather than implying trusted competitive authority.

Before either adapter ships:

- validate and cap every remote value before allocation or lookup;
- authenticate seat assignment without exposing reusable secrets in URLs or logs; if reconnect is later added, authenticate it through a separately bounded token flow;
- escape user-controlled names and chat as text;
- rate-limit signaling, commands, snapshots, and room creation; rate-limit reconnect separately if it is later added;
- define idle, background-tab, disconnect, and host-loss outcomes;
- keep deterministic configuration hashes and protocol versions in the handshake;
- test malformed, duplicate, delayed, reordered, and flood traffic;
- document third-party relay visibility and retention;
- update CSP only for the minimum reviewed `connect-src` endpoints.

## Delivery milestones

1. Freeze deterministic command, replay, hash, and snapshot tests entirely offline.
2. Run two local clients through an in-memory transport with delay, jitter, duplication, and loss simulation.
3. Add a manually signaled WebRTC two-player host/client prototype with no public lobby.
4. Add reviewed signaling and TURN configuration, short private room codes, and honest connectivity UI.
5. Measure command bandwidth, resync rate, long-match convergence, background-tab behavior, and mobile thermals.
6. Only then evaluate public discovery and the optional dedicated WebSocket authority.

Multiplayer is complete only after real cross-network device tests. A local loopback test, Pages deployment, or successful signaling handshake does not prove a stable match.
