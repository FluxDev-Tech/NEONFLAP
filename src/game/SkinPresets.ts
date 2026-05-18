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
    name: 'PROTO_ALPHA',
    description: 'Standard issue neon scout unit.',
    requirement: 'INTEGRATED',
    colors: {
      primary: '#f0ff00',
      secondary: '#ffffff',
      glow: '#00f2ff',
      beak: '#ff0055',
    }
  },
  {
    id: 'PHASE',
    name: 'PROTO_PHASE',
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
    name: 'PROTO_CRIMSON',
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
    id: 'SILVER',
    name: 'PROTO_SILVER',
    description: 'Elite chrome-plated chassis.',
    requirement: 'SCORE 100+',
    colors: {
      primary: '#e2e8f0',
      secondary: '#ffffff',
      glow: '#ffffff',
      beak: '#000000',
    }
  },
  {
    id: 'VOID',
    name: 'PROTO_VOID',
    description: 'Deep space stealth frame.',
    requirement: '25 MISSIONS',
    colors: {
      primary: '#7c3aed',
      secondary: '#ffffff',
      glow: '#c026d3',
      beak: '#00f2ff',
    }
  }
];
