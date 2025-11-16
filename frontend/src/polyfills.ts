// Polyfills for Node.js modules used in browser
// This must be imported FIRST before any other modules
import { Buffer } from 'buffer';

// Make Buffer available globally BEFORE any modules load
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
}

// Ensure process is defined with all necessary properties
const processPolyfill = {
  env: {},
  browser: true,
  version: '',
  versions: {},
  nextTick: (fn: Function) => setTimeout(fn, 0),
  platform: 'browser',
  argv: [],
  cwd: () => '/',
};

if (typeof globalThis !== 'undefined') {
  (globalThis as any).process = processPolyfill;
}

if (typeof window !== 'undefined') {
  (window as any).process = processPolyfill;
}

// Ensure process exists globally
if (typeof process === 'undefined') {
  (globalThis as any).process = processPolyfill;
} else {
  Object.assign(process, processPolyfill);
}

export {};

