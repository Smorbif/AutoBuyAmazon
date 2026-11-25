import { spawn, spawnSync } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data');
const port = Number(process.env.KEEP_BUY_PORT || process.env.PORT || 8787);
const dashboardUrl = `http://127.0.0.1:${port}`;
await mkdir(dataDir, { recursive: true });

if (Number(process.versions.node.split('.')[0]) < 20) {
  throw new Error('Serve Node.js 20 o superiore.');
}

function runPackageCommand(command, args) {
  const windows = process.platform === 'win32';
  const executable = windows ? (process.env.ComSpec || 'cmd.exe') : command;
  const executableArgs = windows ? ['/d', '/s', '/c', `${command} ${args.join(' ')}`] : args;
  console.log(`Eseguo: ${command} ${args.join(' ')}`);
  const result = spawnSync(executable, executableArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Il comando ${command} è terminato con codice ${result.status}.`);
}

try {
  await access(path.join(projectRoot, 'node_modules', 'playwright', 'package.json'));
  await access(path.join(projectRoot, 'node_modules', 'teleproto', 'package.json'));
  await access(path.join(projectRoot, 'node_modules', 'dotenv', 'package.json'));
} catch {
  runPackageCommand('npm', ['install']);
}

const { chromium } = await import('playwright');
try {
  await access(chromium.executablePath());
} catch {
  runPackageCommand('npx', ['playwright', 'install', 'chromium']);
}

async function dashboardIsReady() {
  try {
    const response = await fetch(`${dashboardUrl}/health`, { signal: AbortSignal.timeout(900) });
    return response.ok;
  } catch {
    return false;
  }
}

if (!(await dashboardIsReady())) {
  const serverLogFd = openSync(path.join(dataDir, 'server.log'), 'a');
  const server = spawn(process.execPath, [path.join(projectRoot, 'src', 'server.mjs')], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', serverLogFd, serverLogFd],
    windowsHide: true
  });
  closeSync(serverLogFd);
  server.unref();

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await dashboardIsReady()) {
      ready = true;
      break;
    }
  }
  if (!ready) throw new Error(`Il pannello non risponde su ${dashboardUrl}. Controlla data/launcher.log e la porta ${port}.`);
}

console.log(`Pannello grafico pronto: ${dashboardUrl}`);
if (process.env.KEEP_BUY_NO_OPEN === '1' && process.platform === 'linux') {
  console.log('Su VPS Linux apri l’indirizzo dal tuo PC tramite un tunnel SSH.');
} else if (process.env.KEEP_BUY_NO_OPEN !== '1' && process.platform === 'win32') {
  const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', dashboardUrl], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  opener.on('error', () => {});
  opener.unref();
} else if (process.env.KEEP_BUY_NO_OPEN !== '1' && process.platform === 'darwin') {
  const opener = spawn('open', [dashboardUrl], { detached: true, stdio: 'ignore' });
  opener.on('error', () => {});
  opener.unref();
} else if (process.env.KEEP_BUY_NO_OPEN !== '1' && (process.env.DISPLAY || process.env.WAYLAND_DISPLAY)) {
  const opener = spawn('xdg-open', [dashboardUrl], { detached: true, stdio: 'ignore' });
  opener.on('error', () => {});
  opener.unref();
} else if (process.platform === 'linux') {
  console.log('Su VPS Linux apri l’indirizzo dal tuo PC tramite un tunnel SSH.');
}
