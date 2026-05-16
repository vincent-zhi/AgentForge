import { rm } from 'node:fs/promises';

const paths = [
  'apps/desktop/dist',
  'packages/core/dist',
  'packages/runtime/dist',
  'packages/tools/dist',
  'packages/ui/dist',
  'tsconfig.tsbuildinfo'
];

await Promise.all(paths.map((path) => rm(path, { recursive: true, force: true })));
