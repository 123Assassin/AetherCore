#!/usr/bin/env node

import { spawn } from 'node:child_process';

const [, , defaultPort, ...rawArgs] = process.argv;

if (!defaultPort) {
  console.error('Usage: next-dev-with-default-port.mjs <default-port> [next-dev-args...]');
  process.exit(1);
}

const forwardedArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const hasPortOverride = forwardedArgs.some(
  (arg) => arg === '-p' || arg === '--port' || arg.startsWith('--port=') || arg.startsWith('-p=')
);
const nextArgs = ['dev', ...(hasPortOverride ? forwardedArgs : ['-p', defaultPort, ...forwardedArgs])];
const command = process.platform === 'win32' ? 'next.cmd' : 'next';
const child = spawn(command, nextArgs, { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
