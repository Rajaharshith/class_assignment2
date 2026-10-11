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

  // Channel Visibility
  const [visibleChannels, setVisibleChannels] = useState({
    vSource: true,
    vOutput: true,
    iOutput: true,
    iSource: false,
    gatePulse: config.device === 'thyristor',
    vSwitch: false,
  });

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
    // SPLIT CANVAS INTO TWO DEDICATED GRAPHS:
    // Window 1 (Top): Voltage (V) - 54% of height
    // Window 2 (Bottom): Current (A) - 46% of height
    // ==========================================
    const splitY = Math.floor(height * 0.54);
    const vWindow = { yTop: 20, yBottom: splitY - 8, height: splitY - 28 };
    const iWindow = { yTop: splitY + 20, yBottom: height - 16, height: height - splitY - 36 };

    // Divider bar between Voltage & Current graphs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(width, splitY);
    ctx.stroke();

    // Horizontal degree grid markings across both windows
    const numVDivs = 10;
    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 1;

    for (let i = 0; i <= numVDivs; i++) {
      const x = (width / numVDivs) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Degree markings at the bottom of each window
      const deg = ((totalThetaMax / numVDivs) * i).toFixed(0);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${deg}°`, x + 3, splitY - 3);
      ctx.fillText(`${deg}°`, x + 3, height - 3);
    }

    // Dynamic Maximums
    let maxV = 100;
    let maxI = 5;
    for (const s of samples) {
      if (Math.abs(s.vSourceA) > maxV) maxV = Math.abs(s.vSourceA);
      if (Math.abs(s.vOutput) > maxV) maxV = Math.abs(s.vOutput);
      if (Math.abs(s.vSwitch1) > maxV) maxV = Math.abs(s.vSwitch1);
      if (s.iOutput > maxI) maxI = s.iOutput;
      if (Math.abs(s.iSource) > maxI) maxI = Math.abs(s.iSource);
    }
    maxV = maxV * 1.25;
    maxI = maxI * 1.35;

    const toX = (thetaDeg: number) => (thetaDeg / totalThetaMax) * width;

    // ========================================================
    // WINDOW 1: VOLTAGE GRAPH
    // ========================================================
    const vCenterY = vWindow.yTop + vWindow.height * 0.52;
    const vScale = (vWindow.height * 0.44) / maxV;
    const toY_V = (val: number) => vCenterY - val * vScale;

    // Window 1 Title Badge
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 4, 260, 15);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CH1: VOLTAGE [Vs (Dotted) vs Vo (Thick)]', 12, 15);

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
      // Phase A (Dotted Yellow)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]); // DOTTED LINE AS REQUESTED
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
    // WINDOW 2: SEPARATE CURRENT GRAPH (A)
    // ========================================================
    const iZeroY = iWindow.yBottom - 8;
    const iScale = (iWindow.height * 0.75) / maxI;
    const toY_I = (val: number) => iZeroY - val * iScale;

    // Window 2 Title Badge
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, splitY + 4, 240, 15);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CH2: CURRENT [Io (Load Current)]', 12, splitY + 15);

    // Current Zero-line Axis
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, iZeroY);
    ctx.lineTo(width, iZeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('0A', 4, iZeroY - 3);
    ctx.fillText(`+${maxI.toFixed(1)}A`, 4, iWindow.yTop + 10);

    // 1. Trace: Input AC Current (if enabled)
    if (visibleChannels.iSource) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_I(s.iSource);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Trace: Output Load Current Io (THICK SOLID SKY-BLUE LINE)
    if (visibleChannels.iOutput) {
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3.2; // THICK SOLID LINE
      ctx.setLineDash([]); // SOLID
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const x = toX(s.thetaDeg);
        const y = toY_I(s.iOutput);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Average DC Current Line
      const yIdc = toY_I(metrics.iDc);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, yIdc);
      ctx.lineTo(width, yIdc);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Idc = ${metrics.iDc.toFixed(2)}A`, width - 110, yIdc - 4);
    }

    // Measurement Cursors (spanning both windows)
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

    // Playhead / Instantaneous Scrubber (spanning both windows)
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

      // Current window dot (Io)
      if (visibleChannels.iOutput) {
        const dotY = toY_I(activeSample.iOutput);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(playheadX, dotY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [
    samples,
    visibleChannels,
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
          <span className="text-sky-400 font-extrabold text-xs font-mono bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">
            RIGHT
          </span>
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
              CH1: Vin (Dotted)
            </button>
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
              CH2: Io (Current)
            </button>

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
      <div className="relative flex-1 w-full min-h-[300px] sm:min-h-[350px] rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col">
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
                <div className="text-yellow-400">
                  Vs: <span className="font-bold">{hoverSample.vSourceA.toFixed(2)} V</span>
                </div>
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
