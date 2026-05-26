# Kinho USB Source Package No Docker

This package is for direct source deployment on Ubuntu. It excludes Docker files, node_modules, dist outputs, .git, local caches, and test artifacts.

Important: this package includes .env files. Treat it as sensitive.

## Suggested target path

/opt/kinho

## Build commands

cd /opt/kinho
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @kinho/api prisma:generate
pnpm --filter @kinho/api prisma:migrate:deploy
pnpm --filter @kinho/api build
pnpm --filter pc-admin build
pnpm --filter customer-h5 build
pnpm --filter mobile-web build

## Runtime

API production entry:
apps/api/dist/src/main.js

Frontend build outputs:
apps/pc-admin/dist
apps/customer-h5/dist
apps/mobile-web/dist

customer-h5 production build defaults to /customer-h5/.
mobile-web production build defaults to /mobile-web/.
