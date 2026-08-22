# Security policy

## Supported version

Only the current `main` branch and the version deployed through GitHub Pages receive security fixes. Older snapshots, forks, local modifications, and future server prototypes are not maintained by this repository unless explicitly documented.

## Reporting a vulnerability

Do not publish exploit details in a public issue first.

Use GitHub's private [Report a vulnerability](https://github.com/XenoVoyage/Aeon-of-Kingdoms/security/advisories/new) form when available. If it is unavailable, open a public issue titled **Private security contact requested** without technical details so the owner can provide a private channel.

Include the affected version, browser or environment, concise reproduction, expected impact, and possible mitigation. Do not include real credentials, personal data, live room secrets, destructive proof-of-concept material, or third-party data.

## Current boundary

The status boundary and published approved Phase 1A/Phase 1B reviews are static, non-playable surfaces. The bounded reviews contain only local images and HTML/CSS; repository-only masters and four staged runtime-envelope browser samples add no executable or network boundary. The approved Phase 2 source uses local classic JavaScript and Canvas only for a non-authoritative landscape shell, camera, map, and layered presentation. The approved Phase 3 foundation adds a local deterministic `MOVE` command/simulation boundary, local entity-art decoding, Canvas presentation, replay, snapshots, and checksums. The approved Phase 4 foundation extends that local-only boundary with strictly validated capture, economy, production, spawning, rally, structure-art loading, replay, snapshots, and checksums. The approved Phase 5 foundation extends it with nine validated tactical commands, deterministic combat, bounded projectiles, defeat, structure destruction, headquarters outcomes, and local damage assets. The approved Phase 6 foundation adds only a detached deterministic planner and local skirmish facade over that unchanged command/simulation boundary. These routes make no network request and are not authoritative across clients. Phase 7 is active only as a product-hardening planning contract and adds no runtime or security boundary yet. No account, payment, analytics, telemetry, matchmaking, relay, authoritative game server, or production multiplayer connection exists. [`docs/STATUS.md`](docs/STATUS.md) owns the exact current version and deployment evidence.

Relevant reports include:

- script execution or Content Security Policy bypass;
- unexpected external loading or network communication;
- unsafe delivery, caching, or rendering of the local status and reference-gallery resources;
- unbounded or unsafe Phase 2 through Phase 6 pointer, touch, keyboard, lifecycle, local-resource loading, Canvas sizing, map-data, observation, planning, command, simulation, snapshot, replay, checkpoint, checksum, queue, spawn, rally, capture, combat, or art-loader processing;
- GitHub Actions, Pages, artifact, branch-protection, or release-integrity weaknesses;
- a vulnerability in a future networking feature that is actually present on `main`.

Editing the preserved rejected prototype's local game state, AI behavior visible in historical source, camera feel or map composition without a security impact, host cheating in a future explicitly host-authoritative P2P match, browser-extension injection, and unsupported-browser defects are not security boundaries for the current source.

## Future multiplayer

Multiplayer remains planned. The selected first experience is a private two-player host/client room joined by a short code; the code is not a credential and the host is not trusted competitive authority. Before it ships, the project must document signaling and relay operators, data visibility and retention, seat authentication, command and message limits, abuse controls, CSP changes, dependency provenance, and a private reporting path for any separately deployed service.

Never commit cloud credentials, TURN secrets, personal access tokens, or reusable room/seat tokens. Rotate a credential immediately if it is exposed; removing it from the latest commit is not sufficient.
