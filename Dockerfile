# syntax=docker/dockerfile:1
# Event Planner: SvelteKit (adapter-node) + better-sqlite3, for Coolify's Dockerfile build pack.
# Debian, not Alpine. better-sqlite3 13 ships prebuilt linux-x64/arm64 bindings inside the
# package and loads them first, so the image needs no compiler toolchain.

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# --ignore-scripts: npm 11.19 runs node-gyp for better-sqlite3 despite its "gypfile": false,
# and gyp needs Python just to read binding.gyp. The lockfile flags no other install script
# (fsevents is macOS-only); re-check with `jq '.packages | map_values(select(.hasInstallScript))'
# package-lock.json` before adding a dependency that has one.
RUN npm ci --ignore-scripts
# Fail the build, not the deploy, if the prebuilt SQLite binding can't load on this platform.
RUN node -e "new (require('better-sqlite3'))(':memory:').close()"
COPY . .
# SvelteKit's postbuild analyse imports every server module, and src/lib/server/db.ts opens
# SQLite at import time. createDb() creates data/ itself; the file dies with this stage.
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
# Coolify's health check runs `curl … || wget …` inside the container and replaces the
# HEALTHCHECK below. The slim image ships neither, so without curl the container is marked
# unhealthy forever, and Traefik won't route to an unhealthy container (404, no certificate).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
# SHUTDOWN_TIMEOUT: the entrance screen keeps a live stream open, and adapter-node otherwise
# waits 30s for it on SIGTERM, well past Docker's 10s stop grace. 3s lets SQLite close cleanly.
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/attendance.db SHUTDOWN_TIMEOUT=3
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Owned by node so an empty named volume inherits writable ownership.
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
# For plain `docker run`; under Coolify its own curl check (above) takes over.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
