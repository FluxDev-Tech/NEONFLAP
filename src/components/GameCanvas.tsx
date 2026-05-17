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

      // Draw grid (Optimized: Only draw visible lines)
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.02)'; 
      ctx.lineWidth = 1;
      const gridSize = 150;
      const gridStartX = Math.floor((playerX - 200) / gridSize) * gridSize;
      const gridEndX = gridStartX + dimensions.width + gridSize;
      
      ctx.beginPath();
      for (let x = gridStartX; x < gridEndX; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
      }
      ctx.stroke();

      // Culling bounds for entities
      const viewLeft = playerX - 300;
      const viewRight = playerX + dimensions.width + 100;

      // Draw Bodies
      const bodies = manager.world.bodies;
      bodies.forEach(body => {
        // Strict Frustum Culling
        if (body.label !== 'player' && body.label !== 'ground') {
            if (body.position.x < viewLeft || body.position.x > viewRight) return;
        }

        if (body.label === 'collectible') {
            ctx.beginPath();
            ctx.fillStyle = '#f0ff00';
            ctx.arc(body.position.x, body.position.y, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(body.position.x, body.position.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (body.label === 'win') {
            const gradX = body.position.x;
            const gradient = ctx.createLinearGradient(gradX - 100, 0, gradX + 100, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, 'rgba(0, 242, 255, 0.2)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(gradX - 150, 0, 300, dimensions.height);
            
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gradX, 0);
            ctx.lineTo(gradX, dimensions.height);
            ctx.stroke();
        } else if (body.label === 'player') {
            const size = 64; 
            const time = now * 0.005;
            const swayY = Math.sin(time) * 3;
            
            ctx.save();
            ctx.translate(body.position.x, body.position.y + swayY);
            
            const velocityRot = Math.max(-0.4, Math.min(0.7, body.velocity.y * 0.05));
            ctx.rotate(velocityRot);

            // Draw Custom Neon Bird silhouette - "Remove that wings" version
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00f2ff';
            
            // 1. Sleek Body (Neon Blue)
            ctx.fillStyle = '#00f2ff';
            ctx.beginPath();
            // Aerodynamic flappy-style body
            ctx.moveTo(-20, -10);
            ctx.quadraticCurveTo(0, -22, 25, -2); // Top
            ctx.lineTo(35, 0); // Beak
            ctx.lineTo(25, 4); // Bottom beak
            ctx.quadraticCurveTo(0, 20, -20, 10); // Bottom
            ctx.closePath();
            ctx.fill();
            
            // 2. High-Tech Cockpit/Eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(12, -4, 5, 3, 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // 3. Engine Core (Neon Pink Tail/Rear)
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(-18, -8);
            ctx.lineTo(-28, 0);
            ctx.lineTo(-18, 8);
            ctx.closePath();
            ctx.fill();
            
            // 4. Stable Energy Halo (No wings)
            ctx.shadowBlur = 0;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
            glow.addColorStop(0, 'rgba(0, 242, 255, 0.25)');
            glow.addColorStop(1, 'rgba(0, 242, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 45, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } else if (body.label === 'obstacle') {
            const vertices = body.vertices;
            const width = Math.abs(vertices[1].x - vertices[0].x);
            const height = Math.abs(vertices[2].y - vertices[0].y);
            const cx = (vertices[0].x + vertices[1].x) / 2;
            const cy = (vertices[0].y + vertices[2].y) / 2;
            const isTopPipe = cy < dimensions.height / 2;

            // Deep Modern Pillar
            ctx.fillStyle = '#0a0005';
            ctx.beginPath();
            ctx.roundRect(cx - width/2, cy - height/2, width, height, isTopPipe ? [0, 0, 16, 16] : [16, 16, 0, 0]);
            ctx.fill();
            
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Energy Flux Cap
            const capH = 22;
            const capY = isTopPipe ? (cy + height/2 - capH) : (cy - height/2);
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.roundRect(cx - width/2 - 8, capY, width + 16, capH, 8);
            ctx.fill();
            
            const pulse = (Math.sin(now * 0.01) + 1) * 0.2;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.85 + pulse})`;
            ctx.beginPath();
            ctx.roundRect(cx - width/2 + 8, capY + 6, width - 16, capH - 12, 4);
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
