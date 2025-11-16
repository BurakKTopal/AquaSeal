// Polyfills for Node.js modules used in browser
// This must be imported FIRST before any other modules
import { Buffer } from 'buffer';

// Make Buffer available globally BEFORE any modules load
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;
  
  // Polyfill exports and module for CommonJS compatibility
  if (typeof (globalThis as any).exports === 'undefined') {
    (globalThis as any).exports = {};
  }
  if (typeof (globalThis as any).module === 'undefined') {
    (globalThis as any).module = { exports: (globalThis as any).exports };
  }
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  
  // Polyfill exports and module for CommonJS compatibility
  if (typeof (window as any).exports === 'undefined') {
    (window as any).exports = {};
  }
  if (typeof (window as any).module === 'undefined') {
    (window as any).module = { exports: (window as any).exports };
  }
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

// Ensure exports is available globally (not just on globalThis/window)
// Note: We can't declare global module/exports due to @types/node conflict,
// but runtime assignment works fine
if (typeof (globalThis as any).exports === 'undefined') {
  (globalThis as any).exports = {};
}
if (typeof (globalThis as any).module === 'undefined') {
  (globalThis as any).module = { exports: (globalThis as any).exports };
}

export {};

