// Minimal ambient types for the node built-ins this test uses (the project has no @types/node).
declare module 'node:fs' {
  interface Buf {
    readUInt32LE(offset: number): number;
    readUInt8(offset: number): number;
    subarray(start: number, end?: number): { toString(enc: string): string };
  }
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Buf;
  export function readFileSync(path: string, enc: string): string;
  export function statSync(path: string): { size: number };
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
declare const process: { cwd(): string; env: Record<string, string | undefined> };
