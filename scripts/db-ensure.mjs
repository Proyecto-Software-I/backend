import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

let targetUrl;
try {
  targetUrl = new URL(rawUrl);
} catch {
  console.error('DATABASE_URL is not a valid PostgreSQL URL.');
  process.exit(1);
}

if (!['postgres:', 'postgresql:'].includes(targetUrl.protocol)) {
  console.error('DATABASE_URL must use postgres:// or postgresql://');
  process.exit(1);
}

const targetDatabase = decodeURIComponent(targetUrl.pathname.replace(/^\//, ''));
if (!targetDatabase) {
  console.error('DATABASE_URL must include a database name.');
  process.exit(1);
}

if (targetDatabase === 'postgres') {
  console.log('Database "postgres" already exists.');
  process.exit(0);
}

const adminUrl = new URL(targetUrl.toString());
adminUrl.pathname = '/postgres';

// Prisma-only URL options are not needed by the pg driver used here.
adminUrl.searchParams.delete('schema');
adminUrl.searchParams.delete('connection_limit');
adminUrl.searchParams.delete('pool_timeout');

const client = new Client({ connectionString: adminUrl.toString() });

try {
  await client.connect();

  const result = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [targetDatabase],
  );

  if (result.rowCount && result.rowCount > 0) {
    console.log(`Database "${targetDatabase}" already exists.`);
    process.exitCode = 0;
  } else {
    const quotedDatabase = `"${targetDatabase.replaceAll('"', '""')}"`;
    await client.query(`CREATE DATABASE ${quotedDatabase}`);
    console.log(`Database "${targetDatabase}" created.`);
  }
} catch (error) {
  console.error('\nCould not verify/create the PostgreSQL database.');
  console.error('Check that PostgreSQL is running and DATABASE_URL contains valid local credentials.');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
