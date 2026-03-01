import { Entity, GameCallbacks, GRAVITY, FRICTION, MOVE_SPEED, JUMP_FORCE, MAX_SPEED, Particle, Rect } from './types';
import { levels } from './levels';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GameCallbacks;
  
  player: Entity;
  entities: Entity[] = [];
  particles: Particle[] = [];
  
  keys: { [key: string]: boolean } = {};
  running: boolean = false;
  animationId: number = 0;
  
  camera: { x: number; y: number } = { x: 0, y: 0 };
  score: number = 0;
  levelIndex: number = 0;
  
  // Mobile touch controls
  touchStartX: number = 0;
  touchStartY: number = 0;

  // Effects
  shake: number = 0;

  // Dash state
  canDash: boolean = true;
  dashCooldown: number = 0;
  isDashing: boolean = false;
  dashTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!; 
    this.callbacks = callbacks;
    
    this.player = this.createPlayer();
    
    this.resize();
    this.setupInput();
  }

  createPlayer(): Entity {
    return {
      id: 'player',
      type: 'player',
      x: 100,
      y: 300,
      w: 32,
      h: 32,
      vx: 0,
      vy: 0,
      color: '#22d3ee', // Cyan-400
    };
  }

  setupInput() {
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    
    // Touch controls
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      
      // Jump on tap upper screen
      if (touch.clientY < window.innerHeight / 2) {
        this.keys['Space'] = true;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const diffX = touch.clientX - this.touchStartX;
      
      if (diffX > 20) {
        this.keys['ArrowRight'] = true;
        this.keys['ArrowLeft'] = false;
      } else if (diffX < -20) {
        this.keys['ArrowLeft'] = true;
        this.keys['ArrowRight'] = false;
      } else {
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.keys['ArrowLeft'] = false;
      this.keys['ArrowRight'] = false;
      this.keys['Space'] = false;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.draw(); // Redraw immediately on resize
  }

  reset() {
    this.score = 0;
    this.callbacks.onScoreChange(0);
    this.loadLevel(0);
    this.player = this.createPlayer();
    this.particles = [];
    this.start();
  }

  loadLevel(index: number) {
    this.levelIndex = index;
    const level = levels[index % levels.length];
    
    this.entities = level.map((e, i) => ({
      ...e,
      id: `entity-${i}`,
      vx: 0,
      vy: 0,
    }));
    
    // Reset player position
    this.player.x = 100;
    this.player.y = 300;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.loop();
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  loop() {
    if (!this.running) return;
    
    this.update();
    this.draw();
    
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Player Movement
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.player.vx += MOVE_SPEED;
    }
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.player.vx -= MOVE_SPEED;
    }
    
    // Jump
    if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.player.vy === 0 && this.isGrounded()) {
      this.player.vy = JUMP_FORCE;
      this.createParticles(this.player.x + this.player.w/2, this.player.y + this.player.h, '#ffffff', 5);
    }

    // Dash
    if ((this.keys['ShiftLeft'] || this.keys['KeyK']) && this.canDash && !this.isDashing) {
      this.isDashing = true;
      this.canDash = false;
      this.dashTimer = 10;
      this.dashCooldown = 60;
      
      // Dash direction
      const dir = this.player.vx > 0 ? 1 : (this.player.vx < 0 ? -1 : 1);
      this.player.vx = dir * 20; // Dash speed
      this.player.vy = 0; // Defy gravity during dash
      
      this.shake = 10; // Screen shake on dash
      this.createParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, '#22d3ee', 10);
    }

    if (this.isDashing) {
      this.dashTimer--;
      this.player.vy = 0; // Keep defying gravity
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.player.vx *= 0.5; // Slow down after dash
      }
    } else {
      // Normal Physics
      this.player.vx *= FRICTION;
      this.player.vy += GRAVITY;
    }

    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.isGrounded()) this.canDash = true; // Reset dash on ground

    // Cap speed (unless dashing)
    if (!this.isDashing) {
      this.player.vx = Math.max(Math.min(this.player.vx, MAX_SPEED), -MAX_SPEED);
    }
    
    // Apply velocity
    this.player.x += this.player.vx;
    this.handleCollisions('x');
    this.player.y += this.player.vy;
    this.handleCollisions('y');

    // Camera follow
    const targetCamX = this.player.x - this.canvas.width / 3;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    
    // Death check (fall off world)
    if (this.player.y > 2000) {
      this.callbacks.onGameOver();
      this.stop();
    }

    // Update shake
    if (this.shake > 0) this.shake *= 0.9;
    if (this.shake < 0.5) this.shake = 0;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  isGrounded(): boolean {
    // Simple check: simulate moving down 1 pixel and check collision
    const testRect = { ...this.player, y: this.player.y + 1 };
    return this.entities.some(e => 
      (e.type === 'platform') && 
      this.checkRectCollision(testRect, e)
    );
  }

  handleCollisions(axis: 'x' | 'y') {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      
      if (this.checkRectCollision(this.player, e)) {
        if (e.type === 'platform') {
          if (axis === 'x') {
            if (this.player.vx > 0) {
              this.player.x = e.x - this.player.w;
            } else if (this.player.vx < 0) {
              this.player.x = e.x + e.w;
            }
            this.player.vx = 0;
          } else {
            if (this.player.vy > 0) {
              if (this.player.vy > 10) this.shake = 5; // Shake on hard landing
              this.player.y = e.y - this.player.h;
              this.player.vy = 0; // Landed
            } else if (this.player.vy < 0) {
              this.player.y = e.y + e.h;
              this.player.vy = 0; // Hit head
            }
          }
        } else if (e.type === 'coin') {
          this.score += 100;
          this.callbacks.onScoreChange(this.score);
          this.createParticles(e.x + e.w/2, e.y + e.h/2, e.color, 10);
          this.entities.splice(i, 1); // Remove coin
        } else if (e.type === 'hazard') {
          this.createParticles(this.player.x, this.player.y, '#ef4444', 20);
          this.shake = 20;
          this.callbacks.onGameOver();
          this.stop();
        } else if (e.type === 'goal') {
          this.createParticles(this.player.x, this.player.y, '#22d3ee', 30);
          this.callbacks.onWin();
          this.stop();
        }
      }
    }
  }

  checkRectCollision(r1: Rect, r2: Rect): boolean {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  createParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: `p-${Math.random()}`,
        type: 'particle',
        x,
        y,
        w: Math.random() * 4 + 2,
        h: Math.random() * 4 + 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color,
        life: 30 + Math.random() * 20,
        maxLife: 50
      });
    }
  }

  draw() {
    // Clear background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    
    // Camera transform with shake
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
    
    // Draw Grid (Aesthetic background)
    this.drawGrid();

    // Draw Entities
    this.entities.forEach(e => this.drawEntity(e));
    
    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.w, p.h);
      this.ctx.globalAlpha = 1;
    });

    // Draw Player
    this.drawPlayer();

    this.ctx.restore();
  }

  drawGrid() {
    const gridSize = 100;
    const offsetX = this.camera.x % gridSize;
    const offsetY = this.camera.y % gridSize;
    
    this.ctx.strokeStyle = '#222';
    this.ctx.lineWidth = 1;
    
    const startX = this.camera.x - offsetX;
    const startY = this.camera.y - offsetY;
    
    for (let x = startX; x < this.camera.x + this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.camera.y);
      this.ctx.lineTo(x, this.camera.y + this.canvas.height);
      this.ctx.stroke();
    }
    
    // Horizontal lines (parallax effect could be added here, but simple for now)
    // Actually let's just draw a few horizon lines
    this.ctx.beginPath();
    this.ctx.moveTo(this.camera.x, 500);
    this.ctx.lineTo(this.camera.x + this.canvas.width, 500);
    this.ctx.stroke();
  }

  drawEntity(e: Entity) {
    this.ctx.fillStyle = e.color;
    
    if (e.type === 'platform') {
      // Neon glow effect
      this.ctx.shadowColor = e.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(e.x, e.y, e.w, e.h);
      this.ctx.shadowBlur = 0;
      
      // Border
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(e.x, e.y, e.w, e.h);
    } else if (e.type === 'coin') {
      this.ctx.beginPath();
      this.ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2, 0, Math.PI * 2);
      this.ctx.fill();
      // Float animation
      const floatY = Math.sin(Date.now() / 200) * 5;
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px monospace';
      this.ctx.fillText('$', e.x + 6, e.y + 20 + floatY);
    } else if (e.type === 'hazard') {
      // Spikes
      this.ctx.beginPath();
      this.ctx.moveTo(e.x, e.y + e.h);
      this.ctx.lineTo(e.x + e.w/2, e.y);
      this.ctx.lineTo(e.x + e.w, e.y + e.h);
      this.ctx.fill();
    } else if (e.type === 'goal') {
      this.ctx.shadowColor = '#fff';
      this.ctx.shadowBlur = 20;
      this.ctx.fillRect(e.x, e.y, e.w, e.h);
      this.ctx.shadowBlur = 0;
      
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 14px monospace';
      this.ctx.fillText('WIN', e.x + 5, e.y + 25);
    }
  }

  drawPlayer() {
    const { x, y, w, h, color, vx, vy } = this.player;
    
    // Trail effect (simple)
    if (this.isDashing) {
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(x - vx, y, w, h);
      this.ctx.fillRect(x - vx * 2, y, w, h);
      this.ctx.globalAlpha = 1;
    } else {
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillRect(x - vx * 2, y - vy * 2, w, h);
      this.ctx.globalAlpha = 1;
    }

    // Main body
    this.ctx.fillStyle = this.canDash ? color : '#555'; // Grey out if no dash
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = this.isDashing ? 30 : 15;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.shadowBlur = 0;

    // Eyes (cute/aesthetic factor)
    this.ctx.fillStyle = 'black';
    if (vx > 0) {
      this.ctx.fillRect(x + 20, y + 8, 4, 8);
      this.ctx.fillRect(x + 26, y + 8, 4, 8);
    } else if (vx < 0) {
      this.ctx.fillRect(x + 2, y + 8, 4, 8);
      this.ctx.fillRect(x + 8, y + 8, 4, 8);
    } else {
      this.ctx.fillRect(x + 8, y + 8, 4, 8);
      this.ctx.fillRect(x + 20, y + 8, 4, 8);
    }
    
    // Sweat drop if falling fast
    if (vy > 10) {
      this.ctx.fillStyle = '#0ea5e9';
      this.ctx.beginPath();
      this.ctx.arc(x + w + 5, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
