// Grafikk-kvalitetsnivå styrer hvor tunge passes/effekter som er aktive.
// Persisteres i localStorage så valget overlever reload.

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface QualityProfile {
  ssao: boolean;
  ssaoHalfRes: boolean;
  ssaoKernelRadius: number;
  bloom: boolean;
  smaa: boolean;
  particles: number;
  shadowMapSize: number;
}

const PROFILES: Record<GraphicsQuality, QualityProfile> = {
  low: {
    ssao: false,
    ssaoHalfRes: true,
    ssaoKernelRadius: 4,
    bloom: true,
    smaa: false,
    particles: 0,
    shadowMapSize: 1024,
  },
  medium: {
    ssao: true,
    ssaoHalfRes: true,
    ssaoKernelRadius: 5,
    bloom: true,
    smaa: true,
    particles: 400,
    shadowMapSize: 2048,
  },
  high: {
    ssao: true,
    ssaoHalfRes: false,
    ssaoKernelRadius: 8,
    bloom: true,
    smaa: true,
    particles: 1200,
    shadowMapSize: 4096,
  },
};

const STORAGE_KEY = 'dnd3d.graphicsQuality';

export function loadGraphicsQuality(): GraphicsQuality {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return 'high';
}

export function saveGraphicsQuality(q: GraphicsQuality): void {
  localStorage.setItem(STORAGE_KEY, q);
}

export function profileFor(q: GraphicsQuality): QualityProfile {
  return PROFILES[q];
}
