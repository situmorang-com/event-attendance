import { env } from '$env/dynamic/private';
import { DB_PATH } from './config';
import { createDb, type DB } from './database';
import { loadSecret } from './sign';

// Survives Vite HMR in dev so we don't pile up open connections.
const g = globalThis as typeof globalThis & { __attendanceDb?: DB };

export const db = (g.__attendanceDb ??= createDb(DB_PATH));
export const secret = loadSecret(db, env.SESSION_SECRET);

// adapter-node emits this once the server has stopped (SIGTERM on a deploy). Closing here
// checkpoints the WAL, so no -wal file is left beside the database in the volume.
process.once('sveltekit:shutdown', () => db.close());
