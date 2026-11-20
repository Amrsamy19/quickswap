const { createServer, build } = require('vite');
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

async function runDev() {
  const desktopRoot = path.resolve(__dirname, '..');
  process.chdir(desktopRoot);

  console.log('[Quickswap] Compiling Electron main and preload processes...');
  // 1. Build main and preload bundle separately so preload is self-contained without sandbox require errors
  await build({
    configFile: path.resolve(desktopRoot, 'vite.config.main.ts'),
    mode: 'development',
  });
  await build({
    configFile: path.resolve(desktopRoot, 'vite.config.preload.ts'),
    mode: 'development',
  });

  // 2. Start Vite dev server for renderer
  console.log('[Quickswap] Starting Vite development server...');
  const server = await createServer({
    configFile: path.resolve(desktopRoot, 'vite.config.ts'),
    mode: 'development',
  });

  await server.listen();
  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devServerUrl = `http://localhost:${port}`;
  console.log(`[Quickswap] Vite dev server listening at ${devServerUrl}`);

  // 3. Launch Electron desktop application
  console.log('[Quickswap] Launching Quickswap desktop application window...');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.NODE_ENV = 'development';
  env.ELECTRON_RENDERER_URL = devServerUrl;

  const electronProcess = spawn(electron, ['.'], {
    cwd: desktopRoot,
    env,
    stdio: 'inherit',
  });

  electronProcess.on('close', async (code) => {
    console.log(`[Quickswap] Desktop application closed (code ${code || 0}).`);
    try {
      await server.close();
    } catch {}
    process.exit(code || 0);
  });

  process.on('SIGINT', async () => {
    try {
      electronProcess.kill();
      await server.close();
    } catch {}
    process.exit(0);
  });
}

runDev().catch((err) => {
  console.error('[Quickswap] Failed to start development application:', err);
  process.exit(1);
});
