import { mkdir, symlink, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const scope = resolve('node_modules/@agentforge');
await mkdir(scope, { recursive: true });
for (const name of ['core', 'runtime', 'tools', 'ui']) {
  const link = resolve(scope, name);
  await rm(link, { recursive: true, force: true });
  await symlink(resolve('packages', name), link, 'dir');
}
