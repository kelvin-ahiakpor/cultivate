# Scripts

Developer-only scripts live here instead of the repo root.

- `debug/`: one-off database inspection or repair scripts
- `translation-tests/`: manual translation API probes and experiments
- top-level `scripts/*.ts`: small focused utilities that do not yet justify their own subfolder (for example the weather tests)

Examples:

```bash
node scripts/translation-tests/test-khaya-api.js
tsx scripts/debug/check-message-count.ts
```
