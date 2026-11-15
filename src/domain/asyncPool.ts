export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  processItem: (item: T, index: number) => Promise<void>,
  shouldStop: () => boolean = () => false
): Promise<void> {
  const workerCount = Math.min(
    items.length,
    Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 1))
  );

  let nextIndex = 0;
  let failed = false;
  let failure: unknown;

  async function worker(): Promise<void> {
    while (!failed && !shouldStop()) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        await processItem(items[index] as T, index);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (failed) throw failure;
}
