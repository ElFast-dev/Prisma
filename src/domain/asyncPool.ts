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


/** Comparte una promesa mientras una operación con la misma clave sigue en curso. */
export function shareInFlight<T>(
  requests: Map<string, Promise<T>>,
  key: string,
  create: () => Promise<T>
): Promise<T> {
  const existing = requests.get(key);
  if (existing) return existing;

  const request = Promise.resolve().then(create);
  requests.set(key, request);
  const clear = () => {
    if (requests.get(key) === request) requests.delete(key);
  };
  void request.then(clear, clear);
  return request;
}
