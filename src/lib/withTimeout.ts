/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, the returned promise rejects with a TimeoutError.
 *
 * Use this around any Supabase auth call that can hang indefinitely
 * (signIn, signOut, signUp, getSession, updateUser, etc.).
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${Math.round(ms / 1000)}s. Please try again.`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_res, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
