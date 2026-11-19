import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('plotly.js-dist-min', () => ({
  default: {
    react: vi.fn().mockResolvedValue(undefined),
    newPlot: vi.fn().mockResolvedValue(undefined),
    purge: vi.fn(),
    Plots: {
      resize: vi.fn(),
    },
  },
}));
