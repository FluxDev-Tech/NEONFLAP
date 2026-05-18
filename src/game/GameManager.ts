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
    Matter.World.clear(this.world, false);
    this.obstacles = [];
    this.collectibles = [];
    this.score = 0;
    this.onScoreChange(this.score);
    this.gravityDirection = 1;
    this.engine.gravity.y = 1.0; 
    
    // Player (Bird) - Using a circle for smoother physics and less 'boxy' collisions
    this.player = Matter.Bodies.circle(100, height / 2, 22, {
      friction: 0,
      frictionAir: 0.05, 
      restitution: 0.2, 
      density: 0.001,
      label: 'player'
    });
    
    // Bounds (Floor/Ceiling)
    const ground = Matter.Bodies.rectangle(width / 2, height + 60, width * 200, 120, { isStatic: true, label: 'ground' });
    const ceiling = Matter.Bodies.rectangle(width / 2, -60, width * 200, 120, { isStatic: true, label: 'ground' });
    
    Matter.World.add(this.world, [this.player, ground, ceiling]);

    // Create flappy pipes with dynamic gaps for various screen heights
    const gapSize = Math.min(320, Math.max(220, height * 0.42)); 
    // Reduced count to 100 for performance, still plenty for a long run
    for (let i = 0; i < 120; i++) {
        const x = 800 + i * 800; 
        const minH = 100;
        const maxH = height - gapSize - minH;
        const topPipeH = minH + Math.random() * maxH;
        
        // Top Pipe
        const topPipe = Matter.Bodies.rectangle(x, topPipeH / 2, 85, topPipeH, { 
            isStatic: true, 
            label: 'obstacle'
        });
        
        // Bottom Pipe
        const bottomPipeH = height - topPipeH - gapSize;
        const bottomPipe = Matter.Bodies.rectangle(x, height - bottomPipeH / 2, 85, bottomPipeH, { 
            isStatic: true, 
            label: 'obstacle'
        });

        this.obstacles.push(topPipe, bottomPipe);
        Matter.World.add(this.world, [topPipe, bottomPipe]);

        // Score trigger (invisible sensor in the gap)
        const scoreTrigger = Matter.Bodies.rectangle(x, topPipeH + gapSize/2, 20, gapSize, {
            isStatic: true,
            isSensor: true,
            label: 'pipe_score'
        });
        Matter.World.add(this.world, scoreTrigger);

        // Random collectible in some gaps
        if (Math.random() > 0.75) { 
            const collY = topPipeH + gapSize/2;
            const coll = Matter.Bodies.circle(x + 250, collY + (Math.random() - 0.5) * 80, 15, {
                isStatic: true,
                isSensor: true,
                label: 'collectible'
            });
            this.collectibles.push(coll);
            Matter.World.add(this.world, coll);
        }
    }

    // Win trigger
    const winTrigger = Matter.Bodies.rectangle(800 + 120 * 800 + 1000, height / 2, 120, height, {
        isStatic: true,
        isSensor: true,
        label: 'win'
    });
    Matter.World.add(this.world, winTrigger);
  }


  public setGameState(state: GameState) {
    this.gameState = state;
    this.onStateChange(state);
  }

  public flap() {
    if (this.gameState !== GameState.PLAYING || !this.player) return;
    // Snappier jump for user friendliness
    Matter.Body.setVelocity(this.player, { x: this.player.velocity.x, y: -9 });
  }

  public step(delta: number) {
    if (this.gameState === GameState.PLAYING && this.player) {
      // Smoother speed progression
      const baseSpeed = 4.0; 
      const speedIncrease = Math.min(4, this.score / 800);
      const currentSpeed = baseSpeed + speedIncrease;

      // Consistent forward velocity
      Matter.Body.setVelocity(this.player, { x: currentSpeed, y: this.player.velocity.y });
      
      // Horizontal bounds
      if (this.player.position.y > 2000 || this.player.position.y < -1000) {
          this.setGameState(GameState.GAME_OVER);
          soundManager.playGameOver();
      }

      // Step physics engine
      Matter.Engine.update(this.engine, delta);
    }
  }
}
