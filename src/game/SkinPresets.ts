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
    name: 'STAR_RUNNER',
    description: 'Standard issue scout rocket.',
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
    name: 'NEBULA_X',
    description: 'High-velocity spectrum vessel.',
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
    name: 'SOLAR_FLARE',
    description: 'Aggressive heat-shielded interceptor.',
    requirement: 'SCORE 50+',
    colors: {
      primary: '#ff0055',
      secondary: '#ffffff',
      glow: '#ff0055',
      beak: '#ffffff',
    }
  },
  {
    id: 'GOLD',
    name: 'AUREUM_ORBITER',
    description: 'The ultimate golden orbital chassis.',
    requirement: 'SCORE 150+',
    colors: {
      primary: '#fbbf24',
      secondary: '#ffffff',
      glow: '#fbbf24',
      beak: '#000000',
    }
  },
  {
    id: 'VOID',
    name: 'VOID_NAVIGATOR',
    description: 'Experimental dark-matter propulsion unit.',
    requirement: 'SCORE 100+',
    colors: {
      primary: '#7c3aed',
      secondary: '#ffffff',
      glow: '#c026d3',
      beak: '#00f2ff',
    }
  }
];
