#!/bin/sh
# Hand PID 1 to node. `exec` is the point: without it the shell keeps PID 1, SIGTERM never
# reaches node, and every deploy closes SQLite the hard way with a live -wal beside it.
# The schema is created by the app on startup (CREATE TABLE IF NOT EXISTS), so there is no
# separate migration step.
set -e
mkdir -p "$(dirname "${DB_PATH:-/data/attendance.db}")"
exec node build
