# End-to-end tests

Drive the real stack in a browser: Single-SPA shell → auth micro frontend →
NestJS API → PostgreSQL.

Deliberately outside `turbo test`. Vitest suites must run anywhere with no
infrastructure; these need Docker, the API, and four dev servers.

## Running them

```bash
# 1. Database
docker compose up -d

cd packages/backend
bun run db:migrate
bun run db:seed
```

```bash
# 2. API. THROTTLE_PASSWORD_RESET_LIMIT is raised because the suite makes
#    more reset requests than a real user ever would. The production default
#    (5 per 15 min) stays strict — loosening it to make tests pass would mean
#    the limit no longer protects anything.
DATABASE_URL=postgresql://schoolwise_app:app_dev_password@localhost:5432/schoolwise \
JWT_ACCESS_SECRET=dev_only_secret_at_least_32_chars_long_xxxx \
APP_BASE_URL=http://localhost:9000 \
THROTTLE_PASSWORD_RESET_LIMIT=100 \
bun run --cwd packages/backend dev
```

```bash
# 3. Frontend
bun run dev
```

```bash
# 4. Tests. API_LOG points at the API's stdout, which is where the dev mail
#    fallback writes reset links — the reset tests read the link from there,
#    exactly as a user would read it from their inbox.
API_LOG=/path/to/api.log bun run test:e2e
```

## Why the reset link comes from a log

With `SMTP_HOST` unset, `MailService` writes the message to the log instead
of sending it. The tests parse the real generated URL out of that, rather
than fabricating a token — so the link under test is the one a user receives.

Set `SMTP_HOST` and the same tests exercise real delivery.
