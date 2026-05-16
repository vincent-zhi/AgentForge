export interface FileClaim {
  file: string;
  taskId: string;
  agent: string;
  claimedAt: string;
}

export class FileClaims {
  private readonly claims = new Map<string, FileClaim>();

  claim(file: string, taskId: string, agent: string): FileClaim {
    const existing = this.claims.get(file);
    if (existing && existing.taskId !== taskId) {
      throw new Error(`${file} is already claimed by ${existing.agent} for ${existing.taskId}`);
    }
    const claim = { file, taskId, agent, claimedAt: new Date().toISOString() };
    this.claims.set(file, claim);
    return claim;
  }

  release(file: string): void {
    this.claims.delete(file);
  }

  list(): FileClaim[] {
    return [...this.claims.values()];
  }
}
