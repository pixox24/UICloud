"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number; // depth layer for parallax
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Meteor {
  x: number;
  y: number;
  angle: number;
  speed: number;
  length: number;
  life: number;
  maxLife: number;
  width: number;
}

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const starsRef = useRef<Star[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      const count = Math.floor((window.innerWidth * window.innerHeight) / 2800);
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random(),
        size: Math.random() * 1.6 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.15,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    };

    const spawnMeteor = () => {
      const edge = Math.random();
      let x: number, y: number;
      if (edge < 0.6) {
        x = Math.random() * canvas.width;
        y = -20;
      } else {
        x = canvas.width + 20;
        y = Math.random() * canvas.height * 0.5;
      }
      meteorsRef.current.push({
        x,
        y,
        angle: Math.PI * (0.55 + Math.random() * 0.35),
        speed: 6 + Math.random() * 8,
        length: 60 + Math.random() * 120,
        life: 0,
        maxLife: 40 + Math.random() * 60,
        width: 1 + Math.random() * 1.5,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / canvas.width - 0.5) * 2;
      mouseRef.current.y = (e.clientY / canvas.height - 0.5) * 2;
    };

    const draw = (time: number) => {
      frameRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Stars
      for (const star of starsRef.current) {
        const parallax = star.z * 12;
        const px = star.x + mx * parallax;
        const py = star.y + my * parallax;
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.baseAlpha + twinkle * 0.25;

        if (alpha <= 0) continue;

        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 215, 255, ${Math.max(0, alpha)})`;
        ctx.fill();

        // Glow for brighter stars
        if (star.size > 1.2 && alpha > 0.4) {
          ctx.beginPath();
          ctx.arc(px, py, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.08})`;
          ctx.fill();
        }
      }

      // Meteors
      if (frameRef.current % 280 === 0 || (Math.random() < 0.003 && meteorsRef.current.length < 3)) {
        spawnMeteor();
      }

      meteorsRef.current = meteorsRef.current.filter((m) => {
        m.life++;
        if (m.life > m.maxLife) return false;

        const progress = m.life / m.maxLife;
        const headAlpha = progress < 0.2 ? progress * 5 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
        const dx = Math.cos(m.angle) * m.speed;
        const dy = Math.sin(m.angle) * m.speed;
        m.x += dx;
        m.y += dy;

        const tailX = m.x - Math.cos(m.angle) * m.length * headAlpha;
        const tailY = m.y - Math.sin(m.angle) * m.length * headAlpha;

        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, `rgba(200, 220, 255, 0)`);
        grad.addColorStop(0.6, `rgba(200, 220, 255, ${headAlpha * 0.3})`);
        grad.addColorStop(1, `rgba(230, 240, 255, ${headAlpha * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = m.width;
        ctx.lineCap = "round";
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 235, 255, ${headAlpha * 0.6})`;
        ctx.fill();

        return true;
      });

      raf = requestAnimationFrame(draw);
    };

    resize();
    initStars();
    window.addEventListener("resize", () => {
      resize();
      initStars();
    });
    window.addEventListener("mousemove", handleMouseMove);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #060912 50%, #080c16 100%)" }}
    />
  );
}
