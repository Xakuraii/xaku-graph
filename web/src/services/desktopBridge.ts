export interface DesktopRuntimeInfo {
  core_version: string;
  app_version: string;
  platform: string;
  backend_url: string;
  backend_reachable: boolean;
  managed_backend_pid: number | null;
  backend_dir: string | null;
}

export interface NativeVectorResult {
  cosine_similarity: number;
  euclidean_distance: number;
  dot_product: number;
}

interface TauriInternals {
  invoke?: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

interface TauriGlobalWindow extends Window {
  __TAURI_INTERNALS__?: TauriInternals;
  __TAURI__?: {
    core?: {
      invoke?: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  };
}

const DEFAULT_DESKTOP_API_BASE = 'http://127.0.0.1:8000/api';
const DEFAULT_WEB_API_BASE = '/api';

function getTauriInvoke():
  | (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>)
  | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as TauriGlobalWindow;
  if (typeof win.__TAURI_INTERNALS__?.invoke === 'function') {
    return win.__TAURI_INTERNALS__.invoke.bind(win.__TAURI_INTERNALS__);
  }
  if (typeof win.__TAURI__?.core?.invoke === 'function') {
    return win.__TAURI__.core.invoke.bind(win.__TAURI__.core);
  }
  return null;
}

export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (getTauriInvoke() !== null) {
    return true;
  }
  const { protocol, hostname } = window.location;
  return protocol === 'tauri:' || hostname === 'tauri.localhost';
}

export function resolveApiBase(): string {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const configured = viteEnv?.VITE_API_BASE?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (isTauriDesktop()) {
    return DEFAULT_DESKTOP_API_BASE;
  }
  return DEFAULT_WEB_API_BASE;
}

async function invokeTauriCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    return null;
  }
  return invoke<T>(command, args);
}

export async function getDesktopRuntimeInfo(): Promise<DesktopRuntimeInfo | null> {
  return invokeTauriCommand<DesktopRuntimeInfo>('get_desktop_runtime_info');
}

export async function ensureDesktopBackendRunning(): Promise<DesktopRuntimeInfo | null> {
  return invokeTauriCommand<DesktopRuntimeInfo>('ensure_backend_running');
}

export async function computeVectorSimilarityNative(
  vectorA: number[],
  vectorB: number[]
): Promise<NativeVectorResult | null> {
  return invokeTauriCommand<NativeVectorResult>('compute_vector_similarity_native', {
    vectorA,
    vectorB,
  });
}
