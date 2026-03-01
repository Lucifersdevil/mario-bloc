import { LevelEntity } from './types';

// Helper to create platforms easily
const p = (x: number, y: number, w: number, h: number, color = '#a855f7'): LevelEntity => ({
  type: 'platform', x, y, w, h, color
});

const c = (x: number, y: number): LevelEntity => ({
  type: 'coin', x, y, w: 20, h: 20, color: '#facc15'
});

const h = (x: number, y: number, w: number = 32): LevelEntity => ({
  type: 'hazard', x, y, w, h: 32, color: '#ef4444'
});

const g = (x: number, y: number): LevelEntity => ({
  type: 'goal', x, y, w: 40, h: 60, color: '#ffffff'
});

export const levels: LevelEntity[][] = [
  [
    // Floor
    p(0, 500, 1000, 50, '#3b82f6'),
    
    // Platforms
    p(300, 400, 100, 20, '#d946ef'),
    p(500, 300, 100, 20, '#d946ef'),
    p(700, 200, 100, 20, '#d946ef'),
    
    // Coins
    c(340, 360),
    c(540, 260),
    c(740, 160),
    c(800, 450),
    
    // Hazards
    h(600, 468, 64),
    
    // More floor
    p(1200, 500, 800, 50, '#3b82f6'),
    
    // Stairs
    p(1300, 450, 50, 20, '#10b981'),
    p(1400, 400, 50, 20, '#10b981'),
    p(1500, 350, 50, 20, '#10b981'),
    
    // Big jump
    p(1700, 300, 200, 20, '#f43f5e'),
    c(1800, 250),
    
    // Goal
    p(2100, 500, 200, 50, '#3b82f6'),
    g(2200, 440),
  ]
];
