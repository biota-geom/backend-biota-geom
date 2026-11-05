import { LicenseExtraction } from './license-extraction';

export type ExtractionFailureReason = 'UNREADABLE' | 'UNAVAILABLE' | 'TIMEOUT';

export type ExtractionJob =
  | { status: 'PENDING' }
  | { status: 'DONE'; extraction: LicenseExtraction }
  | { status: 'FAILED'; reason: ExtractionFailureReason };

/*
 * Where extraction jobs live between the upload and the client's last poll.
 * Jobs are scoped to the user that started them: `get` answers null for an
 * unknown, expired or foreign job alike, so a job id never leaks across users.
 * Swap the in-memory implementation for a table/Redis if the backend ever runs
 * on more than one instance.
 */
export abstract class ExtractionJobStore {
  abstract create(userId: string): Promise<string>;
  abstract get(jobId: string, userId: string): Promise<ExtractionJob | null>;
  abstract save(jobId: string, job: ExtractionJob): Promise<void>;
}
