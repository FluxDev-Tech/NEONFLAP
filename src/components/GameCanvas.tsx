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
    bImg.src = '/bird.png';
    bImg.onload = () => {
        birdImg.current = bImg;
    };

    const fImg = new Image();
    fImg.src = '/forest-bg.png';
    fImg.onload = () => {
        forestImg.current = fImg;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const manager = new GameManager(onStateUpdate, onScoreUpdate);
    managerRef.current = manager;
    manager.init(dimensions.width, dimensions.height);

    const ctx = canvasRef.current.getContext('2d', { alpha: false })!;
    
    const render = () => {
      if (!ctx || !manager) return;
      
      manager.update();

      // Trigger shake on score increase removed for performance and smooth movement
      if (manager.score > lastScoreRef.current) {
          lastScoreRef.current = manager.score;
      }
      
      const shakeX = 0;
      const shakeY = 0;
      
      // Deep Background sky
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const playerX = manager.player?.position.x || 0;

      // Draw Parallax Forest
      if (forestImg.current) {
        // We use the same image for layers but with different properties
        const forestWidth = dimensions.height * (16/9) * 2; // Scaled up for wider view
        const forestHeight = dimensions.height;
        
        // Background layer (slowest, deep purple tint)
        const bgParallax = 0.05;
        const bgOffset = -(playerX * bgParallax) % forestWidth;
        
        ctx.save();
        ctx.globalAlpha = 0.15;
        // High-performance drawing without expensive filters
        for (let i = -1; i <= 1; i++) {
            ctx.drawImage(forestImg.current, bgOffset + (i * forestWidth), -50, forestWidth, forestHeight + 100);
        }
        ctx.restore();

        // Midground layer (medium speed)
        const mgParallax = 0.15;
        const mgOffset = -(playerX * mgParallax) % forestWidth;
        
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (let i = -1; i <= 1; i++) {
            ctx.drawImage(forestImg.current, mgOffset + (i * forestWidth), 0, forestWidth, forestHeight);
        }
        ctx.restore();

        // Foreground layer (fastest, close trees)
        const fgParallax = 0.4;
        const fgOffset = -(playerX * fgParallax) % forestWidth;
        
        ctx.save();
        ctx.globalAlpha = 0.1;
        for (let i = -1; i <= 1; i++) {
            ctx.drawImage(forestImg.current, fgOffset + (i * forestWidth), -100, forestWidth * 1.3, forestHeight * 1.3);
        }
        ctx.restore();
      }

      // Camera logic: follow player
      const offsetX = -playerX + 200;
      const offsetY = 0;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 150;
      const startX = Math.floor(playerX / gridSize) * gridSize - 1500;
      ctx.beginPath();
      for (let x = startX; x < startX + dimensions.width + 3000; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
      }
      ctx.stroke();

      // Culling bounds
      const viewLeft = playerX - 400;
      const viewRight = playerX + dimensions.width + 100;

      // Draw Bodies
      const bodies = manager.world.bodies;
      bodies.forEach(body => {
        // Simple Culling
        if (body.label !== 'player' && body.label !== 'ground') {
            if (body.position.x < viewLeft || body.position.x > viewRight) return;
        }

        if (body.label === 'collectible') {
            ctx.beginPath();
            ctx.fillStyle = '#f0ff00';
            ctx.arc(body.position.x, body.position.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(body.position.x, body.position.y, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (body.label === 'win') {
            const gradient = ctx.createLinearGradient(body.position.x - 50, 0, body.position.x + 50, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, 'rgba(0, 255, 68, 0.3)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(body.position.x - 100, 0, 200, dimensions.height);
            
            ctx.strokeStyle = '#00ff44';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(body.position.x, 0);
            ctx.lineTo(body.position.x, dimensions.height);
            ctx.stroke();
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
                // High-performance image drawing (no shadows)
                ctx.drawImage(birdImg.current, -size/2, -size/2, size, size);
            } else {
                ctx.beginPath();
                ctx.fillStyle = '#00f2ff';
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fill();
            }

            // Wing animation (simplified/efficient)
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            const wingWidth = 20;
            const wingHeight = 12;
            const flapOffset = flapAnimRef.current > 0.1 ? -12 : flapY;
            
            ctx.ellipse(-5, flapOffset, wingWidth / 2, wingHeight / 2, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (body.label === 'obstacle') {
            const vertices = body.vertices;
            const width = Math.abs(vertices[1].x - vertices[0].x);
            const height = Math.abs(vertices[2].y - vertices[0].y);
            const cx = (vertices[0].x + vertices[2].x) / 2;
            const cy = (vertices[0].y + vertices[2].y) / 2;

            const isTopPipe = cy < dimensions.height / 2;

            // Pillar Solid Style for performance
            ctx.fillStyle = '#1a0008';
            ctx.fillRect(cx - width/2, cy - height/2, width, height);
            
            // Energy Tip
            const capHeight = 10;
            const tipY = isTopPipe ? (cy + height/2 - capHeight) : (cy - height/2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - width/2 - 2, tipY, width + 4, capHeight);
        } else if (body.label === 'ground') {
            // Not explicitly drawn box for ground, but we could add a floor line
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
        className="w-full h-full relative cursor-pointer overflow-hidden touch-none outline-none focus:outline-none"
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
