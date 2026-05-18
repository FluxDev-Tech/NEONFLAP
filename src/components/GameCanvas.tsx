import { useEffect, useRef, useState, memo } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import { GameManager, GameState } from '../game/GameManager';
import { soundManager } from '../game/SoundManager';
import { SKIN_PROTOCOLS } from '../game/SkinPresets';

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onStateUpdate: (state: GameState) => void;
  gameState: GameState;
  vFXEnabled?: boolean;
  selectedSkinId?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export default memo(function GameCanvas({ onScoreUpdate, onStateUpdate, gameState, vFXEnabled = true, selectedSkinId = 'DEFAULT' }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const requestRef = useRef<number>(0);
  const lastInteractionTime = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const birdPulseRef = useRef(1);

  const createBurst = (x: number, y: number, color: string, count: number = 8) => {
    if (!vFXEnabled) return;
    const particles = particlesRef.current;
    if (particles.length > 80) return; // Cap particles
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.4,
            color,
            size: Math.random() * 2 + 1.5
        });
    }
  };

  const createFlapParticles = (x: number, y: number) => {
    if (!vFXEnabled) return;
    const particles = particlesRef.current;
    if (particles.length > 80) return; // Cap particles
    for (let i = 0; i < 2; i++) {
        particles.push({
            x, y,
            vx: -2.5 - Math.random() * 1.5,
            vy: (Math.random() - 0.5) * 3,
            life: 1,
            maxLife: 0.3,
            color: '#00f2ff',
            size: Math.random() * 1.5 + 1
        });
    }
  };

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
    bImg.onerror = (e) => {
        console.error('Bird image failed to load', e);
    };

    const fImg = new Image();
    fImg.src = '/forest-bg.png';
    fImg.onload = () => {
        forestImg.current = fImg;
    };
    fImg.onerror = (e) => {
        console.error('Forest image failed to load', e);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const manager = new GameManager(onStateUpdate, onScoreUpdate);
    managerRef.current = manager;
    manager.init(dimensions.width, dimensions.height);

    const ctxCandidate = canvasRef.current.getContext('2d', { 
        alpha: false,
        desynchronized: true // Performance hint
    });
    
    if (!ctxCandidate) {
        console.error('Failed to get 2D context');
        return;
    }
    const ctx = ctxCandidate;
    
    let lastTime = performance.now();
    const render = (time: number) => {
      // Basic check
      if (!ctx || !manager) return;
      
      const delta = Math.min(time - lastTime, 33.3); 
      const dt = delta / 1000;
      lastTime = time;

      // Update state
      shakeRef.current = Math.max(0, shakeRef.current - dt * 22);
      birdPulseRef.current = Math.max(1, birdPulseRef.current - dt * 3.5);

      // Physics step
      manager.step(delta);

      const now = performance.now();
      
      // Update Particles with simpler logic
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw Sequence
      ctx.save();
      
      // Screen Shake
      if (vFXEnabled && shakeRef.current > 0.1) {
          ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      }
      
      // Deep Background sky
      ctx.fillStyle = '#03030b';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const playerX = manager.player?.position.x || 0;
      const playerY = manager.player?.position.y || 0;

      // Parallax drawing Helper
      const drawParallaxLayer = (img: HTMLImageElement, parallax: number, alpha: number, yOffset: number, scale: number = 1) => {
          const h = dimensions.height;
          const w = h * (16/9);
          const scaledW = w * scale;
          const offset = -(playerX * parallax) % scaledW;
          ctx.globalAlpha = alpha;
          
          ctx.drawImage(img, offset, yOffset, scaledW, h * scale);
          if (offset + scaledW < dimensions.width) {
              ctx.drawImage(img, offset + scaledW, yOffset, scaledW, h * scale);
          }
          if (offset > 0) {
              ctx.drawImage(img, offset - scaledW, yOffset, scaledW, h * scale);
          }
      };

      // Draw Parallax Forest
      if (forestImg.current) {
        drawParallaxLayer(forestImg.current, 0.05, 0.1, -50, 1.8);
        drawParallaxLayer(forestImg.current, 0.12, 0.25, 0, 1);
        
        // Background Particles
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#00f2ff';
        const pXBase = playerX * 0.2;
        for (let i = 0; i < 15; i++) {
            ctx.fillRect((i * 317 + pXBase) % dimensions.width, (i * 153) % dimensions.height, 1.5, 1.5);
        }

        drawParallaxLayer(forestImg.current, 0.35, 0.05, -100, 1.2);
        ctx.globalAlpha = 1.0;
      }

      const offsetX = -playerX + dimensions.width * 0.25;
      const offsetY = 0;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // No grid - simplified for cleaner look
      const viewLeft = playerX - 400;
      const viewRight = playerX + dimensions.width + 100;

      const bodies = manager.world.bodies;
      const obstacles: Matter.Body[] = [];
      const collectibles: Matter.Body[] = [];
      let playerBody: Matter.Body | null = null;
      let winBody: Matter.Body | null = null;

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label === 'player') {
          playerBody = body;
          continue;
        }
        if (body.label === 'ground') continue;
        
        // Culling
        if (body.position.x < viewLeft || body.position.x > viewRight) continue;

        if (body.label === 'obstacle') obstacles.push(body);
        else if (body.label === 'collectible') collectibles.push(body);
        else if (body.label === 'win') winBody = body;
      }

      // Draw Collectibles
      if (collectibles.length > 0) {
        ctx.fillStyle = '#f0ff00';
        for (const body of collectibles) {
          ctx.beginPath();
          ctx.arc(body.position.x, body.position.y, 11, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        for (const body of collectibles) {
          ctx.beginPath();
          ctx.arc(body.position.x, body.position.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Win Line
      if (winBody) {
        const gradX = winBody.position.x;
        const gradient = ctx.createLinearGradient(gradX - 120, 0, gradX + 120, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, 'rgba(0, 242, 255, 0.15)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(gradX - 150, 0, 300, dimensions.height);
        
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gradX, 0);
        ctx.lineTo(gradX, dimensions.height);
        ctx.stroke();
      }

      // Draw Obstacles
      if (obstacles.length > 0) {
        const pulse = vFXEnabled ? (Math.sin(now * 0.008) + 1) * 0.15 : 0;
        const innerAlpha = 0.8 + pulse;

        for (const body of obstacles) {
          const vertices = body.vertices;
          const w = Math.abs(vertices[1].x - vertices[0].x);
          const h = Math.abs(vertices[2].y - vertices[0].y);
          const cx = (vertices[0].x + vertices[1].x) / 2;
          const cy = (vertices[0].y + vertices[2].y) / 2;
          const isTop = cy < dimensions.height / 2;

          // Main body
          ctx.fillStyle = '#080006';
          ctx.fillRect(cx - w/2, cy - h/2, w, h);
          
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - w/2, cy - h/2, w, h);
          
          // Cap
          const capH = 20;
          const capY = isTop ? (cy + h/2 - capH) : (cy - h/2);
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(cx - w/2 - 6, capY, w + 12, capH);
        }
      }

      // Draw Player
      if (playerBody) {
        const body = playerBody;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        const rotation = Math.max(-0.4, Math.min(0.6, body.velocity.y * 0.04));
        ctx.rotate(rotation);

        const skin = SKIN_PROTOCOLS.find(s => s.id === selectedSkinId) || SKIN_PROTOCOLS[0];

        if (birdImg.current) {
            const pulse = vFXEnabled ? birdPulseRef.current : 1;
            const w = 52 * pulse;
            const h = 40 * pulse;
            ctx.drawImage(birdImg.current, -w/2, -h/2, w, h);
        } else {
            ctx.fillStyle = skin.colors.primary;
            ctx.beginPath();
            ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = skin.colors.secondary;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Eye
            ctx.fillStyle = skin.colors.secondary;
            ctx.beginPath();
            ctx.arc(10, -6, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(14, -6, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Beak
            ctx.fillStyle = skin.colors.beak;
            ctx.beginPath();
            ctx.moveTo(18, 2);
            ctx.lineTo(34, 4);
            ctx.lineTo(18, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
      }

      // Particles - Batch by color to minimize state changes
      if (particles.length > 0) {
        // Draw squares for better performance
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = p.life * 0.8;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        ctx.globalAlpha = 1.0;
      }

      ctx.restore(); // Entities
      ctx.restore(); // Global
      
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
            if (currentMState === GameState.START || currentMState === GameState.GAME_OVER || currentMState === GameState.WIN) {
                managerRef.current.init(dimensions.width, dimensions.height);
                particlesRef.current = [];
            }
            managerRef.current.setGameState(GameState.PLAYING);
        } else {
            if (gameState === GameState.GAME_OVER && managerRef.current.player) {
                shakeRef.current = 15;
                const pos = managerRef.current.player.position;
                createBurst(pos.x, pos.y, '#f0ff00', 20);
                createBurst(pos.x, pos.y, '#ff0055', 10);
            }
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

  const handleInteraction = (e?: PointerEvent | KeyboardEvent) => {
      // Prevent double trigger from Pointer + Touch + Mouse events
      const now = Date.now();
      if (now - lastInteractionTime.current < 80) return;
      lastInteractionTime.current = now;

      if (e) {
          // No preventDefault on pointerdown generally unless needed, 
          // but we want to stop propagation to avoid unwanted effects
          e.stopPropagation();
      }

      if (managerRef.current) {
          if (gameState === GameState.START || gameState === GameState.GAME_OVER || gameState === GameState.WIN || gameState === GameState.PAUSED) {
              onStateUpdate(GameState.PLAYING);
          } else if (gameState === GameState.PLAYING) {
              managerRef.current.flap();
              soundManager.playFlip();
              // Add juice
              birdPulseRef.current = 1.3;
              if (managerRef.current.player) {
                  createFlapParticles(managerRef.current.player.position.x, managerRef.current.player.position.y);
              }
          }
      }
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative cursor-pointer overflow-hidden touch-none outline-none focus:outline-none"
        onPointerDown={(e) => handleInteraction(e)}
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
