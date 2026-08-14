import { existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function ask(rl, question, defaultValue = '') {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const value = (await rl.question(`${question}${suffix}: `)).trim();
  return value || defaultValue;
}

if (!existsSync('.env')) {
  if (!input.isTTY) {
    console.error('.env does not exist and setup is running without an interactive terminal.');
    console.error('Create .env from .env.example before running setup.');
    process.exit(1);
  }

  console.log('No .env found. Configure your local PostgreSQL connection.\n');
  const rl = createInterface({ input, output });

  try {
    const host = await ask(rl, 'PostgreSQL host', 'localhost');
    const port = await ask(rl, 'PostgreSQL port', '5432');
    const user = await ask(rl, 'PostgreSQL user', 'postgres');
    const password = await ask(rl, 'PostgreSQL password');
    const database = await ask(rl, 'Database name', 'legacylift');

    const url = new URL('postgresql://localhost');
    url.hostname = host;
    url.port = port;
    url.username = user;
    url.password = password;
    url.pathname = `/${database}`;

    const env = [
      'NODE_ENV=development',
      '',
      'PORT=3001',
      'FRONTEND_URL=http://localhost:3000',
      '',
      `DATABASE_URL="${url.toString()}"`,
      '',
    ].join('\n');

    writeFileSync('.env', env, { encoding: 'utf8', flag: 'wx' });
    console.log('\nCreated .env for this machine.');
  } finally {
    rl.close();
  }
} else {
  console.log('Existing .env preserved.');
}

try {
  execSync('npm run db:setup', {
    stdio: 'inherit',
    shell: true,
  });
} catch (error) {
  process.exit(typeof error?.status === 'number' ? error.status : 1);
}

console.log('\nLegacyLift backend setup completed.');
console.log('Run: npm run start:dev');
