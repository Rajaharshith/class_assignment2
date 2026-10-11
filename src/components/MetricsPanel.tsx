import React from 'react';
import { RectifierConfig, RectifierMetrics } from '../types/rectifier';
import {
  Activity,
  Gauge,
  Zap,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface MetricsPanelProps {
  metrics: RectifierMetrics;
  config: RectifierConfig;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, config }) => {
  const vDiffPct =
    metrics.theoreticalVDc > 0
      ? (((metrics.vDc - metrics.theoreticalVDc) / metrics.theoreticalVDc) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="w-full bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
            Electrical Performance & Power Metrics
          </h2>
        </div>

        {/* Conduction Mode Badge */}
        <div className="flex items-center gap-2">
          {config.loadType === 'RL' ? (
            metrics.isDiscontinuous ? (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <AlertTriangle className="w-3 h-3" />
                DCM (Discontinuous Mode)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" />
                CCM (Continuous Mode)
              </span>
            )
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Resistive Load (R)
            </span>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* V_dc */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Avg DC Voltage (Vdc)</span>
            <span className="text-emerald-400 font-bold">V_avg</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {metrics.vDc.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">V</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            Theory: {metrics.theoreticalVDc.toFixed(2)} V
          </div>
        </div>

        {/* V_rms */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>RMS Output (Vrms)</span>
            <span className="text-emerald-300 font-bold">V_rms</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
              {metrics.vRms.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">V</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            Theory: {metrics.theoreticalVRms.toFixed(2)} V
          </div>
        </div>

        {/* I_dc */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Avg DC Current (Idc)</span>
            <span className="text-sky-400 font-bold">I_avg</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-sky-400">
              {metrics.iDc.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-slate-400">A</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            I_dc = V_dc / R
          </div>
        </div>

        {/* I_rms */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>RMS Current (Irms)</span>
            <span className="text-sky-300 font-bold">I_rms</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-sky-300">
              {metrics.iRms.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-slate-400">A</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            Effective Heating Current
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
        {/* Ripple Factor */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] text-slate-400">Ripple Factor (RF)</span>
          <span className="text-amber-400 font-bold text-base mt-0.5">
            {metrics.rippleFactor.toFixed(3)}
          </span>
          <span className="text-[9px] text-slate-400">RF = √(FF² - 1)</span>
        </div>

        {/* Form Factor */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] text-slate-400">Form Factor (FF)</span>
          <span className="text-cyan-400 font-bold text-base mt-0.5">
            {metrics.formFactor.toFixed(3)}
          </span>
          <span className="text-[9px] text-slate-400">FF = Vrms / Vdc</span>
        </div>

        {/* Rectification Efficiency */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] text-slate-400">Efficiency (η)</span>
          <span className="text-emerald-400 font-bold text-base mt-0.5">
            {metrics.efficiency.toFixed(1)}%
          </span>
          <span className="text-[9px] text-slate-400">P_dc / P_ac</span>
        </div>

        {/* Power Pdc */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] text-slate-400">DC Power Output</span>
          <span className="text-violet-400 font-bold text-base mt-0.5">
            {metrics.pDc.toFixed(1)} W
          </span>
          <span className="text-[9px] text-slate-400">Vdc × Idc</span>
        </div>

        {/* Ripple Frequency */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 flex flex-col col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400">Ripple Frequency</span>
          <span className="text-rose-400 font-bold text-base mt-0.5">
            {metrics.rippleFreq} Hz
          </span>
          <span className="text-[9px] text-slate-400">
            {config.phase === '1-phase' ? (config.wave === 'half-wave' ? '1f' : '2f') : (config.wave === 'half-wave' ? '3f' : '6f')}
          </span>
        </div>
      </div>
    </div>
  );
};
