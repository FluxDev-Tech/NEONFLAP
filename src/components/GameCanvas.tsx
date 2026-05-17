import { useEffect, useRef, useState, memo } from 'react';
import { GameManager, GameState } from '../game/GameManager';
import { soundManager } from '../game/SoundManager';

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onStateUpdate: (state: GameState) => void;
  gameState: GameState;
}

export default memo(function GameCanvas({ onScoreUpdate, onStateUpdate, gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const requestRef = useRef<number>(0);
  const lastScoreRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        setDimensions(prev => {
            if (prev.width === newWidth && prev.height === newHeight) return prev;
            return { width: newWidth, height: newHeight };
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const birdImg = useRef<HTMLImageElement | null>(null);
  const forestImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
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
    
    let lastTime = performance.now();
    const render = (time: number) => {
      if (!ctx || !manager) return;
      
      const delta = Math.min(time - lastTime, 33.3); // Cap at ~30FPS to prevent physics glitches if tab is backgrounded
      lastTime = time;

      // Manual step for perfect sync and performance
      manager.step(delta);

      const now = Date.now();
      // Trigger shake on score increase removed for performance and smooth movement
      if (manager.score > lastScoreRef.current) {
          lastScoreRef.current = manager.score;
      }
      
      // Deep Background sky
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const playerX = manager.player?.position.x || 0;

      // Parallax drawing Helper
      const drawParallaxLayer = (img: HTMLImageElement, parallax: number, alpha: number, yOffset: number, scale: number = 1) => {
          const forestHeight = dimensions.height;
          const forestWidth = forestHeight * (16/9);
          const scaledWidth = forestWidth * scale;
          const offset = -(playerX * parallax) % scaledWidth;
          ctx.globalAlpha = alpha;
          
          ctx.drawImage(img, offset, yOffset, scaledWidth, forestHeight * scale);
          if (offset + scaledWidth < dimensions.width) {
              ctx.drawImage(img, offset + scaledWidth, yOffset, scaledWidth, forestHeight * scale);
          }
          if (offset > 0) {
              ctx.drawImage(img, offset - scaledWidth, yOffset, scaledWidth, forestHeight * scale);
          }
      };

      // Draw Parallax Forest (Optimized)
      if (forestImg.current) {
        // Deep layer
        drawParallaxLayer(forestImg.current, 0.05, 0.12, -50, 2);
        // Mid layer
        drawParallaxLayer(forestImg.current, 0.15, 0.3, 0);
        
        // Polished Background Particles (Dust/Data bits)
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#00f2ff';
        const pXBase = playerX * 0.2;
        for (let i = 0; i < 20; i++) {
            const px = (i * 243 + pXBase) % dimensions.width;
            const py = (i * 117) % dimensions.height;
            ctx.fillRect(px, py, 2, 2);
        }

        // Fore layer
        drawParallaxLayer(forestImg.current, 0.4, 0.06, -100, 1.3);
        ctx.globalAlpha = 1.0;
      }

      // Camera logic: follow player
      const offsetX = -playerX + 200;
      const offsetY = 0;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw grid (Optimized with tighter bounds)
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.015)'; 
      ctx.lineWidth = 1;
      const gridSize = 150;
      const startX = Math.floor(playerX / gridSize) * gridSize - gridSize;
      const endX = startX + dimensions.width + gridSize * 2;
      ctx.beginPath();
      for (let x = startX; x < endX; x += gridSize) {
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
            const size = 58; 
            const time = now * 0.004;
            // Subtle idle sway (vertical and rotational)
            const swayY = Math.sin(time) * 4;
            const swayRot = Math.sin(time * 0.8) * 0.04;
            
            ctx.save();
            ctx.translate(body.position.x, body.position.y + swayY);
            
            // Smoother rotation based on velocity + sway
            const velocityRot = Math.max(-0.4, Math.min(0.6, body.velocity.y * 0.05));
            ctx.rotate(velocityRot + swayRot);

            if (birdImg.current) {
                ctx.save();
                // We use two-stage composite logic to ensure NO box is visible
                
                // 1. Draw the actual sprite with 'screen' to blend black backgrounds
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(birdImg.current, -size/2, -size/2, size, size);
                
                // 2. Add an intense circular halo to 'seal' the character into the world
                const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
                coreGlow.addColorStop(0, 'rgba(0, 242, 255, 0.7)');
                coreGlow.addColorStop(0.3, 'rgba(0, 242, 255, 0.2)');
                coreGlow.addColorStop(1, 'rgba(0, 242, 255, 0)');
                
                ctx.fillStyle = coreGlow;
                ctx.beginPath();
                ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }

            ctx.restore();
        } else if (body.label === 'obstacle') {
            const vertices = body.vertices;
            const width = Math.abs(vertices[1].x - vertices[0].x);
            const height = Math.abs(vertices[2].y - vertices[0].y);
            const cx = (vertices[0].x + vertices[1].x) / 2;
            const cy = (vertices[0].y + vertices[2].y) / 2;

            const isTopPipe = cy < dimensions.height / 2;

            // Pillar Body - Deep Red Gradient with rounded corners
            const bodyGradient = ctx.createLinearGradient(cx - width/2, 0, cx + width/2, 0);
            bodyGradient.addColorStop(0, '#1a0000');
            bodyGradient.addColorStop(0.5, '#3a0000');
            bodyGradient.addColorStop(1, '#1a0000');
            ctx.fillStyle = bodyGradient;
            
            // Draw with rounded corners for 'user friendly' aesthetic
            ctx.beginPath();
            if (isTopPipe) {
                ctx.roundRect(cx - width/2, cy - height/2, width, height, [0, 0, 10, 10]);
            } else {
                ctx.roundRect(cx - width/2, cy - height/2, width, height, [10, 10, 0, 0]);
            }
            ctx.fill();
            
            // Vibrant Neon Red Highlights
            ctx.strokeStyle = '#ff1144';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Energy Tip (Rounded)
            const capHeight = 16;
            const tipY = isTopPipe ? (cy + height/2 - capHeight) : (cy - height/2);
            
            ctx.fillStyle = '#ff1144';
            ctx.beginPath();
            ctx.roundRect(cx - width/2 - 4, tipY, width + 8, capHeight, 6);
            ctx.fill();
            
            // White hot energy center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(cx - width/2 + 8, tipY + 4, width - 16, capHeight - 8, 4);
            ctx.fill();
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
        const currentMState = managerRef.current.gameState;
        
        if (gameState === GameState.PLAYING) {
            // Reset if we are starting a fresh game (from Menu, Game Over, or Win)
            // But NOT if we are simply unpausing
            if (currentMState === GameState.START || currentMState === GameState.GAME_OVER || currentMState === GameState.WIN) {
                managerRef.current.init(dimensions.width, dimensions.height);
                lastScoreRef.current = 0;
            }
            managerRef.current.setGameState(GameState.PLAYING);
        } else {
            managerRef.current.setGameState(gameState);
        }
    }
  }, [gameState, dimensions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === GameState.PLAYING) {
          onStateUpdate(GameState.PAUSED);
        } else if (gameState === GameState.PAUSED) {
          onStateUpdate(GameState.PLAYING);
        }
      }
      if (e.code === 'Space') {
        handleInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleInteraction = () => {
      if (managerRef.current) {
          if (gameState === GameState.START || gameState === GameState.GAME_OVER || gameState === GameState.WIN || gameState === GameState.PAUSED) {
              onStateUpdate(GameState.PLAYING);
          } else if (gameState === GameState.PLAYING) {
              managerRef.current.flap();
              soundManager.playFlip();
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
        tabIndex={0}
    >
      {isOffline && (
        <div className="absolute top-2 right-16 z-50 px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded flex items-center gap-2 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest font-black">Offline Synchronization Active</span>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="block"
      />
    </div>
  );
});
