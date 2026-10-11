import React from 'react';
import { LoadType, PhaseType, DeviceType, WaveType, RectifierConfig } from '../types/rectifier';
import {
  Cpu,
  Zap,
  Activity,
  SlidersHorizontal,
  Bookmark,
  ShieldCheck,
  Flame,
  Radio,
  Compass,
} from 'lucide-react';

interface ControlPanelProps {
  config: RectifierConfig;
  onChangeConfig: (newConfig: Partial<RectifierConfig>) => void;
  onSelectPreset: (presetKey: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  onSelectPreset,
}) => {
  const isThyristor = config.device === 'thyristor';
  const hasRL = config.loadType === 'RL';

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl backdrop-blur-md">
      {/* Top Heading */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
            Rectifier & Load Configuration
          </h2>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
          <select
            onChange={(e) => onSelectPreset(e.target.value)}
            defaultValue=""
            className="text-xs bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-slate-300 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="" disabled>
              Select Lab Preset...
            </option>
            <option value="1p_hw_diode_r">1Φ Half-Wave Diode (R only)</option>
            <option value="1p_fw_diode_r">1Φ Full-Wave Diode Bridge (R only)</option>
            <option value="1p_fw_diode_rl">1Φ Full-Wave Bridge (RL Load, 50mH)</option>
            <option value="1p_hw_scr_alpha60">1Φ Half-Wave SCR (α = 60°)</option>
            <option value="1p_fw_scr_alpha45">1Φ Controlled Bridge (α = 45°, RL)</option>
            <option value="rl_fwd_comparison">RL Load with Freewheeling Diode (FWD)</option>
            <option value="3p_hw_diode">3Φ Half-Wave Diode (3-Pulse Star)</option>
            <option value="3p_fw_diode_6pulse">3Φ Full-Wave Diode (6-Pulse Bridge)</option>
            <option value="3p_fw_scr_industrial">3Φ Fully Controlled Bridge (α = 30°)</option>
          </select>
        </div>
      </div>

      {/* TOPOLOGY CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Phase Selection: 1-Phase vs 3-Phase */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
          <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Supply Phases
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChangeConfig({ phase: '1-phase' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.phase === '1-phase'
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Phase (1Φ)
            </button>
            <button
              onClick={() => onChangeConfig({ phase: '3-phase' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.phase === '3-phase'
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              3-Phase (3Φ)
            </button>
          </div>
        </div>

        {/* Switch Device: Diode vs Thyristor */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
          <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Switch Element
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChangeConfig({ device: 'diode' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.device === 'diode'
                  ? 'bg-sky-500/20 border border-sky-500/60 text-sky-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Diode (Uncontrolled)
            </button>
            <button
              onClick={() => onChangeConfig({ device: 'thyristor' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.device === 'thyristor'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Thyristor (SCR)
            </button>
          </div>
        </div>

        {/* Wave Type: Half-Wave vs Full-Wave */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
          <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Waveform Topology
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChangeConfig({ wave: 'half-wave' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.wave === 'half-wave'
                  ? 'bg-purple-500/20 border border-purple-500/60 text-purple-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Half-Wave
            </button>
            <button
              onClick={() => onChangeConfig({ wave: 'full-wave' })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                config.wave === 'full-wave'
                  ? 'bg-purple-500/20 border border-purple-500/60 text-purple-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Full-Wave (Bridge)
            </button>
          </div>
        </div>
      </div>

      {/* THYRISTOR FIRING ANGLE CONTROLS (CONDITIONAL) */}
      {isThyristor && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Thyristor Firing Angle (α):</span>
              <span className="text-amber-300 text-sm bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40">
                {config.firingAngleDeg}°
              </span>
            </div>

            {/* Quick Angle Buttons */}
            <div className="flex items-center gap-1">
              {[0, 30, 45, 60, 90, 120].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onChangeConfig({ firingAngleDeg: deg })}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                    config.firingAngleDeg === deg
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400">0° (Diode mode)</span>
            <input
              type="range"
              min="0"
              max="170"
              step="1"
              value={config.firingAngleDeg}
              onChange={(e) => onChangeConfig({ firingAngleDeg: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] font-mono text-slate-400">170° (Inverter limit)</span>
          </div>
        </div>
      )}

      {/* LOAD PARAMETERS: R ONLY vs R-L */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Load Type & Freewheeling Diode */}
        <div className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Load Type Configuration
            </label>

            {/* FWD Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono">
              <input
                type="checkbox"
                checked={config.useFWD}
                onChange={(e) => onChangeConfig({ useFWD: e.target.checked })}
                className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className={config.useFWD ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                Freewheeling Diode (FWD)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeConfig({ loadType: 'R' })}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                config.loadType === 'R'
                  ? 'bg-sky-500/20 border border-sky-500/60 text-sky-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold text-sm">R Only</span>
              <span className="text-[10px] text-slate-400 font-normal">Purely Resistive</span>
            </button>

            <button
              onClick={() => onChangeConfig({ loadType: 'RL' })}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                config.loadType === 'RL'
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold text-sm">R - L Load</span>
              <span className="text-[10px] text-slate-400 font-normal">Resistive-Inductive</span>
            </button>
          </div>
        </div>

        {/* Load Value Sliders (R and L) */}
        <div className="flex flex-col justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
          {/* Resistance R Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Resistance (R):</span>
              <div className="flex items-center gap-1">
                <span className="text-sky-400 font-bold text-sm">{config.resistance}</span>
                <span className="text-slate-400">Ω</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono">1Ω</span>
              <input
                type="range"
                min="1"
                max="200"
                step="1"
                value={config.resistance}
                onChange={(e) => onChangeConfig({ resistance: parseFloat(e.target.value) })}
                className="flex-1 accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">200Ω</span>
            </div>
          </div>

          {/* Inductance L Slider */}
          <div className={`flex flex-col gap-1 transition-opacity ${hasRL ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Inductance (L):</span>
              <div className="flex items-center gap-1">
                <span className="text-purple-400 font-bold text-sm">
                  {(config.inductance * 1000).toFixed(0)}
                </span>
                <span className="text-slate-400">mH</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono">1mH</span>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.005"
                disabled={!hasRL}
                value={config.inductance}
                onChange={(e) => onChangeConfig({ inductance: parseFloat(e.target.value) })}
                className="flex-1 accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 font-mono">500mH</span>
            </div>
          </div>
        </div>
      </div>

      {/* AC SOURCE PARAMETERS */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono gap-3">
        <div className="flex items-center gap-3">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-slate-400">AC Source:</span>

          {/* Voltage Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-300 font-bold">{config.sourceVrms}V</span>
            <span className="text-slate-500">RMS</span>
          </div>
          <div className="flex items-center gap-1">
            {[24, 120, 230, 400].map((v) => (
              <button
                key={v}
                onClick={() => onChangeConfig({ sourceVrms: v })}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-all ${
                  config.sourceVrms === v
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}V
              </button>
            ))}
          </div>
        </div>

        {/* Frequency Selector */}
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Frequency:</span>
          <div className="flex items-center gap-1">
            {[50, 60, 400].map((f) => (
              <button
                key={f}
                onClick={() => onChangeConfig({ frequency: f })}
                className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                  config.frequency === f
                    ? 'bg-slate-700 border-slate-600 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f} Hz
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
