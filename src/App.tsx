import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RectifierConfig, SimulationResult } from './types/rectifier';
import { simulateRectifier } from './simulation/physicsEngine';
import { CircuitSchematic } from './components/CircuitSchematic';
import { WaveformViewer } from './components/WaveformViewer';
import { ControlPanel } from './components/ControlPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { TheoryPanel } from './components/TheoryPanel';
import { Zap } from 'lucide-react';

export default function App() {
  // Default Configuration: 1-Phase Full-Wave Diode Bridge with RL Load
  const [config, setConfig] = useState<RectifierConfig>({
    phase: '1-phase',
    device: 'diode',
    wave: 'full-wave',
    loadType: 'RL',
    resistance: 10, // 10 Ohms
    inductance: 0.05, // 50 mH
    useFWD: false,
    firingAngleDeg: 45, // Default alpha when switched to thyristor
    sourceVrms: 230,
    frequency: 50,
    cyclesToDisplay: 2,
  });

  // Interactive timeline & animation state
  const [currentThetaDeg, setCurrentThetaDeg] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(0.5);
  const [selectedProbe, setSelectedProbe] = useState<string>('load');

  // Run simulation engine
  const simResult: SimulationResult = useMemo(() => {
    return simulateRectifier(config);
  }, [config]);

  // Find active instantaneous sample for schematic visualization
  const totalThetaMax = (config.cyclesToDisplay || 2) * 360;
  const currentSample = useMemo(() => {
    if (!simResult.samples.length) return undefined;
    const normTheta = currentThetaDeg % totalThetaMax;
    let closest = simResult.samples[0];
    let minDiff = 999999;
    for (const s of simResult.samples) {
      const diff = Math.abs(s.thetaDeg - normTheta);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }
    return closest;
  }, [simResult.samples, currentThetaDeg, totalThetaMax]);

  // Smooth educational animation loop (calibrated for clear visual observation)
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      if (isPlaying) {
        // Base rate: 60 degrees per second at 1x speed.
        // At 0.5x speed: 30 degrees per second (one full 360° AC cycle takes 12 seconds).
        // This allows clear observation of diode/SCR commutation, firing pulses, and RL current decay.
        const baseDegreesPerSecond = 60;
        const deltaDeg = baseDegreesPerSecond * playSpeed * dt;
        setCurrentThetaDeg((prev) => (prev + deltaDeg) % totalThetaMax);
      }

      animId = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playSpeed, totalThetaMax]);

  // Handle Preset Selections
  const handleSelectPreset = (presetKey: string) => {
    switch (presetKey) {
      case '1p_hw_diode_r':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'diode',
          wave: 'half-wave',
          loadType: 'R',
          useFWD: false,
          resistance: 15,
        }));
        break;
      case '1p_fw_diode_r':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'diode',
          wave: 'full-wave',
          loadType: 'R',
          useFWD: false,
          resistance: 10,
        }));
        break;
      case '1p_fw_diode_rl':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'diode',
          wave: 'full-wave',
          loadType: 'RL',
          useFWD: false,
          resistance: 10,
          inductance: 0.05,
        }));
        break;
      case '1p_hw_scr_alpha60':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'thyristor',
          wave: 'half-wave',
          loadType: 'R',
          firingAngleDeg: 60,
          useFWD: false,
        }));
        break;
      case '1p_fw_scr_alpha45':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'thyristor',
          wave: 'full-wave',
          loadType: 'RL',
          firingAngleDeg: 45,
          useFWD: false,
          inductance: 0.08,
        }));
        break;
      case 'rl_fwd_comparison':
        setConfig((p) => ({
          ...p,
          phase: '1-phase',
          device: 'thyristor',
          wave: 'full-wave',
          loadType: 'RL',
          firingAngleDeg: 60,
          useFWD: true,
          inductance: 0.1,
        }));
        break;
      case '3p_hw_diode':
        setConfig((p) => ({
          ...p,
          phase: '3-phase',
          device: 'diode',
          wave: 'half-wave',
          loadType: 'R',
          useFWD: false,
          sourceVrms: 230,
        }));
        break;
      case '3p_fw_diode_6pulse':
        setConfig((p) => ({
          ...p,
          phase: '3-phase',
          device: 'diode',
          wave: 'full-wave',
          loadType: 'RL',
          useFWD: false,
          inductance: 0.04,
          sourceVrms: 400,
        }));
        break;
      case '3p_fw_scr_industrial':
        setConfig((p) => ({
          ...p,
          phase: '3-phase',
          device: 'thyristor',
          wave: 'full-wave',
          loadType: 'RL',
          firingAngleDeg: 30,
          useFWD: false,
          inductance: 0.05,
          sourceVrms: 400,
        }));
        break;
      default:
        break;
    }
  };

  const handleUpdateConfig = (newConfig: Partial<RectifierConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-5 h-5 fill-emerald-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-mono">
                  PowerRectify
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Lab Simulator
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Interactive 1Φ & 3Φ Diode and Thyristor Rectifier Simulator with R and R-L Loads
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-5 flex-1 flex flex-col gap-4">
        {/* TOP SECTION: RECTIFIER & LAB CONFIGURATION BLOCK */}
        <ControlPanel
          config={config}
          onChangeConfig={handleUpdateConfig}
          onSelectPreset={handleSelectPreset}
        />

        {/* PRIMARY WORKSPACE: SCHEMATIC (LEFT) & SIMULATION (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch w-full">
          {/* LEFT SIDE: Interactive Circuit Schematic */}
          <div className="flex flex-col h-full min-h-[460px]">
            <CircuitSchematic
              config={config}
              currentSample={currentSample}
              selectedProbe={selectedProbe}
              onSelectProbe={setSelectedProbe}
            />
          </div>

          {/* RIGHT SIDE: Interactive Waveform Simulation / Oscilloscope */}
          <div className="flex flex-col h-full min-h-[460px]">
            <WaveformViewer
              config={config}
              simResult={simResult}
              currentThetaDeg={currentThetaDeg}
              onThetaChange={setCurrentThetaDeg}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              playSpeed={playSpeed}
              onChangeSpeed={setPlaySpeed}
            />
          </div>
        </div>

        {/* PERFORMANCE & POWER METRICS DASHBOARD */}
        <MetricsPanel metrics={simResult.metrics} config={config} />

        {/* THEORY & MATHEMATICAL FORMULAS SECTION */}
        <TheoryPanel config={config} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-4 text-center text-xs font-mono text-slate-400">
        <p>
          PowerRectify · Interactive Power Electronics Laboratory Simulator · Real-time Differential Equation (RK4) Solver
        </p>
      </footer>
    </div>
  );
}
