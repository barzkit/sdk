# Contributing

## Setup

```bash
git clone https://github.com/barzkit/sdk.git
cd sdk
npm install
npm run build
npm test
```

## Development

```bash
npm run dev          # watch mode
npm run test:watch   # tests in watch mode
npm run lint         # type check
```

## Pull Requests

1. Fork and branch from `main`
2. Write tests for new functionality
3. Ensure `npm test` and `npm run lint` pass
4. Open PR with clear description

## Code Style

- TypeScript strict mode
- No `any` types
- JSDoc on public exports
- Human-readable error messages
