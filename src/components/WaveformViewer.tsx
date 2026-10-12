import React, { useRef, useEffect, useState, useMemo } from 'react';
import { HarmonicComponent, RectifierConfig, SimulationResult, SimulationSample } from '../types/rectifier';
import {
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Layers,
  Crosshair,
  Download,
} from 'lucide-react';

interface WaveformViewerProps {
  config: RectifierConfig;
  simResult: SimulationResult;
  currentThetaDeg: number;
  onThetaChange: (thetaDeg: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  config,
  simResult,
  currentThetaDeg,
  onThetaChange,
  isPlaying,
  onTogglePlay,
  playSpeed,
  onChangeSpeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'oscilloscope' | 'harmonics'>('oscilloscope');

  // Channel Visibility - iSource enabled by default as requested
  const [visibleChannels, setVisibleChannels] = useState({
    vSource: true,
    vOutput: true,
    iOutput: true,
    iSource: true,
    gatePulse: config.device === 'thyristor',
    vSwitch: false,
  });

  // For 3-Phase: toggle between showing just one source current (Phase A, default) vs all 3 phases
  const [showAllPhasesCurrent, setShowAllPhasesCurrent] = useState(false);

  // For 3-Phase Full-Wave: toggle between showing Line-to-Line voltages (VLL envelope) vs Phase voltages (Vph)
  const [showLineVoltages, setShowLineVoltages] = useState(true);

  // Enable gatePulse automatically if thyristor selected
  useEffect(() => {
    if (config.device === 'thyristor') {
      setVisibleChannels((prev) => ({ ...prev, gatePulse: true }));
    }
  }, [config.device]);

  // Dual Cursors for engineering measurement
  const [showCursors, setShowCursors] = useState(false);
  const [cursor1X, setCursor1X] = useState<number | null>(null);
  const [cursor2X, setCursor2X] = useState<number | null>(null);

  // Mouse hover coordinate
  const [hoverSample, setHoverSample] = useState<SimulationSample | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const samples = simResult.samples;
  const metrics = simResult.metrics;
  const totalThetaMax = (config.cyclesToDisplay || 2) * 360;

  // Find sample closest to currentThetaDeg
  const activeSampleIndex = useMemo(() => {
    if (!samples.length) return 0;
    const normTheta = currentThetaDeg % totalThetaMax;
    let closestIdx = 0;
    let minDiff = 999999;
    for (let i = 0; i < samples.length; i++) {
      const diff = Math.abs(samples[i].thetaDeg - normTheta);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return closestIdx;
  }, [samples, currentThetaDeg, totalThetaMax]);

  // Render Dual Stacked Oscilloscope (Voltage Window Top, Current Window Bottom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'oscilloscope' || !samples.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // ==========================================
    // DYNAMIC MULTI-PANE CANVAS LAYOUT:
    // Window 1: CH1 Voltage (V) [Vs & Vo]
    // Window 2: CH2 Load Current (A) [Io]
    // Window 3: CH3 Source Current (A) [Is] (SEPARATE from Iload)
    // ==========================================
    const hasIo = visibleChannels.iOutput;
    const hasIs = visibleChannels.iSource;

    let vWindow: { yTop: number; yBottom: number; height: number };
    let ioWindow: { yTop: number; yBottom: number; height: number } | null = null;
    let isWindow: { yTop: number; yBottom: number; height: number } | null = null;
    const dividerYs: number[] = [];

    if (hasIo && hasIs) {
      // 3 Dedicated Separate Graphs
      const split1 = Math.floor(height * 0.38);
      const split2 = Math.floor(height * 0.69);
      dividerYs.push(split1, split2);

      vWindow = { yTop: 18, yBottom: split1 - 8, height: split1 - 26 };
      ioWindow = { yTop: split1 + 20, yBottom: split2 - 8, height: split2 - split1 - 28 };
      isWindow = { yTop: split2 + 20, yBottom: height - 16, height: height - split2 - 36 };
    } else if (hasIo && !hasIs) {
      // 2 Graphs: Voltage + Load Current
      const split1 = Math.floor(height * 0.52);
      dividerYs.push(split1);

      vWindow = { yTop: 18, yBottom: split1 - 8, height: split1 - 26 };
      ioWindow = { yTop: split1 + 20, yBottom: height - 16, height: height - split1 - 36 };
    } else if (!hasIo && hasIs) {
      // 2 Graphs: Voltage + Source Current
      const split1 = Math.floor(height * 0.52);
      dividerYs.push(split1);

      vWindow = { yTop: 18, yBottom: split1 - 8, height: split1 - 26 };
      isWindow = { yTop: split1 + 20, yBottom: height - 16, height: height - split1 - 36 };
    } else {
      // 1 Graph: Voltage Only
      vWindow = { yTop: 18, yBottom: height - 16, height: height - 34 };
    }

    // Divider bars between graphs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (const dY of dividerYs) {
      ctx.beginPath();
      ctx.moveTo(0, dY);
      ctx.lineTo(width, dY);
      ctx.stroke();
    }

    // Horizontal degree grid markings across all windows
    const numVDivs = 10;
    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 1;

    for (let i = 0; i <= numVDivs; i++) {
      const x = (width / numVDivs) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Degree markings at the bottom of each divider and at the bottom of canvas
      const deg = ((totalThetaMax / numVDivs) * i).toFixed(0);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      for (const dY of dividerYs) {
        ctx.fillText(`${deg}°`, x + 3, dY - 3);
      }
      ctx.fillText(`${deg}°`, x + 3, height - 3);
    }

    // Dynamic Maximums
    let maxV = 100;
    for (const s of samples) {
      if (Math.abs(s.vSourceA) > maxV) maxV = Math.abs(s.vSourceA);
      if (Math.abs(s.vOutput) > maxV) maxV = Math.abs(s.vOutput);
      if (Math.abs(s.vSwitch1) > maxV) maxV = Math.abs(s.vSwitch1);
    }
    maxV = maxV * 1.25;

    let maxIo = 5;
    for (const s of samples) {
      if (s.iOutput > maxIo) maxIo = s.iOutput;
    }
    maxIo = maxIo * 1.35;

    let maxIs = 5;
    let minIs = 0;
    for (const s of samples) {
      if (Math.abs(s.iSource) > maxIs) maxIs = Math.abs(s.iSource);
      if (s.iSource < minIs) minIs = s.iSource;
    }
    maxIs = maxIs * 1.35;
    const isBipolar = minIs < -0.05;

    const toX = (thetaDeg: number) => (thetaDeg / totalThetaMax) * width;

    // ========================================================
    // WINDOW 1: VOLTAGE GRAPH
    // ========================================================
    const vCenterY = vWindow.yTop + vWindow.height * 0.52;
    const vScale = (vWindow.height * 0.44) / maxV;
    const toY_V = (val: number) => vCenterY - val * vScale;

    // Window 1 Title Badge
    ctx.fillStyle = '#1e293b';
    const is3PFull = config.phase === '3-phase' && config.wave === 'full-wave';
    const badgeW = is3PFull ? 370 : 260;
    ctx.fillRect(8, 4, badgeW, 15);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    if (is3PFull) {
      ctx.fillText(
        showLineVoltages
          ? 'CH1: VOLTAGE [VLL Line Envelopes (Dotted) vs Vo (Thick 6-Pulse)]'
          : 'CH1: VOLTAGE [Vph Phase Voltages (Dotted) vs Vo (Thick 6-Pulse)]',
        12,
        15
      );
    } else {
      ctx.fillText('CH1: VOLTAGE [Vs (Dotted) vs Vo (Thick)]', 12, 15);
    }

    // Voltage Zero-line Axis
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, vCenterY);
    ctx.lineTo(width, vCenterY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('0V', 4, vCenterY - 3);
    ctx.fillText(`+${maxV.toFixed(0)}V`, 4, vWindow.yTop + 10);
    ctx.fillText(`-${maxV.toFixed(0)}V`, 4, vWindow.yBottom - 3);

    // 1. Trace: Gate Pulses (if thyristor)
    if (config.device === 'thyristor' && visibleChannels.gatePulse) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      const pulseY = vWindow.yBottom - 4;
      const pulseH = 14;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = s.gatePulseActive ? pulseY - pulseH : pulseY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Trace: AC Source Voltage (DOTTED LINE)
    if (visibleChannels.vSource) {
      ctx.setLineDash([4, 4]); // DOTTED LINE

      if (is3PFull && showLineVoltages) {
        // In 3-Phase Full Bridge, the output voltage Vo is formed by the 6 Line-to-Line voltages
        // Draw the 3 positive line voltages + 3 negative line voltages as reference envelopes
        // V_ab (Dotted Yellow/Amber)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineAB !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(s.vLineAB);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // V_bc (Dotted Sky Blue)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineBC !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(s.vLineBC);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // V_ca (Dotted Rose)
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineCA !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(s.vLineCA);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Opposite polarity line envelopes: -Vab, -Vbc, -Vca (faint dotted lines so all 6 lobes are visible)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineAB !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(-s.vLineAB);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineBC !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(-s.vLineBC);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          if (s.vLineCA !== undefined) {
            const x = toX(s.thetaDeg);
            const y = toY_V(-s.vLineCA);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        // Phase A (Dotted Yellow)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = toX(s.thetaDeg);
          const y = toY_V(s.vSourceA);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // If 3-phase, Phase B & C also dotted
        if (config.phase === '3-phase') {
          // Phase B (Dotted Blue)
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (s.vSourceB !== undefined) {
              const x = toX(s.thetaDeg);
              const y = toY_V(s.vSourceB);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          }
          ctx.stroke();

          // Phase C (Dotted Red)
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (s.vSourceC !== undefined) {
              const x = toX(s.thetaDeg);
              const y = toY_V(s.vSourceC);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); // Reset dash
    }

    // 3. Trace: Switch Blocking Voltage (Optional Purple)
    if (visibleChannels.vSwitch) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_V(s.vSwitch1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Trace: Output Rectified Voltage Vo (THICK SOLID LINE)
    if (visibleChannels.vOutput) {
      // Glow backing
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 7;
      ctx.lineWidth = 3.6; // THICK SOLID LINE AS REQUESTED
      ctx.setLineDash([]); // SOLID LINE
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_V(s.vOutput);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Average DC Voltage Line (dashed emerald)
      const yDc = toY_V(metrics.vDc);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, yDc);
      ctx.lineTo(width, yDc);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Vdc = ${metrics.vDc.toFixed(1)}V`, width - 110, yDc - 4);
    }

    // ========================================================
    // WINDOW 2: SEPARATE LOAD CURRENT GRAPH (A) [Io]
    // ========================================================
    let toY_Io = (_val: number) => 0;
    if (ioWindow && hasIo) {
      const ioZeroY = ioWindow.yBottom - 8;
      const ioScale = (ioWindow.height * 0.78) / maxIo;
      toY_Io = (val: number) => ioZeroY - val * ioScale;

      // Window 2 Title Badge
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, ioWindow.yTop - 16, 235, 15);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, ioWindow.yTop - 16, 235, 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('CH2: LOAD CURRENT [Io (DC Load)]', 12, ioWindow.yTop - 5);

      // Current Zero-line Axis
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, ioZeroY);
      ctx.lineTo(width, ioZeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText('0A', 4, ioZeroY - 3);
      ctx.fillText(`+${maxIo.toFixed(1)}A`, 4, ioWindow.yTop + 8);

      // Trace: Output Load Current Io (THICK SOLID SKY-BLUE LINE)
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3.0;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_Io(s.iOutput);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Average DC Current Line
      const yIdc = toY_Io(metrics.iDc);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, yIdc);
      ctx.lineTo(width, yIdc);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText(`Idc = ${metrics.iDc.toFixed(2)}A`, width - 110, yIdc - 4);
    }

    // ========================================================
    // WINDOW 3: SEPARATE SOURCE CURRENT GRAPH (A) [Is]
    // ========================================================
    let toY_Is = (_val: number) => 0;
    if (isWindow && hasIs) {
      const isZeroY = isBipolar
        ? isWindow.yTop + isWindow.height * 0.52
        : isWindow.yBottom - 8;
      const isScale = isBipolar
        ? (isWindow.height * 0.44) / maxIs
        : (isWindow.height * 0.78) / maxIs;
      toY_Is = (val: number) => isZeroY - val * isScale;

      // Window 3 Title Badge
      const is3Phase = config.phase === '3-phase';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, isWindow.yTop - 16, is3Phase ? 315 : 260, 15);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, isWindow.yTop - 16, is3Phase ? 315 : 260, 15);

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 9.5px monospace';
      if (is3Phase) {
        ctx.fillText(
          showAllPhasesCurrent
            ? 'CH3: 3-PHASE CURRENTS [Isa (Org), Isb (Yel), Isc (Sky)]'
            : 'CH3: SOURCE CURRENT [Isa (Phase A Only - Single Source)]',
          12,
          isWindow.yTop - 5
        );
      } else {
        ctx.fillText('CH3: SOURCE CURRENT [Is (AC Source)]', 12, isWindow.yTop - 5);
      }

      // Is Zero-line Axis
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, isZeroY);
      ctx.lineTo(width, isZeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText('0A', 4, isZeroY - 3);
      ctx.fillText(`+${maxIs.toFixed(1)}A`, 4, isWindow.yTop + 8);
      if (isBipolar) {
        ctx.fillText(`-${maxIs.toFixed(1)}A`, 4, isWindow.yBottom - 3);
      }

      // Trace 1: Phase A AC Source Current Is / Isa (VIBRANT ORANGE LINE)
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
      ctx.shadowBlur = 5;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_Is(s.iSource);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Trace 2 & 3: Phase B and C (only if 3-Phase AND showAllPhasesCurrent enabled)
      if (is3Phase && showAllPhasesCurrent) {
        // Phase B (Yellow dashed)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = toX(s.thetaDeg);
          const y = toY_Is(s.iSourceB ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Phase C (Sky Blue dotted)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = toX(s.thetaDeg);
          const y = toY_Is(s.iSourceC ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // RMS Source Current annotation
      let sumSqIs = 0;
      for (const s of samples) sumSqIs += s.iSource * s.iSource;
      const isRmsVal = Math.sqrt(sumSqIs / (samples.length || 1));

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText(
        is3Phase ? `Isa(rms) = ${isRmsVal.toFixed(2)}A` : `Is(rms) = ${isRmsVal.toFixed(2)}A`,
        width - 125,
        isZeroY - 4
      );
    }

    // Measurement Cursors (spanning all windows)
    if (showCursors) {
      if (cursor1X !== null) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cursor1X, 0);
        ctx.lineTo(cursor1X, height);
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('C1', cursor1X + 4, 16);
      }
      if (cursor2X !== null) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cursor2X, 0);
        ctx.lineTo(cursor2X, height);
        ctx.stroke();
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText('C2', cursor2X + 4, 16);
      }
      ctx.setLineDash([]);
    }

    // Playhead / Instantaneous Scrubber (spanning all windows)
    const activeSample = samples[activeSampleIndex];
    if (activeSample) {
      const playheadX = toX(activeSample.thetaDeg);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Top indicator arrow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 8);
      ctx.fill();

      // Voltage window dot (Vo)
      if (visibleChannels.vOutput) {
        const dotY = toY_V(activeSample.vOutput);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(playheadX, dotY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Load Current window dot (Io)
      if (hasIo && ioWindow) {
        const dotY = toY_Io(activeSample.iOutput);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(playheadX, dotY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Source Current window dot (Is)
      if (hasIs && isWindow) {
        const dotY = toY_Is(activeSample.iSource);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(playheadX, dotY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Additional playhead markers if viewing all 3 phases
        if (config.phase === '3-phase' && showAllPhasesCurrent) {
          if (activeSample.iSourceB !== undefined) {
            const dotYB = toY_Is(activeSample.iSourceB);
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(playheadX, dotYB, 4.0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          if (activeSample.iSourceC !== undefined) {
            const dotYC = toY_Is(activeSample.iSourceC);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(playheadX, dotYC, 4.0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }
    }
  }, [
    samples,
    visibleChannels,
    showAllPhasesCurrent,
    activeTab,
    config,
    metrics,
    activeSampleIndex,
    showCursors,
    cursor1X,
    cursor2X,
    totalThetaMax,
  ]);

  // Handle Canvas Click or Drag for Scrubber & Cursors
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetTheta = ratio * totalThetaMax;

    if (showCursors) {
      if (cursor1X === null || (cursor2X !== null && Math.abs(x - cursor1X) < Math.abs(x - cursor2X))) {
        setCursor1X(x);
      } else {
        setCursor2X(x);
      }
    } else {
      onThetaChange(targetTheta);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !samples.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const sampleIdx = Math.floor(ratio * (samples.length - 1));
    setHoverSample(samples[sampleIdx] || null);

    if (e.buttons === 1 && !showCursors) {
      onThetaChange(ratio * totalThetaMax);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoverSample(null);
    setMousePos(null);
  };

  // Export CSV Data
  const handleExportCSV = () => {
    let csv = 'Time (s),Theta (deg),vSourceA (V),vOutput (V),iOutput (A),iSource (A)\n';
    samples.forEach((s) => {
      csv += `${s.time.toFixed(6)},${s.thetaDeg.toFixed(2)},${s.vSourceA.toFixed(2)},${s.vOutput.toFixed(2)},${s.iOutput.toFixed(3)},${s.iSource.toFixed(3)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power_rectifier_${config.phase}_${config.wave}_${config.device}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate Cursor Measurement Delta
  const cursorStats = useMemo(() => {
    if (!showCursors || cursor1X === null || cursor2X === null || !canvasRef.current) return null;
    const w = canvasRef.current.clientWidth || 1;
    const theta1 = (cursor1X / w) * totalThetaMax;
    const theta2 = (cursor2X / w) * totalThetaMax;
    const deltaTheta = Math.abs(theta2 - theta1);
    const deltaT_ms = (deltaTheta / 360 / config.frequency) * 1000;
    return {
      theta1: theta1.toFixed(1),
      theta2: theta2.toFixed(1),
      deltaTheta: deltaTheta.toFixed(1),
      deltaT_ms: deltaT_ms.toFixed(2),
    };
  }, [showCursors, cursor1X, cursor2X, totalThetaMax, config.frequency]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-950/90 rounded-xl border border-slate-800 p-3 shadow-2xl backdrop-blur-md">
      {/* Top Header / Channel Toggles & Controls */}
      <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-200 hidden sm:inline-block">
            Simulation Oscilloscope
          </span>
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 ml-1">
            <button
              onClick={() => setActiveTab('oscilloscope')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'oscilloscope'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Oscilloscope
            </button>
            <button
              onClick={() => setActiveTab('harmonics')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === 'harmonics'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Harmonics (FFT)
            </button>
          </div>
        </div>

        {/* Channel Toggles */}
        {activeTab === 'oscilloscope' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setVisibleChannels((p) => ({ ...p, vSource: !p.vSource }))}
              className={`px-2 py-0.5 rounded border transition-all text-[11px] font-bold ${
                visibleChannels.vSource
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              {config.phase === '3-phase' && config.wave === 'full-wave' && showLineVoltages
                ? 'CH1: VLL (Dotted)'
                : 'CH1: Vin (Dotted)'}
            </button>
            {config.phase === '3-phase' && config.wave === 'full-wave' && visibleChannels.vSource && (
              <button
                onClick={() => setShowLineVoltages(!showLineVoltages)}
                className={`px-2 py-0.5 rounded border transition-all text-[10px] font-mono ${
                  showLineVoltages
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle between Line-to-Line voltages (VLL envelopes) and Phase voltages (Vph)"
              >
                {showLineVoltages ? 'VLL (Line)' : 'Vph (Phase)'}
              </button>
            )}
            <button
              onClick={() => setVisibleChannels((p) => ({ ...p, vOutput: !p.vOutput }))}
              className={`px-2 py-0.5 rounded border transition-all text-[11px] font-bold ${
                visibleChannels.vOutput
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              CH1: Vo (Thick)
            </button>
            <button
              onClick={() => setVisibleChannels((p) => ({ ...p, iOutput: !p.iOutput }))}
              className={`px-2 py-0.5 rounded border transition-all text-[11px] font-bold ${
                visibleChannels.iOutput
                  ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              CH2: Io (Load)
            </button>
            <button
              onClick={() => setVisibleChannels((p) => ({ ...p, iSource: !p.iSource }))}
              className={`px-2 py-0.5 rounded border transition-all text-[11px] font-bold ${
                visibleChannels.iSource
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through'
              }`}
            >
              {config.phase === '3-phase' ? 'CH3: Isa (Phase A)' : 'CH3: Is (Source)'}
            </button>

            {/* 3-Phase: Mode Switcher between Single Source Current (Phase A) and All 3 Phases */}
            {config.phase === '3-phase' && visibleChannels.iSource && (
              <button
                onClick={() => setShowAllPhasesCurrent(!showAllPhasesCurrent)}
                className={`px-2 py-0.5 rounded border transition-all text-[10px] font-mono ${
                  showAllPhasesCurrent
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Click to toggle between showing just Phase A or all 3 phase currents"
              >
                {showAllPhasesCurrent ? 'All 3 Currents (Ia, Ib, Ic)' : 'Just One (Phase A)'}
              </button>
            )}

            {/* Measurement Cursors Toggle */}
            <button
              onClick={() => setShowCursors(!showCursors)}
              className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 text-[11px] ${
                showCursors
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Click on canvas to place cursors C1 & C2"
            >
              <Crosshair className="w-3 h-3" />
              Cursors
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 text-[11px]"
              title="Export waveform points to CSV"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>
        )}
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 w-full min-h-[380px] sm:min-h-[440px] rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col">
        {activeTab === 'oscilloscope' ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full flex-1 cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            />

            {/* Hover Tooltip HUD */}
            {hoverSample && mousePos && (
              <div
                className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 p-2 rounded-md shadow-xl text-[10px] font-mono z-20 backdrop-blur-md"
                style={{
                  left: Math.min(mousePos.x + 12, (canvasRef.current?.clientWidth || 300) - 150),
                  top: Math.max(10, mousePos.y - 70),
                }}
              >
                <div className="text-slate-400 pb-1 border-b border-slate-800">
                  θ: <span className="text-white font-bold">{hoverSample.thetaDeg.toFixed(1)}°</span> ({(hoverSample.time * 1000).toFixed(2)} ms)
                </div>
                <div className="text-emerald-400">
                  Vo: <span className="font-bold">{hoverSample.vOutput.toFixed(2)} V</span>
                </div>
                <div className="text-sky-400">
                  Io: <span className="font-bold">{hoverSample.iOutput.toFixed(3)} A</span>
                </div>
                <div className="text-orange-400">
                  {config.phase === '3-phase' ? 'Isa: ' : 'Is: '}
                  <span className="font-bold">{hoverSample.iSource.toFixed(3)} A</span>
                  {showAllPhasesCurrent && hoverSample.iSourceB !== undefined && (
                    <span className="text-[9px] text-amber-300 ml-1">
                      (b:{hoverSample.iSourceB.toFixed(2)}A, c:{hoverSample.iSourceC?.toFixed(2)}A)
                    </span>
                  )}
                </div>
                {config.phase === '3-phase' && config.wave === 'full-wave' && showLineVoltages && hoverSample.vLineAB !== undefined ? (
                  <div className="text-yellow-400">
                    Vab: <span className="font-bold">{hoverSample.vLineAB.toFixed(1)}V</span> | Vbc:{' '}
                    <span className="font-bold">{hoverSample.vLineBC?.toFixed(1)}V</span>
                  </div>
                ) : (
                  <div className="text-yellow-400">
                    Vs: <span className="font-bold">{hoverSample.vSourceA.toFixed(2)} V</span>
                    {config.phase === '3-phase' && hoverSample.vSourceB !== undefined && (
                      <span className="text-[9px] text-slate-400 ml-1">
                        (Vb:{hoverSample.vSourceB.toFixed(1)}V, Vc:{hoverSample.vSourceC?.toFixed(1)}V)
                      </span>
                    )}
                  </div>
                )}
                {hoverSample.conductingDevices && hoverSample.conductingDevices.length > 0 && (
                  <div className="text-purple-300 pt-0.5 border-t border-slate-800 text-[9px]">
                    ON: <span className="font-bold text-white">{hoverSample.conductingDevices.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cursor Delta HUD */}
            {cursorStats && (
              <div className="absolute top-2 left-2 bg-slate-900/90 border border-rose-500/40 rounded px-2 py-1 text-[10px] font-mono text-slate-300 z-10 shadow-lg">
                <span className="text-rose-400 font-bold">C1: {cursorStats.theta1}°</span> |{' '}
                <span className="text-purple-400 font-bold">C2: {cursorStats.theta2}°</span> |{' '}
                <span className="text-emerald-400 font-bold">Δθ: {cursorStats.deltaTheta}°</span> |{' '}
                <span className="text-sky-400 font-bold">Δt: {cursorStats.deltaT_ms}ms</span>
              </div>
            )}
          </>
        ) : (
          /* Harmonics Spectrum View (FFT) */
          <div className="w-full flex-1 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-300">
              <span className="font-bold text-sky-400">Harmonics Spectrum Analysis (Output Voltage)</span>
              <span>
                Ripple Frequency:{' '}
                <span className="text-emerald-400 font-bold">{metrics.rippleFreq} Hz</span>
              </span>
            </div>

            <div className="grid grid-cols-8 gap-2 my-auto pt-4 pb-2 items-end h-48">
              {simResult.harmonics.slice(0, 8).map((h) => {
                const heightPct = Math.min(100, Math.max(4, h.percentOfDc));
                const isDominant = h.percentOfDc > 10 && h.order > 0;
                return (
                  <div key={h.order} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-sky-300 transition-colors mb-1">
                      {h.percentOfDc.toFixed(1)}%
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-t transition-all ${
                        h.order === 0
                          ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm'
                          : isDominant
                          ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                          : 'bg-sky-600/70 hover:bg-sky-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-mono font-bold mt-2 text-slate-300">
                      {h.order === 0 ? 'DC' : `${h.order}f`}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {h.freq}Hz
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <div>
                Ripple Factor: <span className="text-emerald-400 font-bold">{metrics.rippleFactor.toFixed(3)}</span> |
                Form Factor: <span className="text-sky-400 font-bold">{metrics.formFactor.toFixed(3)}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Higher pulse count (3-Phase / Full-Wave) shifts harmonics to higher orders, simplifying DC filtering.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Timeline Playback & Angle Scrubber Controls */}
      <div className="flex flex-wrap items-center justify-between pt-2 mt-1 gap-2 text-xs font-mono">
        {/* Play/Pause & Speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition-all ${
              isPlaying
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {[0.1, 0.25, 0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  playSpeed === s
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Simulation Speed: ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Step Backward / Forward Buttons */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => onThetaChange((currentThetaDeg - 5 + totalThetaMax) % totalThetaMax)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Step Backward -5°"
            >
              -5°
            </button>
            <button
              onClick={() => onThetaChange((currentThetaDeg + 5) % totalThetaMax)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Step Forward +5°"
            >
              +5°
            </button>
          </div>

          <button
            onClick={() => onThetaChange(0)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Reset Angle to 0°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Angle Scrubber Slider */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="text-slate-400 text-[11px] whitespace-nowrap">
            θ (<span className="text-white font-bold">{currentThetaDeg.toFixed(0)}°</span> / {totalThetaMax}°):
          </span>
          <input
            type="range"
            min="0"
            max={totalThetaMax}
            step="1"
            value={currentThetaDeg}
            onChange={(e) => onThetaChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>
    </div>
  );
};
