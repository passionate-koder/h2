# Buildora

A hackathon and innovation program platform built with Next.js App Router, React, TypeScript, and Tailwind CSS.

## Run locally

```sh
npm ci
npm run dev -- --port 3100
```

Open http://localhost:3100. Set `NEXT_PUBLIC_SITE_URL` to the public origin when deploying.

## Validate and build

```sh
npm run typecheck
npm run build
npm start -- --port 3100
```

With the app running on port 3100:

```sh
npm run test:smoke
node scripts/verify.mjs
```

Browser checks use Microsoft Edge through Playwright. `BASE_URL` overrides the smoke-test target. Screenshots are written to the ignored `test-results/` directory.

## Project structure

- `src/app`: pages, API routes, global styles, and metadata.
- `src/components`: navigation, program controls, forms, account screens, and dashboards.
- `src/content`: local page content, route inventory, program data, and account fixtures.
- `src/lib`: content rendering, account persistence, and shared utilities.
- `public/assets`: required images, illustrations, and fonts.
- `public/site.css`: shared presentation styles.
- `scripts`: local account configuration and validation tools.

Development output uses `.next-dev/`; production builds use `.next/`.

## Local accounts

Keep `.env.local` private. Existing authentication uses `HC_SESSION_SECRET`, `HC_STUDENT_EMAIL`, `HC_STUDENT_PASSWORD_HASH`, `HC_PRO_EMAIL`, and `HC_PRO_PASSWORD_HASH`. These configuration names remain compatible with existing local installations.

To configure password hashes, provide `HC_STUDENT_PASSWORD` and `HC_PRO_PASSWORD` through environment variables and run `node scripts/configure-local-accounts.mjs`. The script writes password hashes and a session secret to `.env.local`.

Account changes, registrations, and hosting inquiries persist in the ignored `.local-data/` directory. Uploads retain filenames only. OAuth, account creation, password reset email delivery, and live project submissions require backend integration. Contact and booking actions use the local hosting inquiry flow.
