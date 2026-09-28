import React, { useRef, useEffect, useState } from 'react';
import { playerService } from '../services/playback/PlayerService';

interface BackgroundVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export const BackgroundVisualizer: React.FC<BackgroundVisualizerProps> = ({
  isPlaying,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Store smoothed frequency heights for buttery smooth transitions
  const smoothedHeightsRef = useRef<number[]>([]);
  const simPhaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let isRunning = true;

    // Handle high-DPI displays
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    const BAR_COUNT = 32; // Minimalist bar count
    if (smoothedHeightsRef.current.length !== BAR_COUNT) {
      smoothedHeightsRef.current = new Array(BAR_COUNT).fill(0);
    }

    const render = () => {
      if (!isRunning || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear previous frame
      ctx.clearRect(0, 0, width, height);

      // Get real frequency data from PlayerService
      const realData = isPlaying ? playerService.getFrequencyData() : null;

      // Check if realData contains actual non-zero frequency signal
      let hasSignal = false;
      if (realData) {
        for (let i = 0; i < realData.length; i++) {
          if (realData[i] > 0) {
            hasSignal = true;
            break;
          }
        }
      }

      // If playing but no Web Audio signal (e.g. browser permissions or codec), use subtle organic wave
      if (isPlaying && !hasSignal) {
        simPhaseRef.current += 0.04;
      }

      const smoothed = smoothedHeightsRef.current;
      let totalEnergy = 0;

      for (let i = 0; i < BAR_COUNT; i++) {
        let target = 0;

        if (isPlaying) {
          if (hasSignal && realData) {
            // Map 32 display bars across low-to-mid frequency bins
            const binIndex = Math.min(
              Math.floor((i / BAR_COUNT) * (realData.length * 0.75)),
              realData.length - 1
            );
            target = realData[binIndex] / 255;
          } else {
            // Subtle rhythmic synthetic harmonic wave
            const phase = simPhaseRef.current;
            const wave1 = Math.sin(phase + i * 0.28) * 0.35 + 0.35;
            const wave2 = Math.cos(phase * 0.7 + i * 0.15) * 0.2 + 0.2;
            target = Math.max(0.05, Math.min(0.85, wave1 + wave2));
          }
        } else {
          // Decays to zero when paused
          target = 0;
        }

        // Smooth interpolation (spring-like ease)
        if (target > smoothed[i]) {
          smoothed[i] += (target - smoothed[i]) * 0.28; // Fast attack
        } else {
          smoothed[i] += (target - smoothed[i]) * 0.08; // Gentle release
        }

        totalEnergy += smoothed[i];
      }

      // If paused and fully decayed, idle the loop to save CPU
      if (!isPlaying && totalEnergy < 0.005) {
        ctx.clearRect(0, 0, width, height);
        animationFrameRef.current = null;
        return;
      }

      // Draw subtle ambient glow in center
      const centerX = width / 2;
      const centerY = height * 0.65;
      const glowRadius = Math.min(width, height) * 0.45;
      const avgEnergy = totalEnergy / BAR_COUNT;

      if (avgEnergy > 0.02) {
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          10,
          centerX,
          centerY,
          glowRadius
        );
        glowGrad.addColorStop(0, `rgba(30, 215, 96, ${avgEnergy * 0.09})`);
        glowGrad.addColorStop(0.5, `rgba(16, 185, 129, ${avgEnergy * 0.04})`);
        glowGrad.addColorStop(1, 'rgba(18, 18, 18, 0)');

        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Render symmetrical minimal frequency bars along the bottom
      const barSpacing = Math.max(4, width / (BAR_COUNT * 2.5));
      const totalBarsWidth = BAR_COUNT * barSpacing;
      const startX = (width - totalBarsWidth) / 2;
      const maxBarHeight = Math.min(height * 0.38, 180);
      const barWidth = Math.max(2, barSpacing * 0.55);

      for (let i = 0; i < BAR_COUNT; i++) {
        const energy = smoothed[i];
        if (energy < 0.01) continue;

        const barHeight = Math.max(3, energy * maxBarHeight);
        const x = startX + i * barSpacing;
        const y = height - barHeight;

        // Dark, minimal green/emerald gradient
        const barGrad = ctx.createLinearGradient(0, y, 0, height);
        barGrad.addColorStop(0, `rgba(30, 215, 96, ${Math.min(0.38, energy * 0.45 + 0.05)})`);
        barGrad.addColorStop(0.7, `rgba(16, 185, 129, ${Math.min(0.22, energy * 0.25 + 0.03)})`);
        barGrad.addColorStop(1, 'rgba(18, 18, 18, 0.02)');

        ctx.fillStyle = barGrad;

        // Rounded top on bars
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none z-0 transition-opacity duration-700 ${
        isPlaying ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    />
  );
};
