export interface SkinProtocol {
  id: string;
  name: string;
  description: string;
  requirement: string;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    beak: string;
  };
}

export const SKIN_PROTOCOLS: SkinProtocol[] = [
  {
    id: 'DEFAULT',
    name: 'CORE_ZERO',
    description: 'Standard issue neon scout unit.',
    requirement: 'INTEGRATED',
    colors: {
      primary: '#00f2ff',
      secondary: '#ffffff',
      glow: '#00f2ff',
      beak: '#ff0055',
    }
  },
  {
    id: 'PHASE',
    name: 'PHANTOM_X',
    description: 'High-visibility spectrum unit.',
    requirement: 'SCORE 20+',
    colors: {
      primary: '#00ffaa',
      secondary: '#ffffff',
      glow: '#00ffaa',
      beak: '#0178ff',
    }
  },
  {
    id: 'CRIMSON',
    name: 'CRIMSON_WING',
    description: 'Aggressive data interceptor.',
    requirement: 'SCORE 50+',
    colors: {
      primary: '#ff0055',
      secondary: '#ffffff',
      glow: '#ff0055',
      beak: '#ffffff',
    }
  },
  {
    id: 'VOID',
    name: 'VOID_WALKER',
    description: 'Experimental dark-matter chassis.',
    requirement: 'SCORE 100+',
    colors: {
      primary: '#7c3aed',
      secondary: '#ffffff',
      glow: '#c026d3',
      beak: '#00f2ff',
    }
  }
];
