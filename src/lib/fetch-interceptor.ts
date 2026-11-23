'use client';

export type FetchBeforeHook = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | null | undefined | Promise<Response | null | undefined>;

export type FetchAfterHook = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  response: Response
) => void | Promise<void>;

export interface FetchInterceptor {
  id: string;
  before?: FetchBeforeHook;
  after?: FetchAfterHook;
}

interface FetchRegistryState {
  nativeFetch: typeof window.fetch;
  interceptors: FetchInterceptor[];
  installed: boolean;
}

const REGISTRY_KEY = '__kunurseFetchRegistry__';

function getRegistry(): FetchRegistryState | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, FetchRegistryState | undefined>;
  if (!win[REGISTRY_KEY]) {
    win[REGISTRY_KEY] = {
      nativeFetch: window.fetch.bind(window),
      interceptors: [],
      installed: false,
    };
  }
  const registry = win[REGISTRY_KEY]!;
  if (!registry.installed) {
    registry.installed = true;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentInterceptors = [...registry.interceptors];
      for (const interceptor of currentInterceptors) {
        if (interceptor.before) {
          const shortCircuit = await interceptor.before(input, init);
          if (shortCircuit instanceof Response) {
            return shortCircuit;
          }
        }
      }

      const response = await registry.nativeFetch(input, init);

      for (const interceptor of currentInterceptors) {
        if (interceptor.after) {
          try {
            await interceptor.after(input, init, response);
          } catch {
            // Never break app fetch pipeline from an after-hook
          }
        }
      }

      return response;
    };
  }
  return registry;
}

/**
 * Registers a fetch interceptor cleanly without overwriting window.fetch on unmount.
 * Returns an idempotent unregister function that removes only this interceptor.
 */
export function registerFetchInterceptor(interceptor: FetchInterceptor): () => void {
  const registry = getRegistry();
  if (!registry) return () => {};

  // Deduplicate by id in case of HMR or re-registration
  registry.interceptors = registry.interceptors.filter((item) => item.id !== interceptor.id);
  registry.interceptors.push(interceptor);

  let unregistered = false;
  return () => {
    if (unregistered) return;
    unregistered = true;
    registry.interceptors = registry.interceptors.filter((item) => item.id !== interceptor.id);
  };
}
