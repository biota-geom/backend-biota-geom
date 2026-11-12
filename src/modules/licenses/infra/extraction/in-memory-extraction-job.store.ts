import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ExtractionJob, ExtractionJobStore } from '../../domain/extraction-job';

export const EXTRACTION_JOB_TTL_MS = 15 * 60 * 1000;

interface StoredJob {
  userId: string;
  job: ExtractionJob;
  expiresAt: number;
}

/*
 * Single-instance store: jobs vanish on restart, which the client treats like
 * any other failed extraction (manual form). Expired jobs are dropped lazily
 * on every access, so no timer is needed.
 */
@Injectable()
export class InMemoryExtractionJobStore extends ExtractionJobStore {
  private readonly jobs = new Map<string, StoredJob>();

  create(userId: string): Promise<string> {
    this.evictExpired();
    const jobId = randomUUID();
    this.jobs.set(jobId, {
      userId,
      job: { status: 'PENDING' },
      expiresAt: Date.now() + EXTRACTION_JOB_TTL_MS,
    });

    return Promise.resolve(jobId);
  }

  get(jobId: string, userId: string): Promise<ExtractionJob | null> {
    this.evictExpired();
    const stored = this.jobs.get(jobId);

    return Promise.resolve(stored?.userId === userId ? stored.job : null);
  }

  save(jobId: string, job: ExtractionJob): Promise<void> {
    const stored = this.jobs.get(jobId);
    // Already expired while the model was running: nobody can poll it anymore.
    if (stored) stored.job = job;

    return Promise.resolve();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [jobId, { expiresAt }] of this.jobs) {
      if (expiresAt <= now) this.jobs.delete(jobId);
    }
  }
}
