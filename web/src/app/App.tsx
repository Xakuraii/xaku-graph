import React, { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { AppLayout, NavModuleId } from '../layouts/AppLayout';
import { StudioOverview } from '../features/overview/StudioOverview';
import { DatasetExplorer } from '../features/datasets/DatasetExplorer';
import { VectorExplorer } from '../features/vectors/VectorExplorer';
import { EmbeddingExplorer } from '../features/embeddings/EmbeddingExplorer';
import { RagExplorer } from '../features/rag/RagExplorer';
import { MlExplorer } from '../features/machine-learning/MlExplorer';
import { apiClient } from '../services/apiClient';
import {
  ensureDesktopBackendRunning,
  isTauriDesktop,
} from '../services/desktopBridge';
import { HealthResponse } from '../types/api';

function getInitialTheme(): boolean {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return document.documentElement.classList.contains('dark');
}

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavModuleId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const checkHealth = useCallback(async () => {
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch {
      if (isTauriDesktop()) {
        try {
          await ensureDesktopBackendRunning();
          const data = await apiClient.getHealth();
          setHealth(data);
          return;
        } catch {
          // Backend auto-recovery failed; fall through to disconnected state
        }
      }
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(() => void checkHealth(), 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleRetryBackend = useCallback(() => {
    setLoadingHealth(true);
    void checkHealth();
  }, [checkHealth]);

  const handleThemeChange = useCallback((nextTheme: 'light' | 'dark') => {
    const nextIsDark = nextTheme === 'dark';
    setIsDark(nextIsDark);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview':
        return (
          <StudioOverview
            health={health}
            onNavigate={(mod) => setActiveModule(mod)}
          />
        );
      case 'datasets':
        return <DatasetExplorer isDark={isDark} />;
      case 'vectors':
        return <VectorExplorer isDark={isDark} />;
      case 'embeddings':
        return <EmbeddingExplorer isDark={isDark} />;
      case 'rag':
        return <RagExplorer isDark={isDark} />;
      case 'ml':
        return <MlExplorer isDark={isDark} />;
      default:
        return (
          <StudioOverview
            health={health}
            onNavigate={(mod) => setActiveModule(mod)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header
        health={health}
        loading={loadingHealth}
        isDark={isDark}
        onThemeChange={handleThemeChange}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onRetryBackend={isTauriDesktop() ? handleRetryBackend : undefined}
      />
      <AppLayout
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      >
        {renderModuleContent()}
      </AppLayout>
    </div>
  );
};

export default App;
