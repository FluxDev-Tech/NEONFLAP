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
  }

  public init(width: number, height: number) {
    Matter.World.clear(this.world, false);
    this.obstacles = [];
    this.collectibles = [];
    this.score = 0;
    this.onScoreChange(this.score);
    this.gravityDirection = 1;
    this.engine.gravity.y = 1.0; // Lowered gravity for easier flight

    // Player (Bird)
    this.player = Matter.Bodies.rectangle(100, height / 2, 40, 30, {
      friction: 0.0001,
      frictionAir: 0.03, // Added slightly more air resistance for smoother control
      restitution: 0.4, 
      density: 0.001,
      label: 'player',
      render: { fillStyle: '#00f2ff' }
    });
    
    // Bounds (Floor/Ceiling)
    const ground = Matter.Bodies.rectangle(width / 2, height + 50, width * 100, 100, { isStatic: true, label: 'ground' });
    const ceiling = Matter.Bodies.rectangle(width / 2, -50, width * 100, 100, { isStatic: true, label: 'ground' });
    
    Matter.World.add(this.world, [this.player, ground, ceiling]);

    // Create flappy pipes
    const gapSize = 250; // Further increased gap for easier gameplay
    for (let i = 0; i < 50; i++) {
        const x = 800 + i * 650; // Even more space between pipes (from 500 to 650)
        const minH = 50;
        const maxH = height - gapSize - minH;
        const topPipeH = minH + Math.random() * maxH;
        
        // Top Pipe
        const topPipe = Matter.Bodies.rectangle(x, topPipeH / 2, 60, topPipeH, { 
            isStatic: true, 
            label: 'obstacle',
            render: { fillStyle: '#ff0055' }
        });
        
        // Bottom Pipe
        const bottomPipeH = height - topPipeH - gapSize;
        const bottomPipe = Matter.Bodies.rectangle(x, height - bottomPipeH / 2, 60, bottomPipeH, { 
            isStatic: true, 
            label: 'obstacle',
            render: { fillStyle: '#ff0055' }
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
        if (Math.random() > 0.6) { // More collectibles (from 0.7 to 0.6)
            const collY = topPipeH + gapSize/2;
            const coll = Matter.Bodies.circle(x + 200, collY + (Math.random() - 0.5) * 100, 15, {
                isStatic: true,
                isSensor: true,
                label: 'collectible'
            });
            this.collectibles.push(coll);
            Matter.World.add(this.world, coll);
        }
    }

    // Win trigger
    const winTrigger = Matter.Bodies.rectangle(600 + 50 * 550 + 500, height / 2, 100, height, {
        isStatic: true,
        isSensor: true,
        label: 'win'
    });
    Matter.World.add(this.world, winTrigger);

    Matter.Events.on(this.engine, 'collisionStart', (event) => {
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

  public setGameState(state: GameState) {
    this.gameState = state;
    this.onStateChange(state);
    if (state === GameState.PLAYING) {
      Matter.Runner.run(this.runner, this.engine);
    } else {
      Matter.Runner.stop(this.runner);
    }
  }

  public flap() {
    if (this.gameState !== GameState.PLAYING || !this.player) return;
    Matter.Body.setVelocity(this.player, { x: this.player.velocity.x, y: -8.5 });
  }

  public update() {
    if (this.gameState === GameState.PLAYING && this.player) {
      // Fast, responsive speed
      const baseSpeed = 4.2; 
      const speedIncrease = Math.min(3.5, this.score / 600);
      const currentSpeed = baseSpeed + speedIncrease;

      // Consistent forward velocity
      Matter.Body.setVelocity(this.player, { x: currentSpeed, y: this.player.velocity.y });
      
      // Horizontal bounds (don't really need but for safety)
      if (this.player.position.y > 2000 || this.player.position.y < -1000) {
          this.setGameState(GameState.GAME_OVER);
          soundManager.playGameOver();
      }
    }
  }
}
