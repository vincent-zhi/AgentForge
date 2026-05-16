import type { ModuleRef, TestCommand } from '@/types/core';

export function recommendTests(affectedModules: ModuleRef[], testMapping: TestCommand[]): TestCommand[] {
  const moduleNames = new Set(affectedModules.map((m) => m.name));
  const recommended = testMapping.filter((tc) => moduleNames.has(tc.module));
  const seen = new Set<string>();
  return recommended.filter((tc) => {
    const key = `${tc.command}:${tc.module}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
