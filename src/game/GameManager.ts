import Matter from 'matter-js';
import { soundManager } from './SoundManager';

export enum GameState {
  START,
  PLAYING,
  PAUSED,
  GAME_OVER,
  WIN
}

export class GameManager {
  public engine: Matter.Engine;
  public world: Matter.World;
  public runner: Matter.Runner;
  public player: Matter.Body | null = null;
  public gravityDirection: number = 1;
  public score: number = 0;
  public gameState: GameState = GameState.START;
  
  private onStateChange: (state: GameState) => void;
  private onScoreChange: (score: number) => void;
  private obstacles: Matter.Body[] = [];
  private collectibles: Matter.Body[] = [];

  constructor(onStateChange: (state: GameState) => void, onScoreChange: (score: number) => void) {
    this.onStateChange = onStateChange;
    this.onScoreChange = onScoreChange;
    
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 }
    });
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();
    this.setupCollisions();
  }

  private setupCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      if (this.gameState !== GameState.PLAYING) return;
      
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('player')) {
          if (labels.includes('obstacle') || labels.includes('ground')) {
            this.setGameState(GameState.GAME_OVER);
            soundManager.playGameOver();
          }
          if (labels.includes('collectible')) {
            const token = pair.bodyA.label === 'collectible' ? pair.bodyA : pair.bodyB;
            Matter.World.remove(this.world, token);
            this.score += 50; 
            this.onScoreChange(this.score);
            soundManager.playCollect();
          }
          if (labels.includes('pipe_score')) {
             const trigger = pair.bodyA.label === 'pipe_score' ? pair.bodyA : pair.bodyB;
             trigger.isSensor = false; 
             Matter.World.remove(this.world, trigger);
             this.score += 10;
             this.onScoreChange(this.score);
             soundManager.playFlip(); 
          }
          if (labels.includes('win')) {
            this.setGameState(GameState.WIN);
            soundManager.playWin();
          }
        }
      });
    });
  }

  public init(width: number, height: number) {
    // Teardown existing world safely
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    
    this.obstacles = [];
    this.collectibles = [];
    this.score = 0;
    this.onScoreChange(this.score);
    this.gravityDirection = 1;
    this.engine.gravity.y = 1.0; 
    
    // Player (Rocket) - Using a circle for smoother physics
    this.player = Matter.Bodies.circle(100, height / 2, 22, {
      friction: 0,
      frictionAir: 0.045, 
      restitution: 0.1, 
      density: 0.001,
      label: 'player'
    });
    
    // Bounds (Floor/Ceiling)
    const worldWidth = width * 200; 
    const ground = Matter.Bodies.rectangle(worldWidth / 2, height + 60, worldWidth, 120, { 
      isStatic: true, 
      label: 'ground',
      friction: 1
    });
    const ceiling = Matter.Bodies.rectangle(worldWidth / 2, -60, worldWidth, 120, { 
      isStatic: true, 
      label: 'ground',
      friction: 1
    });
    
    Matter.World.add(this.world, [this.player, ground, ceiling]);

    // Level Generation - Pipes
    const gapSize = Math.min(340, Math.max(260, height * 0.44)); 
    const pipeSpacing = 950;
    const pipeCount = 180;

    for (let i = 0; i < pipeCount; i++) {
        const x = 1000 + i * pipeSpacing; 
        const minH = 100;
        const maxH = height - gapSize - minH;
        const topPipeH = minH + Math.random() * maxH;
        
        // Dynamic pipe sizing
        const topPipe = Matter.Bodies.rectangle(x, topPipeH / 2, 85, topPipeH, { 
            isStatic: true, 
            label: 'obstacle'
        });
        
        const bottomPipeH = height - topPipeH - gapSize;
        const bottomPipe = Matter.Bodies.rectangle(x, height - bottomPipeH / 2, 85, bottomPipeH, { 
            isStatic: true, 
            label: 'obstacle'
        });

        this.obstacles.push(topPipe, bottomPipe);
        Matter.World.add(this.world, [topPipe, bottomPipe]);

        // Score trigger
        const scoreTrigger = Matter.Bodies.rectangle(x, topPipeH + gapSize/2, 30, gapSize, {
            isStatic: true,
            isSensor: true,
            label: 'pipe_score'
        });
        Matter.World.add(this.world, scoreTrigger);

        // Collectibles
        if (Math.random() > 0.7) { 
            const collX = x + pipeSpacing / 2;
            const collY = (height / 2) + (Math.random() - 0.5) * (height * 0.6);
            const coll = Matter.Bodies.circle(collX, collY, 16, {
                isStatic: true,
                isSensor: true,
                label: 'collectible'
            });
            this.collectibles.push(coll);
            Matter.World.add(this.world, coll);
        }
    }

    // Win trigger at the end of the long corridor
    const winX = 900 + pipeCount * pipeSpacing + 1200;
    const winTrigger = Matter.Bodies.rectangle(winX, height / 2, 150, height, {
        isStatic: true,
        isSensor: true,
        label: 'win'
    });
    Matter.World.add(this.world, winTrigger);
  }

  public setGameState(state: GameState) {
    if (this.gameState === state) return;
    this.gameState = state;
    this.onStateChange(state);
  }

  public thrust() {
    if (this.gameState !== GameState.PLAYING || !this.player) return;
    // Consistent, predictable jump
    Matter.Body.setVelocity(this.player, { x: this.player.velocity.x, y: -8.8 });
  }

  public step(delta: number) {
    if (this.gameState === GameState.PLAYING && this.player) {
      // Slower speed progression
      const baseSpeed = 4.0; 
      const maxSpeedBonus = 4.0;
      const speedIncrease = Math.min(maxSpeedBonus, this.score / 800);
      const currentSpeed = baseSpeed + speedIncrease;

      // Lock forward velocity
      Matter.Body.setVelocity(this.player, { x: currentSpeed, y: this.player.velocity.y });
      
      // Infinite fall/rise protection
      if (this.player.position.y > 3000 || this.player.position.y < -1500) {
          this.setGameState(GameState.GAME_OVER);
          soundManager.playGameOver();
      }

      // Update physical world
      Matter.Engine.update(this.engine, delta);
    }
  }
}
