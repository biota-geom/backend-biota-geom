import {
  EXTRACTION_JOB_TTL_MS,
  InMemoryExtractionJobStore,
} from './in-memory-extraction-job.store';

describe('InMemoryExtractionJobStore', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts a job as PENDING and returns what was saved', async () => {
    const store = new InMemoryExtractionJobStore();
    const jobId = await store.create('user-1');

    await expect(store.get(jobId, 'user-1')).resolves.toEqual({
      status: 'PENDING',
    });

    await store.save(jobId, { status: 'FAILED', reason: 'TIMEOUT' });

    await expect(store.get(jobId, 'user-1')).resolves.toEqual({
      status: 'FAILED',
      reason: 'TIMEOUT',
    });
  });

  it('hides a job from every user but its owner', async () => {
    const store = new InMemoryExtractionJobStore();
    const jobId = await store.create('user-1');

    await expect(store.get(jobId, 'user-2')).resolves.toBeNull();
  });

  it('answers null for an unknown job', async () => {
    await expect(
      new InMemoryExtractionJobStore().get('nope', 'user-1'),
    ).resolves.toBeNull();
  });

  it('forgets a job after the TTL', async () => {
    const store = new InMemoryExtractionJobStore();
    const jobId = await store.create('user-1');

    jest.advanceTimersByTime(EXTRACTION_JOB_TTL_MS + 1);

    await expect(store.get(jobId, 'user-1')).resolves.toBeNull();
  });

  it('does not resurrect an expired job when the model finishes late', async () => {
    const store = new InMemoryExtractionJobStore();
    const jobId = await store.create('user-1');
    jest.advanceTimersByTime(EXTRACTION_JOB_TTL_MS + 1);
    await store.get(jobId, 'user-1');

    await store.save(jobId, { status: 'FAILED', reason: 'TIMEOUT' });

    await expect(store.get(jobId, 'user-1')).resolves.toBeNull();
  });
});
