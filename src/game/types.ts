export type Vector = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export interface Entity extends Rect {
  vx: number;
  vy: number;
  color: string;
  type: 'player' | 'platform' | 'hazard' | 'coin' | 'goal' | 'particle';
  id: string;
}

export type LevelEntity = Omit<Entity, 'id' | 'vx' | 'vy'>;

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}

export interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onGameOver: () => void;
  onWin: () => void;
}

export const GRAVITY = 0.9;
export const FRICTION = 0.8;
export const MOVE_SPEED = 1.2;
export const JUMP_FORCE = -18;
export const MAX_SPEED = 12;
