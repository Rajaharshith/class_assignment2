import React, { useState } from 'react';
import { RectifierConfig } from '../types/rectifier';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Lightbulb } from 'lucide-react';

interface TheoryPanelProps {
  config: RectifierConfig;
}

export const TheoryPanel: React.FC<TheoryPanelProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { phase, device, wave, loadType, useFWD, firingAngleDeg } = config;

  return (
    <div className="w-full bg-slate-950/80 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-md overflow-hidden transition-all">
      {/* Toggle Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Theory, Equations & Operating Principles
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
            {phase} {wave} {device}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span>{isOpen ? 'Collapse' : 'Expand Formulas'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-800/80 flex flex-col gap-4 text-xs font-mono text-slate-300">
          {/* Active Topology Mathematical Derivation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Formulas Card */}
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-emerald-400 font-bold uppercase tracking-wide text-[11px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Closed-Form Mathematical Equations
              </span>

              {phase === '1-phase' && wave === 'half-wave' && device === 'diode' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">Average DC Voltage:</div>
                    <div className="text-emerald-300 font-bold text-sm">V_dc = Vm / π ≈ 0.318 · Vm</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">RMS Output Voltage:</div>
                    <div className="text-sky-300 font-bold text-sm">V_rms = Vm / 2 = 0.500 · Vm</div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Form Factor FF = 1.57 | Ripple Factor RF = 1.21 | Max Efficiency η = 40.6%
                  </div>
                </div>
              )}

              {phase === '1-phase' && wave === 'full-wave' && device === 'diode' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">Average DC Voltage:</div>
                    <div className="text-emerald-300 font-bold text-sm">V_dc = 2 · Vm / π ≈ 0.6366 · Vm</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">RMS Output Voltage:</div>
                    <div className="text-sky-300 font-bold text-sm">V_rms = Vm / √2 ≈ 0.7071 · Vm</div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Form Factor FF = 1.11 | Ripple Factor RF = 0.482 | Max Efficiency η = 81.2%
                  </div>
                </div>
              )}

              {phase === '1-phase' && wave === 'half-wave' && device === 'thyristor' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">Controlled DC Voltage (Firing Angle α):</div>
                    <div className="text-emerald-300 font-bold text-sm">
                      V_dc = (Vm / 2π) · (1 + cos α)
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">RMS Output Voltage:</div>
                    <div className="text-sky-300 font-bold text-sm">
                      V_rms = (Vm / 2) · √[1 - α/π + sin(2α)/(2π)]
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Delaying α from 0° to 180° smoothly varies V_dc from Vm/π down to 0V.
                  </div>
                </div>
              )}

              {phase === '1-phase' && wave === 'full-wave' && device === 'thyristor' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">
                      {loadType === 'RL' && !useFWD
                        ? 'Continuous Conduction (CCM without FWD):'
                        : 'Controlled Bridge (R Load or with FWD):'}
                    </div>
                    <div className="text-emerald-300 font-bold text-sm">
                      {loadType === 'RL' && !useFWD
                        ? 'V_dc = (2 · Vm / π) · cos α'
                        : 'V_dc = (Vm / π) · (1 + cos α)'}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    With high inductance without FWD, α &gt; 90° yields negative average voltage (line-commutated inverter mode!).
                  </div>
                </div>
              )}

              {phase === '3-phase' && wave === 'half-wave' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">3-Pulse Half-Wave DC Voltage:</div>
                    <div className="text-emerald-300 font-bold text-sm">
                      {device === 'diode'
                        ? 'V_dc = (3√3 · Vm,ph) / 2π ≈ 0.827 · Vm,ph'
                        : 'V_dc = (3√3 · Vm,ph / 2π) · cos α (for α ≤ 30°)'}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Ripple Frequency = 3 × f = 150 Hz (at 50Hz input). Each diode conducts for 120°.
                  </div>
                </div>
              )}

              {phase === '3-phase' && wave === 'full-wave' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400">6-Pulse Full-Wave Bridge DC Voltage:</div>
                    <div className="text-emerald-300 font-bold text-sm">
                      {device === 'diode'
                        ? 'V_dc = (3 · Vm,LL) / π = (3√3 · Vm,ph) / π ≈ 1.35 · Vrms,LL'
                        : 'V_dc = (3 · Vm,LL / π) · cos α ≈ 1.35 · Vrms,LL · cos α'}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Standard industrial Graetz bridge. Ripple frequency = 6 × f = 300 Hz. Extremely low ripple factor (RF ≈ 0.04).
                  </div>
                </div>
              )}
            </div>

            {/* Load Dynamics & Physics Explanation */}
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-sky-400 font-bold uppercase tracking-wide text-[11px] flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                Physical Principles: R vs R-L Load Dynamics
              </span>

              <div className="space-y-2 text-slate-300">
                <p>
                  <strong className="text-sky-300">Pure R Load:</strong> Load current tracks voltage perfectly ({' '}
                  <span className="text-emerald-300">i_o(t) = v_o(t) / R</span>). Switches turn off naturally at the instant voltage drops to zero.
                </p>

                <p>
                  <strong className="text-purple-300">Inductive (R-L) Load:</strong> Inductor energy storage ({' '}
                  <span className="text-purple-300">E = ½ L i²</span>) creates induced voltage{' '}
                  <span className="text-amber-300">e = -L(di/dt)</span> that opposes current reduction. This forces the diode/SCR to continue conducting past the AC voltage zero-crossing into the negative half cycle until current drops to 0 at the extinction angle <strong className="text-white">β &gt; π</strong>.
                </p>

                <p>
                  <strong className="text-emerald-300">Freewheeling Diode (FWD):</strong> When present across the load, the FWD turns on as soon as output voltage tends negative, clamping output voltage to 0V. The inductor current circulates freely through the FWD, preventing negative output voltage notches and smoothing load current!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
