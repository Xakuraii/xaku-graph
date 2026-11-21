import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/apiClient';
import {
  computeVectorSimilarityNative,
  ensureDesktopBackendRunning,
  getDesktopRuntimeInfo,
  isTauriDesktop,
  resolveApiBase,
} from '../src/services/desktopBridge';

interface MutableTauriWindow extends Window {
  __TAURI_INTERNALS__?: {
    invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
}

describe('desktopBridge & dynamic API base', () => {
  const originalLocation = window.location;

  afterEach(() => {
    const win = window as MutableTauriWindow;
    delete win.__TAURI_INTERNALS__;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('defaults to relative /api in standard browser sessions', () => {
    expect(isTauriDesktop()).toBe(false);
    expect(resolveApiBase()).toBe('/api');
  });

  it('detects Tauri desktop runtime on tauri.localhost and routes API calls to local engine', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('http://tauri.localhost/'),
    });

    expect(isTauriDesktop()).toBe(true);
    expect(resolveApiBase()).toBe('http://127.0.0.1:8000/api');
  });

  it('invokes Tauri IPC commands when __TAURI_INTERNALS__.invoke is injected', async () => {
    const invokeMock = vi
      .fn()
      .mockResolvedValueOnce({
        core_version: '1.0.0',
        app_version: '1.0.0',
        platform: 'windows',
        backend_url: 'http://127.0.0.1:8000',
        backend_reachable: true,
        managed_backend_pid: 4242,
        backend_dir: 'D:\\Project\\backend',
      })
      .mockResolvedValueOnce({
        core_version: '1.0.0',
        app_version: '1.0.0',
        platform: 'windows',
        backend_url: 'http://127.0.0.1:8000',
        backend_reachable: true,
        managed_backend_pid: 4242,
        backend_dir: 'D:\\Project\\backend',
      })
      .mockResolvedValueOnce({
        cosine_similarity: 1,
        euclidean_distance: 0,
        dot_product: 5,
      });

    (window as MutableTauriWindow).__TAURI_INTERNALS__ = {
      invoke: invokeMock,
    };

    expect(isTauriDesktop()).toBe(true);
    expect(resolveApiBase()).toBe('http://127.0.0.1:8000/api');

    const runtimeInfo = await getDesktopRuntimeInfo();
    expect(runtimeInfo?.managed_backend_pid).toBe(4242);

    const ensured = await ensureDesktopBackendRunning();
    expect(ensured?.backend_reachable).toBe(true);

    const nativeResult = await computeVectorSimilarityNative([1, 2], [1, 2]);
    expect(nativeResult?.dot_product).toBe(5);

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'get_desktop_runtime_info', undefined);
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'ensure_backend_running', undefined);
    expect(invokeMock).toHaveBeenNthCalledWith(3, 'compute_vector_similarity_native', {
      vectorA: [1, 2],
      vectorB: [1, 2],
    });
  });

  it('routes apiClient.getHealth to localhost:8000 inside Tauri desktop shell', async () => {
    (window as MutableTauriWindow).__TAURI_INTERNALS__ = {
      invoke: vi.fn(),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        app: 'XakuGraph',
        version: '1.0.0',
        rust_core_active: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const health = await apiClient.getHealth();
    expect(health.status).toBe('healthy');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
