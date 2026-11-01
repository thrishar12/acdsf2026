import { useEffect, useRef } from 'react';
import { useTheme } from '../../utils/theme';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
};

type MouseRipple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
};

export function CyberCanvas({ className = '' }: { className?: string }) {
  const { isLight } = useTheme();
  const ref = useRef<HTMLCanvasElement>(null);

  if (isLight) {
    return null;
  }
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const ripplesRef = useRef<MouseRipple[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const particles: Particle[] = [];
    const colors = ['#00f5ff', '#ff007f', '#00ff9d', '#a855f7', '#38bdf8'];
    
    // Fixed Tactical Infrastructure Hubs
    const hubs = [
      { x: 0.15, y: 0.25, label: 'CORE-01' },
      { x: 0.35, y: 0.18, label: 'ENERGY-HUB' },
      { x: 0.65, y: 0.22, label: 'DEFENSE-SAT' },
      { x: 0.85, y: 0.35, label: 'FINANCE-GATE' },
      { x: 0.75, y: 0.70, label: 'HEALTH-GRID' },
      { x: 0.45, y: 0.78, label: 'TELECOM-MAIN' },
      { x: 0.20, y: 0.65, label: 'TRANSPORT-X' },
      { x: 0.50, y: 0.45, label: 'NOC-CENTRAL' },
    ];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Populate dynamic particles
    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        r: Math.random() * 2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y, active: true };

      // Spawn radar ping on mouse movement periodically
      if (Math.random() < 0.2 && ripplesRef.current.length < 8) {
        ripplesRef.current.push({
          x,
          y,
          radius: 0,
          maxRadius: Math.random() * 60 + 50,
          alpha: 0.7,
        });
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // High-energy tactical radar pulse on click
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius: 160,
        alpha: 0.95,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    const tick = (t: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // 1. Shifting Fluid Ambient Glows
      const shiftX = Math.sin(t / 4000) * 80;
      const shiftY = Math.cos(t / 3500) * 60;

      const violetGlow = ctx.createRadialGradient(w * 0.2 + shiftX, h * 0.25 + shiftY, 10, w * 0.2 + shiftX, h * 0.25 + shiftY, w * 0.5);
      violetGlow.addColorStop(0, 'rgba(124, 58, 237, 0.12)');
      violetGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = violetGlow;
      ctx.fillRect(0, 0, w, h);

      const cyanGlow = ctx.createRadialGradient(w * 0.8 - shiftX, h * 0.75 - shiftY, 10, w * 0.8 - shiftX, h * 0.75 - shiftY, w * 0.55);
      cyanGlow.addColorStop(0, 'rgba(0, 245, 255, 0.1)');
      cyanGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, w, h);

      // 2. Interactive Cyber Grid
      const gridSize = 48;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';

      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Grid Scan Sweep Laser Line
      if (h > 0) {
        const scanY = (t / 15) % h;
        if (Number.isFinite(scanY)) {
          const scanGrad = ctx.createLinearGradient(0, Math.max(0, scanY - 60), 0, scanY + 60);
          scanGrad.addColorStop(0, 'rgba(0, 245, 255, 0)');
          scanGrad.addColorStop(0.5, 'rgba(0, 245, 255, 0.09)');
          scanGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = scanGrad;
          ctx.fillRect(0, scanY - 60, w, 120);
        }
      }

      // 4. Update & Render Interactive Radar Ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const ripple = ripplesRef.current[i];
        ripple.radius += 2.2;
        ripple.alpha -= 0.015;

        if (ripple.alpha <= 0 || ripple.radius >= ripple.maxRadius) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 245, 255, ${ripple.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, Math.max(0, ripple.radius - 15), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${ripple.alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 5. Hub Nodes and Inter-Hub Cyber Links
      hubs.forEach((hub, i) => {
        const hx = hub.x * w;
        const hy = hub.y * h + Math.sin(t / 800 + i) * 6;

        hubs.forEach((other, j) => {
          if (j <= i) return;
          const ox = other.x * w;
          const oy = other.y * h + Math.sin(t / 800 + j) * 6;

          const dist = Math.hypot(hx - ox, hy - oy);
          if (dist < w * 0.45) {
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(ox, oy);
            const linkAlpha = 0.04 + 0.05 * Math.sin(t / 600 + i + j);
            ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 245, 255, ${linkAlpha})` : `rgba(168, 85, 247, ${linkAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Hub Core Drawing
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? '#ff007f' : i % 2 === 0 ? '#00f5ff' : '#00ff9d';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      });

      // 6. Floating Particles with Mouse Attraction
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const px = p.x * w;
        const py = p.y * h;

        // Mouse proximity reaction
        if (mouseRef.current.active) {
          const dx = px - mouseRef.current.x;
          const dy = py - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            // Push gently or connect line
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.strokeStyle = `rgba(0, 245, 255, ${(1 - dist / 120) * 0.3})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return <canvas ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
