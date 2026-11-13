const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const env = { ...process.env };
// Ensure Electron always starts in full desktop GUI mode, even if parent environment set ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env,
  cwd: path.resolve(__dirname, '..'),
});

child.on('close', (code) => {
  process.exit(code || 0);
});
