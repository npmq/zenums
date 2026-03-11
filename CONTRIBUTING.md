# Contributing

Thanks for your interest in `zenums`.

## Before contributing

For large changes, new features, API changes, or behavior changes, please open an issue first so the direction can be discussed before work starts.

For small fixes, documentation improvements, or typo fixes, a pull request is usually fine.

## Development

This project uses **Bun** for local development, testing, and scripts.

Install dependencies:

```bash
bun install
```

Useful commands:

```bash
bun run build
bun run test:all
npm run typecheck
npm run lint
npm run format
```

## Expectations

Please try to keep contributions:

- small and focused
- well-typed
- tested when behavior changes
- consistent with the existing API and project structure

`zenums` aims to stay deterministic, type-safe, and minimal at runtime, so changes should preserve those goals.

## Security

Please do not report suspected security issues in public issues.

Use the process described in `SECURITY.md`.
