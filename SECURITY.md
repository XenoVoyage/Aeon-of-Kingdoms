# Security policy

## Supported version

Only the current `main` branch and the version deployed through GitHub Pages receive security fixes. Older snapshots, forks, local modifications, and future server prototypes are not maintained by this repository unless explicitly documented.

## Reporting a vulnerability

Do not publish exploit details in a public issue first.

Use GitHub's private [Report a vulnerability](https://github.com/XenoVoyage/Aeon-of-Kingdoms/security/advisories/new) form when available. If it is unavailable, open a public issue titled **Private security contact requested** without technical details so the owner can provide a private channel.

Include the affected version, browser or environment, concise reproduction, expected impact, and possible mitigation. Do not include real credentials, personal data, live room secrets, destructive proof-of-concept material, or third-party data.

## Current boundary

The deployed status boundary, published approved Phase 1A review, and script-free Phase 1B visual-lock candidate are static, non-playable surfaces. The bounded reviews contain only local images and HTML/CSS; repository-only masters and four staged runtime-envelope browser samples add no executable or network boundary. None of these surfaces is gameplay. They have no account, payment, analytics, telemetry, matchmaking, relay, authoritative game server, or production multiplayer connection. [`docs/STATUS.md`](docs/STATUS.md) owns the exact current version and deployment evidence.

Relevant reports include:

- script execution or Content Security Policy bypass;
- unexpected external loading or network communication;
- unsafe delivery, caching, or rendering of the local status and reference-gallery resources;
- GitHub Actions, Pages, artifact, branch-protection, or release-integrity weaknesses;
- a vulnerability in a future networking feature that is actually present on `main`.

Editing the preserved rejected prototype's local game state, AI behavior visible in historical source, host cheating in a future explicitly host-authoritative P2P match, browser-extension injection, and unsupported-browser defects are not security boundaries for the current static communication surfaces.

## Future multiplayer

Multiplayer remains planned. Before it ships, the project must document signaling and relay operators, data visibility and retention, authentication and reconnect, command and message limits, abuse controls, CSP changes, dependency provenance, and a private reporting path for any separately deployed server.

Never commit cloud credentials, TURN secrets, personal access tokens, or reusable room/seat tokens. Rotate a credential immediately if it is exposed; removing it from the latest commit is not sufficient.
