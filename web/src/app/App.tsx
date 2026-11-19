import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { AppLayout, NavModuleId } from '../layouts/AppLayout';
import { StudioOverview } from '../features/overview/StudioOverview';
import { DatasetExplorer } from '../features/datasets/DatasetExplorer';
import { VectorExplorer } from '../features/vectors/VectorExplorer';
import { EmbeddingExplorer } from '../features/embeddings/EmbeddingExplorer';
import { RagPlaceholder } from '../features/rag/RagPlaceholder';
import { MlPlaceholder } from '../features/machine-learning/MlPlaceholder';
import { apiClient } from '../services/apiClient';
import { HealthResponse } from '../types/api';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavModuleId>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await apiClient.getHealth();
        setHealth(data);
      } catch {
        // Backend not currently reachable
        setHealth(null);
      } finally {
        setLoadingHealth(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

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
        return <RagPlaceholder />;
      case 'ml':
        return <MlPlaceholder />;
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
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Header
        health={health}
        loading={loadingHealth}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
      <AppLayout activeModule={activeModule} onSelectModule={setActiveModule}>
        {renderModuleContent()}
      </AppLayout>
    </div>
  );
};

export default App;
