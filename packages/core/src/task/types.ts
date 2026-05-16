import type { ImpactMap } from '../impact/types.js';
import type { ContextLease } from '../runtime/types.js';

export interface TaskCapsule {
  taskId: string;
  goal: string;
  spec: string;
  plan: string[];
  impactMap: ImpactMap;
  leases: ContextLease[];
  requiredTests: string[];
  reviewFocus: string[];
}
