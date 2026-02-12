# Dev Fanout Server

This service receives webhook requests at `/forward/*` and forwards them to a
list of registered dev URLs (typically ngrok URLs).

This service is deployed to production exclusively to help with local
development, so that local dev servers can receive public webhooks.

This server should not be run locally other than to add and test new features.

## `ava-cli` usage

The fanout server can be interacted with using the ava CLI.

1. Make sure you've built ava-cli locally with `npm run build:ava-cli`
2. In `.env.development` (repo root), set:
   - `AVA_DEV_FANOUT_SERVER_URL=https://<your-fly-app>.fly.dev`
   - `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET=<same token as Fly secret>`

3. Developers can now register or remove ngrok URLs from the dev fanout server
   using:
   - `ava dev ngrok add <url>`
   - `ava dev ngrok list`
   - `ava dev ngrok remove <url>`

## Implementation details

### Persistent storage

Dev URLs are stored in a Fly Volume–backed JSON file:

- Default path: `/data/ngrok-dev-urls.json`
- Override with: `AVA_NGROK_DEV_URLS_FILE_PATH`

File schema:

```json
{ "targets": ["https://example.ngrok.app"] }
```

### Admin endpoints (authenticated)

These endpoints manage the persisted URL list. They require an Authorization
header:

- `Authorization: Bearer $AVA_DEV_FANOUT_ADMIN_SERVER_SECRET`

Endpoints:

- `GET /ngrok-url/list`
- `POST /ngrok-url/add` body `{ "url": "https://..." }`
- `POST /ngrok-url/remove` body `{ "url": "https://..." }`

### Environment variables

Server:

- `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET` (required): Bearer token for admin
  endpoints.
- `AVA_NGROK_DEV_URLS_FILE_PATH` (optional): Override JSON file path.

### Fly.io setup

- Create a Fly app for this service.
- Create a Fly Volume (1GB is fine) and mount it at `/data`.
- Set secrets:
  - `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET`
  - (optional) `AVA_NGROK_DEV_URLS_FILE_PATH=/data/ngrok-dev-urls.json`
- Initialize the file on the volume:

```bash
echo '{ "targets": [] }' > /data/ngrok-dev-urls.json
```

### How to build locally

```bash
docker build -f packages/dev-fanout-server/Dockerfile \
  -t dev-fanout-server:local .
```

### How to deploy on Fly

```bash
fly deploy --config packages/dev-fanout-server/fly.production.toml
```
