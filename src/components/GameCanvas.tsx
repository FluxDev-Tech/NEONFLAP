import { useEffect, useRef, useState } from 'react';
import { GameManager, GameState } from '../game/GameManager';
import { soundManager } from '../game/SoundManager';

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onStateUpdate: (state: GameState) => void;
  gameState: GameState;
}

export default function GameCanvas({ onScoreUpdate, onStateUpdate, gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const requestRef = useRef<number>(0);
  const shakeRef = useRef(0);
  const lastScoreRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const birdImg = useRef<HTMLImageElement | null>(null);
  const forestImg = useRef<HTMLImageElement | null>(null);
  const flapAnimRef = useRef(0);
  
  useEffect(() => {
    const bImg = new Image();
    bImg.src = '/src/assets/images/neon_bird_asset_1778975467334.png';
    bImg.onload = () => {
        birdImg.current = bImg;
    };

    const fImg = new Image();
    fImg.src = '/src/assets/images/neon_forest_layer_1778975701874.png';
    fImg.onload = () => {
        forestImg.current = fImg;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const manager = new GameManager(onStateUpdate, onScoreUpdate);
    managerRef.current = manager;
    manager.init(dimensions.width, dimensions.height);

    const ctx = canvasRef.current.getContext('2d')!;
    
    const render = () => {
      if (!ctx || !manager) return;
      
      manager.update();

      // Trigger shake on score increase
      if (manager.score > lastScoreRef.current) {
          shakeRef.current = 10;
          lastScoreRef.current = manager.score;
      }
      
      // Decay shake
      shakeRef.current *= 0.9;
      if (shakeRef.current < 0.1) shakeRef.current = 0;

      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;
      
      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const playerX = manager.player?.position.x || 0;

      // Draw Parallax Forest
      if (forestImg.current) {
        const forestWidth = 1200;
        const forestHeight = dimensions.height;
        
        // Background layer (slowest)
        const bgParallax = 0.1;
        const bgOffset = -(playerX * bgParallax) % forestWidth;
        ctx.globalAlpha = 0.15;
        ctx.drawImage(forestImg.current, bgOffset, 0, forestWidth, forestHeight);
        ctx.drawImage(forestImg.current, bgOffset + forestWidth, 0, forestWidth, forestHeight);
        ctx.drawImage(forestImg.current, bgOffset - forestWidth, 0, forestWidth, forestHeight);

        // Midground layer
        const mgParallax = 0.3;
        const mgOffset = -(playerX * mgParallax) % forestWidth;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(forestImg.current, mgOffset, 100, forestWidth, forestHeight);
        ctx.drawImage(forestImg.current, mgOffset + forestWidth, 100, forestWidth, forestHeight);
        ctx.drawImage(forestImg.current, mgOffset - forestWidth, 100, forestWidth, forestHeight);
        ctx.globalAlpha = 1.0;
      }

      // Camera logic: follow player
      const offsetX = -playerX + 200 + shakeX;
      const offsetY = shakeY;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const gridSize = 100;
      const startX = Math.floor(playerX / gridSize) * gridSize - 1000;
      for (let x = startX; x < startX + dimensions.width + 2000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
        ctx.stroke();
      }

      // Draw Bodies
      const bodies = manager.world.bodies;
      bodies.forEach(body => {
        // Handle transparency for sensors
        ctx.globalAlpha = body.isSensor ? 0.5 : 1.0;

        if (body.label === 'collectible') {
            ctx.beginPath();
            ctx.fillStyle = '#f0ff00';
            ctx.arc(body.position.x, body.position.y, 15, 0, Math.PI * 2);
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f0ff00';
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.label === 'win') {
            ctx.fillStyle = '#00ff44';
            ctx.fillRect(body.position.x - 50, 0, 100, dimensions.height);
        } else if (body.label === 'player') {
            const size = 55;
            const flapY = Math.sin(Date.now() * 0.02) * 5;
            flapAnimRef.current *= 0.9;
            
            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            
            // Body rotation based on velocity
            const rotation = Math.max(-0.4, Math.min(0.8, body.velocity.y * 0.08));
            ctx.rotate(rotation);

            if (birdImg.current) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00f2ff';
                ctx.drawImage(birdImg.current, -size/2, -size/2, size, size);
                ctx.shadowBlur = 0;
            } else {
                // Fallback cute circle
                ctx.beginPath();
                ctx.fillStyle = '#00f2ff';
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fill();
            }

            // Wing animation
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            const wingWidth = 25;
            const wingHeight = 15;
            const flapOffset = flapAnimRef.current > 0.1 ? -15 : flapY;
            
            ctx.ellipse(-5, 0 + flapOffset, wingWidth / 2, wingHeight / 2, -0.2, 0, Math.PI * 2);
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.fill();
            ctx.restore();
        } else if (body.label === 'obstacle') {
            const vertices = body.vertices;
            const width = Math.abs(vertices[1].x - vertices[0].x);
            const height = Math.abs(vertices[2].y - vertices[0].y);
            const cx = (vertices[0].x + vertices[2].x) / 2;
            const cy = (vertices[0].y + vertices[2].y) / 2;

            // Outer Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0055';
            ctx.fillStyle = '#1a0008';
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            
            // Draw Pipe Body
            ctx.beginPath();
            ctx.rect(cx - width/2, cy - height/2, width, height);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw Pipe Cap
            const capHeight = 30;
            const isTopPipe = cy < dimensions.height / 2;
            const capY = isTopPipe ? (cy + height/2 - capHeight) : (cy - height/2);
            
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(cx - (width + 10)/2, capY, width + 10, capHeight);
            
            // Accent line
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - width/2 + 5, cy - height/2);
            ctx.lineTo(cx - width/2 + 5, cy + height/2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else {
            ctx.beginPath();
            ctx.fillStyle = (body.render.fillStyle as string) || '#ffffff';
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            ctx.closePath();
            ctx.fill();
        }
      });

      ctx.restore();
      
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [dimensions]);

  // Handle GameState changes via parent
  useEffect(() => {
    if (managerRef.current) {
        if (gameState === GameState.PLAYING && managerRef.current.gameState !== GameState.PLAYING) {
            // If we are resetting from game over
            if (managerRef.current.gameState === GameState.GAME_OVER || managerRef.current.gameState === GameState.WIN) {
                managerRef.current.init(dimensions.width, dimensions.height);
                lastScoreRef.current = 0;
            }
            managerRef.current.setGameState(GameState.PLAYING);
        }
    }
  }, [gameState, dimensions]);

  const handleInteraction = () => {
      if (managerRef.current) {
          if (gameState === GameState.START || gameState === GameState.GAME_OVER || gameState === GameState.WIN) {
              onStateUpdate(GameState.PLAYING);
          } else if (gameState === GameState.PLAYING) {
              managerRef.current.flap();
              soundManager.playFlip();
              flapAnimRef.current = 20; 
          }
      }
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative cursor-pointer overflow-hidden touch-none"
        onClick={handleInteraction}
        onTouchStart={(e) => {
          e.preventDefault();
          handleInteraction();
        }}
        onKeyDown={(e) => e.code === 'Space' && handleInteraction()}
        tabIndex={0}
    >
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="block"
      />
    </div>
  );
}
