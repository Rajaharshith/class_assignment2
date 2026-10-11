import React from 'react';
import { RectifierConfig, SimulationSample } from '../types/rectifier';

interface CircuitSchematicProps {
  config: RectifierConfig;
  currentSample?: SimulationSample;
  selectedProbe?: string;
  onSelectProbe?: (probe: string) => void;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  config,
  currentSample,
  selectedProbe,
  onSelectProbe,
}) => {
  const { phase, device, wave, loadType, resistance, inductance, useFWD, firingAngleDeg } =
    config;
  const isThyristor = device === 'thyristor';
  const hasRL = loadType === 'RL';
  const conducting = currentSample?.conductingDevices || [];
  const gateActive = currentSample?.gatePulseActive || false;
  const hasCurrent = (currentSample?.iOutput || 0) > 0.02;

  const isConducting = (name: string) => conducting.includes(name);

  // Helper for drawing active/inactive wire with current flow animation
  const renderWire = (
    d: string,
    isActive: boolean,
    direction: 'fwd' | 'bwd' = 'fwd',
    baseColor: string = '#475569',
    activeColor: string = '#10b981'
  ) => {
    return (
      <g>
        {/* Base Wire */}
        <path
          d={d}
          fill="none"
          stroke={isActive && hasCurrent ? activeColor : baseColor}
          strokeWidth={isActive && hasCurrent ? '3' : '2.2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-100"
        />

        {/* Glow Layer when Active */}
        {isActive && hasCurrent && (
          <path
            d={d}
            fill="none"
            stroke={activeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
            className="filter blur-[2px]"
          />
        )}

        {/* Animated Current Flow Particles */}
        {isActive && hasCurrent && (
          <path
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={direction === 'fwd' ? 'current-flow-fwd' : 'current-flow-bwd'}
            opacity="0.9"
          />
        )}
      </g>
    );
  };

  // Helper for drawing a wire with background cutout mask behind wire jumpers (bridges)
  const renderJumperWire = (
    d: string,
    isActive: boolean,
    direction: 'fwd' | 'bwd' = 'fwd',
    baseColor: string = '#475569',
    activeColor: string = '#10b981'
  ) => {
    return (
      <g>
        {/* Background cutout mask to cleanly separate crossing wires underneath */}
        <path
          d={d}
          fill="none"
          stroke="#020617"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Base Wire */}
        <path
          d={d}
          fill="none"
          stroke={isActive && hasCurrent ? activeColor : baseColor}
          strokeWidth={isActive && hasCurrent ? '3' : '2.2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-100"
        />

        {/* Glow Layer when Active */}
        {isActive && hasCurrent && (
          <path
            d={d}
            fill="none"
            stroke={activeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
            className="filter blur-[2px]"
          />
        )}

        {/* Animated Current Flow Particles */}
        {isActive && hasCurrent && (
          <path
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={direction === 'fwd' ? 'current-flow-fwd' : 'current-flow-bwd'}
            opacity="0.9"
          />
        )}
      </g>
    );
  };

  // Junction Connection Dot
  const renderJunction = (x: number, y: number, active: boolean = false) => (
    <circle
      cx={x}
      cy={y}
      r="3.5"
      fill={active && hasCurrent ? '#10b981' : '#64748b'}
      stroke={active && hasCurrent ? '#34d399' : '#334155'}
      strokeWidth="1.5"
      className="transition-colors duration-100"
    />
  );

  // Directional current flow indicator arrow
  const renderCurrentArrow = (x: number, y: number, angleDeg: number, active: boolean) => {
    if (!active || !hasCurrent) return null;
    return (
      <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`}>
        <polygon points="-5,-4 5,0 -5,4" fill="#ffffff" className="animate-pulse" />
      </g>
    );
  };

  // Helper SVG component for Diode or Thyristor
  // In bridge rectifiers, diodes point UP (from bottom to top positive bus)
  const renderSwitch = (
    id: string,
    x: number,
    y: number,
    direction: 'down' | 'up' | 'right' | 'left' = 'up',
    label: string
  ) => {
    const active = isConducting(id);
    const rotation =
      direction === 'down' ? 90 : direction === 'up' ? -90 : direction === 'left' ? 180 : 0;

    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer transition-all duration-150"
        onClick={() => onSelectProbe?.(`switch_${id}`)}
      >
        <g transform={`rotate(${rotation})`}>
          {/* Active glow backing */}
          {active && hasCurrent && (
            <circle
              cx="0"
              cy="0"
              r="22"
              fill="rgba(16, 185, 129, 0.35)"
              className="animate-pulse filter blur-sm"
            />
          )}

          {/* Diode Triangle (points from -12 to +6) */}
          <polygon
            points="-12,-10 -12,10 6,0"
            fill={active && hasCurrent ? '#10b981' : '#1e293b'}
            stroke={active && hasCurrent ? '#34d399' : '#64748b'}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Diode Cathode Bar */}
          <line
            x1="6"
            y1="-11"
            x2="6"
            y2="11"
            stroke={active && hasCurrent ? '#34d399' : '#64748b'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Thyristor Gate Terminal (Never on Freewheeling Diode FWD) */}
          {isThyristor && id !== 'FWD' && (
            <g>
              <path
                d="M 6,5 L 12,13 L 18,13"
                fill="none"
                stroke={gateActive && active ? '#fbbf24' : '#94a3b8'}
                strokeWidth={gateActive && active ? '2.5' : '1.8'}
              />
              {gateActive && active && (
                <circle cx="18" cy="13" r="3" fill="#fbbf24" className="animate-ping" />
              )}
            </g>
          )}
        </g>

        {/* Device Label */}
        <text
          x={direction === 'up' || direction === 'down' ? 18 : 0}
          y={direction === 'up' || direction === 'down' ? 4 : -18}
          fill={active && hasCurrent ? '#34d399' : '#94a3b8'}
          fontSize="11"
          fontWeight="bold"
          textAnchor={direction === 'up' || direction === 'down' ? 'start' : 'middle'}
          className="select-none font-mono"
        >
          {label}
        </text>

        {/* State Badge */}
        {active && hasCurrent && (
          <text
            x={direction === 'up' || direction === 'down' ? 18 : 0}
            y={direction === 'up' || direction === 'down' ? 16 : -6}
            fill="#10b981"
            fontSize="8"
            fontWeight="bold"
            textAnchor={direction === 'up' || direction === 'down' ? 'start' : 'middle'}
            className="select-none uppercase font-mono tracking-wider"
          >
            ON
          </text>
        )}
      </g>
    );
  };

  // Resistor symbol (zigzag) with proper pin endpoints
  const renderResistor = (x: number, yTop: number, yBottom: number, active: boolean) => {
    const totalHeight = yBottom - yTop;
    const pad = Math.max(8, (totalHeight - 44) / 2);
    const startY = yTop + pad;
    const endY = yBottom - pad;
    const step = (endY - startY) / 6;

    const pathData = `
      M ${x},${yTop} 
      L ${x},${startY} 
      L ${x - 8},${startY + step} 
      L ${x + 8},${startY + step * 2} 
      L ${x - 8},${startY + step * 3} 
      L ${x + 8},${startY + step * 4} 
      L ${x - 8},${startY + step * 5} 
      L ${x},${endY} 
      L ${x},${yBottom}
    `;

    return (
      <g>
        {renderWire(pathData, active, 'fwd', '#475569', '#38bdf8')}
        <text
          x={x + 16}
          y={(yTop + yBottom) / 2 + 4}
          fill={active && hasCurrent ? '#38bdf8' : '#94a3b8'}
          fontSize="11"
          fontWeight="bold"
          className="font-mono select-none"
        >
          R={resistance}Ω
        </text>
      </g>
    );
  };

  // Inductor symbol (coiled loops) with proper pin endpoints
  const renderInductor = (x: number, yTop: number, yBottom: number, active: boolean) => {
    const totalHeight = yBottom - yTop;
    const lead = Math.max(6, (totalHeight - 48) / 2);
    const y1 = yTop + lead;
    const y2 = yBottom - lead;
    const loopH = (y2 - y1) / 4;

    const pathData = `
      M ${x},${yTop}
      L ${x},${y1}
      C ${x + 14},${y1} ${x + 14},${y1 + loopH} ${x},${y1 + loopH}
      C ${x + 14},${y1 + loopH} ${x + 14},${y1 + loopH * 2} ${x},${y1 + loopH * 2}
      C ${x + 14},${y1 + loopH * 2} ${x + 14},${y1 + loopH * 3} ${x},${y1 + loopH * 3}
      C ${x + 14},${y1 + loopH * 3} ${x + 14},${y2} ${x},${y2}
      L ${x},${yBottom}
    `;

    return (
      <g>
        {renderWire(pathData, active, 'fwd', '#475569', '#a78bfa')}
        <text
          x={x + 18}
          y={(yTop + yBottom) / 2 + 4}
          fill={active && hasCurrent ? '#a78bfa' : '#94a3b8'}
          fontSize="11"
          fontWeight="bold"
          className="font-mono select-none"
        >
          L={(inductance * 1000).toFixed(0)}mH
        </text>
      </g>
    );
  };

  // Complete Load Assembly (Resistor + optional Inductor) solidly connected between top bus and bottom bus
  const renderLoadAssembly = (x: number, yTopBus: number, yBottomBus: number, active: boolean) => {
    if (!hasRL) {
      // Pure R load: Resistor spans the full vertical drop with lead wires
      const rTop = yTopBus + 18;
      const rBottom = yBottomBus - 18;
      return (
        <g>
          {/* Wire from Top Bus into Resistor */}
          {renderWire(`M ${x},${yTopBus} L ${x},${rTop}`, active, 'fwd')}
          {/* Resistor body */}
          {renderResistor(x, rTop, rBottom, active)}
          {/* Wire from Resistor into Bottom Bus */}
          {renderWire(`M ${x},${rBottom} L ${x},${yBottomBus}`, active, 'fwd')}
          {/* Bus connection terminals */}
          {renderJunction(x, yTopBus, active)}
          {renderJunction(x, yBottomBus, active)}
          {renderCurrentArrow(x, (yTopBus + rTop) / 2, 90, active)}
          {renderCurrentArrow(x, (rBottom + yBottomBus) / 2, 90, active)}
        </g>
      );
    } else {
      // RL load: Resistor in upper half, Inductor in lower half, connected in series
      const midY = (yTopBus + yBottomBus) / 2;
      const rTop = yTopBus + 15;
      const rBottom = midY - 10;
      const lTop = midY + 10;
      const lBottom = yBottomBus - 15;

      return (
        <g>
          {/* Wire into Resistor */}
          {renderWire(`M ${x},${yTopBus} L ${x},${rTop}`, active, 'fwd')}
          {renderResistor(x, rTop, rBottom, active)}

          {/* Series wire between Resistor and Inductor */}
          {renderWire(`M ${x},${rBottom} L ${x},${lTop}`, active, 'fwd')}
          {renderInductor(x, lTop, lBottom, active)}

          {/* Wire out of Inductor to Bottom Bus */}
          {renderWire(`M ${x},${lBottom} L ${x},${yBottomBus}`, active, 'fwd')}

          {/* Bus connection terminals */}
          {renderJunction(x, yTopBus, active)}
          {renderJunction(x, yBottomBus, active)}

          {renderCurrentArrow(x, (yTopBus + rTop) / 2, 90, active)}
          {renderCurrentArrow(x, midY, 90, active)}
          {renderCurrentArrow(x, (lBottom + yBottomBus) / 2, 90, active)}
        </g>
      );
    }
  };

  // AC Source symbol with active conduction state & through-current animation
  // Standard Clean AC Source Symbol
  const renderAcSource = (
    x: number,
    y: number,
    label: string = 'Vs',
    color: string = '#60a5fa',
    isActive: boolean = false
  ) => {
    const active = isActive && hasCurrent;
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer transition-all duration-150"
        onClick={() => onSelectProbe?.('source')}
      >
        {/* Active glowing backing */}
        {active && (
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="rgba(16, 185, 129, 0.2)"
            className="animate-pulse filter blur-sm"
          />
        )}

        {/* Source Circular Housing */}
        <circle
          cx="0"
          cy="0"
          r="18"
          fill="#0f172a"
          stroke={active ? '#10b981' : color}
          strokeWidth={active ? '2.8' : '2.2'}
        />

        {/* Crisp Sine Wave inside */}
        <path
          d="M -10,0 Q -5,-9 0,0 T 10,0"
          fill="none"
          stroke={active ? '#34d399' : color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Source Label */}
        <text
          x="-24"
          y="4"
          fill={active ? '#34d399' : color}
          fontSize="11"
          fontWeight="bold"
          textAnchor="end"
          className="font-mono select-none"
        >
          {label}
        </text>
      </g>
    );
  };

  // Freewheeling Diode branch across Top & Bottom DC rails
  const renderFWDBranch = (x: number, yTop: number, yBottom: number) => {
    if (!useFWD) return null;
    const fwdActive = isConducting('FWD');
    const midY = (yTop + yBottom) / 2;

    return (
      <g>
        {/* Junction at Top Bus */}
        {renderJunction(x, yTop, fwdActive)}

        {/* Wire from FWD Cathode UP to Top Bus (current leaves cathode upward into top bus) */}
        {renderWire(`M ${x},${midY - 14} L ${x},${yTop}`, fwdActive, 'fwd')}
        {fwdActive && renderCurrentArrow(x, (yTop + midY - 14) / 2, -90, fwdActive)}

        {/* FWD Diode (Cathode top, Anode bottom: points UP) */}
        {renderSwitch('FWD', x, midY, 'up', 'FWD')}

        {/* Wire from Bottom Bus UP to FWD Anode (current enters anode upward from bottom rail) */}
        {renderWire(`M ${x},${yBottom} L ${x},${midY + 14}`, fwdActive, 'fwd')}
        {fwdActive && renderCurrentArrow(x, (yBottom + midY + 14) / 2, -90, fwdActive)}

        {/* Junction at Bottom Bus */}
        {renderJunction(x, yBottom, fwdActive)}

        {fwdActive && (
          <text
            x={x + 18}
            y={midY + 4}
            fill="#34d399"
            fontSize="9"
            fontWeight="bold"
            className="animate-pulse font-mono select-none"
          >
            FREEWHEELING
          </text>
        )}
      </g>
    );
  };

  // Determine current path narrative for user clarity
  const getCurrentLoopText = () => {
    if (!hasCurrent) return 'Current Extinct / Discontinuous Conduction (DCM)';
    if (isConducting('FWD')) {
      return 'FWD Circulating: Load(-) ➔ FWD (Anode to Cathode) ➔ Load(+) ➔ Down through Load';
    }
    if (phase === '1-phase' && wave === 'half-wave') {
      const sw = isThyristor ? 'T1' : 'D1';
      return `Forward Loop: Vs(+) ➔ ${sw} (Anode to Cathode) ➔ Top Bus ➔ Load ➔ Neutral Return ➔ Vs(-)`;
    }
    if (phase === '1-phase' && wave === 'full-wave') {
      if (isConducting('D1') || isConducting('T1')) {
        const sw1 = isThyristor ? 'T1' : 'D1';
        const sw2 = isThyristor ? 'T2' : 'D2';
        return `Positive Half Loop: Vs(+) ➔ Leg 1 Midpoint ➔ ${sw1} (UP) ➔ Top (+) Bus ➔ Load ➔ Bottom (-) Bus ➔ ${sw2} (UP) ➔ Leg 2 Midpoint ➔ Vs(-)`;
      } else {
        const sw3 = isThyristor ? 'T3' : 'D3';
        const sw4 = isThyristor ? 'T4' : 'D4';
        return `Negative Half Loop: Vs(-) ➔ Leg 2 Midpoint ➔ ${sw3} (UP) ➔ Top (+) Bus ➔ Load ➔ Bottom (-) Bus ➔ ${sw4} (UP) ➔ Leg 1 Midpoint ➔ Vs(+)`;
      }
    }
    if (phase === '3-phase' && wave === 'half-wave') {
      const activeSw = conducting.find((c) => c !== 'FWD') || 'D1';
      return `3-Pulse Star Loop: Phase (${activeSw}) ➔ ${activeSw} ➔ Top Common Cathode Bus ➔ Load ➔ Neutral (N) Return ➔ Star Point`;
    }
    if (phase === '3-phase' && wave === 'full-wave') {
      return `6-Pulse Bridge Loop: AC Phase ➔ Top Sw (${conducting[0] || 'T1'}) ➔ (+) Bus ➔ Load ➔ (-) Bus ➔ Bottom Sw (${conducting[1] || 'T2'}) ➔ Return AC Phase`;
    }
    return conducting.join(' + ');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950/90 rounded-xl border border-slate-800/80 p-3 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Schematic Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
            Circuit Schematic
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal hidden sm:inline-block">
              {phase === '1-phase' ? '1Φ Single Phase' : '3Φ Three Phase'} ·{' '}
              {wave === 'half-wave' ? 'Half-Wave' : 'Full-Wave Bridge'} ·{' '}
              {isThyristor ? `Thyristor (α=${firingAngleDeg}°)` : 'Diode'}
            </span>
          </h3>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-400">Vo:</span>
            <span className="text-emerald-400 font-bold">
              {currentSample?.vOutput.toFixed(1) ?? '0.0'} V
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-400">Io:</span>
            <span className="text-sky-400 font-bold">
              {currentSample?.iOutput.toFixed(2) ?? '0.00'} A
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-400">θ:</span>
            <span className="text-amber-400 font-bold">
              {((currentSample?.thetaDeg ?? 0) % 360).toFixed(0)}°
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-[320px] sm:min-h-[360px]">
        {/* Background Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #38bdf8 1.2px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* ========================================================= */}
        {/* TOPOLOGY 1: 1-PHASE HALF-WAVE SCHEMATIC */}
        {/* ========================================================= */}
        {phase === '1-phase' && wave === 'half-wave' && (() => {
          const swActive = isConducting(isThyristor ? 'T1' : 'D1');
          const fwdActive = isConducting('FWD');
          const loadActive = (swActive || fwdActive) && hasCurrent;

          return (
            <svg viewBox="0 0 540 300" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[380px] select-none">
              {/* AC Source */}
              {renderAcSource(70, 150, 'Vs', '#60a5fa', swActive)}

              {/* Wire from Vs to Switch Anode */}
              {renderWire('M 70,132 L 70,70 L 195,70', swActive, 'fwd', '#60a5fa')}
              {renderCurrentArrow(130, 70, 0, swActive)}

              {/* Main Switch (D1 / T1) pointing RIGHT */}
              {renderSwitch(isThyristor ? 'T1' : 'D1', 205, 70, 'right', isThyristor ? 'T1' : 'D1')}

              {/* Top Positive Rail: Switch Cathode (218) to FWD (340) - only active if Switch conducts */}
              {renderWire('M 218,70 L 340,70', swActive, 'fwd')}
              {renderCurrentArrow(280, 70, 0, swActive)}

              {/* Top Positive Rail: FWD (340) to Load (440) - active if Switch OR FWD conducts */}
              {renderWire('M 340,70 L 440,70', swActive || fwdActive, 'fwd')}
              {renderCurrentArrow(390, 70, 0, swActive || fwdActive)}

              {/* Optional FWD Branch */}
              {renderFWDBranch(340, 70, 240)}

              {/* Solidly Connected Load Assembly */}
              {renderLoadAssembly(440, 70, 240, loadActive)}

              {/* Bottom Neutral Return Rail: Load (440) to FWD (340) - active if Switch OR FWD conducts */}
              {renderWire('M 440,240 L 340,240', swActive || fwdActive, 'fwd')}
              {renderCurrentArrow(390, 240, 180, swActive || fwdActive)}

              {/* Bottom Neutral Return Rail: FWD (340) back to Source (70) - only active if Switch conducts */}
              {renderWire('M 340,240 L 70,240 L 70,168', swActive, 'fwd', '#64748b')}
              {renderCurrentArrow(200, 240, 180, swActive)}

              {/* Neutral Earth Symbol */}
              <path d="M 70,240 L 70,256 M 62,256 L 78,256 M 65,261 L 75,261 M 68,266 L 72,266" stroke="#64748b" strokeWidth="1.8" />
              <text x="85" y="260" fill="#64748b" fontSize="10" className="font-mono">Neutral N</text>

              {/* Output Voltage Annotation */}
              <g transform="translate(485, 155)">
                <line x1="0" y1="-70" x2="0" y2="70" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="0,-70 -4,-60 4,-60" fill="#10b981" />
                <polygon points="0,70 -4,60 4,60" fill="#10b981" />
                <text x="12" y="4" fill="#34d399" fontSize="12" fontWeight="bold" className="font-mono">
                  + Vo -
                </text>
              </g>
            </svg>
          );
        })()}

        {/* ========================================================= */}
        {/* TOPOLOGY 2: 1-PHASE FULL-WAVE BRIDGE SCHEMATIC */}
        {/* ALL DIODES POINT UP (Anode at bottom/midpoint, Cathode at top/midpoint) */}
        {/* ========================================================= */}
        {phase === '1-phase' && wave === 'full-wave' && (() => {
          const pair1Active = isConducting('D1') || isConducting('T1'); // Positive half: D1 & D2
          const pair2Active = isConducting('D3') || isConducting('T3'); // Negative half: D3 & D4
          const fwdActive = isConducting('FWD');
          const loadActive = (pair1Active || pair2Active || fwdActive) && hasCurrent;

          return (
            <svg viewBox="0 0 600 310" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[380px] select-none">
              {/* AC Source */}
              {renderAcSource(70, 150, 'Vs', '#60a5fa', pair1Active || pair2Active)}

              {/* AC Source Line A (Live): Goes DIRECTLY into Leg 1 Midpoint Junction at (190, 135) IN BETWEEN D1 and D4 */}
              {renderWire(
                'M 88,135 L 190,135',
                pair1Active || pair2Active,
                pair1Active ? 'fwd' : 'bwd',
                '#60a5fa'
              )}
              {renderCurrentArrow(135, 135, pair1Active ? 0 : 180, pair1Active || pair2Active)}
              {/* Midpoint Junction 1 cleanly in between D1 and D4 */}
              {renderJunction(190, 135, pair1Active || pair2Active)}

              {/* AC Source Line B (Neutral): Goes DIRECTLY into Leg 2 Midpoint Junction at (290, 165) IN BETWEEN D3 and D2 */}
              {/* Features clean semicircular jumper arc over Leg 1 at x=190 with background cutout */}
              {renderJumperWire(
                'M 88,165 L 182,165 A 8 8 0 0 1 198,165 L 290,165',
                pair1Active || pair2Active,
                pair1Active ? 'bwd' : 'fwd',
                '#93c5fd'
              )}
              {renderCurrentArrow(135, 165, pair1Active ? 180 : 0, pair1Active || pair2Active)}
              {renderCurrentArrow(245, 165, pair1Active ? 180 : 0, pair1Active || pair2Active)}
              {/* Midpoint Junction 2 cleanly in between D3 and D2 */}
              {renderJunction(290, 165, pair1Active || pair2Active)}

              {/* LEG 1 (x=190): Top D1 (points UP, center y=90), Bottom D4 (points UP, center y=210) */}
              {/* Midpoint (190, 135) UP to D1 Anode */}
              {renderWire('M 190,135 L 190,100', pair1Active, 'fwd')}
              {renderCurrentArrow(190, 115, -90, pair1Active)}
              {/* Switch D1: centered at y=90, points UP */}
              {renderSwitch(isThyristor ? 'T1' : 'D1', 190, 90, 'up', isThyristor ? 'T1' : 'D1')}
              {/* D1 Cathode (y=80) UP to Top (+) DC Bus (y=50) */}
              {renderWire('M 190,80 L 190,50', pair1Active, 'fwd')}

              {/* Leg 1 Bottom (y=250) to D4 Anode (y=220) */}
              {renderWire('M 190,250 L 190,220', pair2Active, 'fwd')}
              {/* Switch D4: centered at y=210, points UP */}
              {renderSwitch(isThyristor ? 'T4' : 'D4', 190, 210, 'up', isThyristor ? 'T4' : 'D4')}
              {/* D4 Cathode (y=200) UP to Midpoint Junction (190, 135) */}
              {renderWire('M 190,200 L 190,135', pair2Active, 'fwd')}
              {renderCurrentArrow(190, 185, -90, pair2Active)}

              {/* LEG 2 (x=290): Top D3 (points UP, center y=90), Bottom D2 (points UP, center y=210) */}
              {/* Midpoint (290, 165) UP to D3 Anode */}
              {renderWire('M 290,165 L 290,100', pair2Active, 'fwd')}
              {renderCurrentArrow(290, 125, -90, pair2Active)}
              {/* Switch D3: centered at y=90, points UP */}
              {renderSwitch(isThyristor ? 'T3' : 'D3', 290, 90, 'up', isThyristor ? 'T3' : 'D3')}
              {/* D3 Cathode (y=80) UP to Top (+) DC Bus (y=50) */}
              {renderWire('M 290,80 L 290,50', pair2Active, 'fwd')}

              {/* Leg 2 Bottom (y=250) to D2 Anode (y=220) */}
              {renderWire('M 290,250 L 290,220', pair1Active, 'fwd')}
              {/* Switch D2: centered at y=210, points UP */}
              {renderSwitch(isThyristor ? 'T2' : 'D2', 290, 210, 'up', isThyristor ? 'T2' : 'D2')}
              {/* D2 Cathode (y=200) UP to Midpoint Junction (290, 165) */}
              {renderWire('M 290,200 L 290,165', pair1Active, 'fwd')}
              {renderCurrentArrow(290, 185, -90, pair1Active)}

              {/* TOP POSITIVE DC BUS (y=50) */}
              {/* Segment 1: from D1 (190) to D3 (290) - ONLY active when pair1Active (current leaves D1 to load) */}
              {renderWire('M 190,50 L 290,50', pair1Active, 'fwd')}
              {/* Segment 2: from D3 (290) to FWD (380) - active when bridge conducts */}
              {renderWire('M 290,50 L 380,50', pair1Active || pair2Active, 'fwd')}
              {/* Segment 3: from FWD (380) to Load (480) - active when bridge OR FWD conducts */}
              {renderWire('M 380,50 L 480,50', pair1Active || pair2Active || fwdActive, 'fwd')}
              {renderJunction(190, 50, pair1Active)}
              {renderJunction(290, 50, pair2Active)}
              {renderCurrentArrow(430, 50, 0, pair1Active || pair2Active || fwdActive)}
              <text x="330" y="42" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                + DC BUS
              </text>

              {/* BOTTOM NEGATIVE DC BUS (y=250) */}
              {/* Segment 1: from Load (480) to FWD (380) - active when bridge OR FWD conducts */}
              {renderWire('M 480,250 L 380,250', pair1Active || pair2Active || fwdActive, 'fwd')}
              {renderCurrentArrow(430, 250, 180, pair1Active || pair2Active || fwdActive)}

              {/* Segment 2: from FWD (380) to D2 (290) - active only when bridge conducts */}
              {renderWire('M 380,250 L 290,250', pair1Active || pair2Active, 'fwd')}
              {renderJunction(290, 250, pair1Active)}

              {/* Segment 3: from D2 (290) to D4 (190) - ONLY active when pair2Active (current returns to D4)! */}
              {/* In positive half (pair1Active), current enters D2 and goes UP. ZERO current flows to D4! */}
              {renderWire('M 290,250 L 190,250', pair2Active, 'fwd')}
              {renderJunction(190, 250, pair2Active)}
              <text x="330" y="265" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                - DC BUS
              </text>

              {/* Optional FWD Branch */}
              {renderFWDBranch(380, 50, 250)}

              {/* Solidly Connected Load Assembly (downward flow) */}
              {renderLoadAssembly(480, 50, 250, loadActive)}

              {/* Output Voltage Annotation */}
              <g transform="translate(525, 150)">
                <line x1="0" y1="-80" x2="0" y2="80" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="0,-80 -4,-70 4,-70" fill="#10b981" />
                <polygon points="0,80 -4,70 4,70" fill="#10b981" />
                <text x="10" y="4" fill="#34d399" fontSize="11" fontWeight="bold" className="font-mono">
                  + Vo -
                </text>
              </g>
            </svg>
          );
        })()}

        {/* ========================================================= */}
        {/* TOPOLOGY 3: 3-PHASE HALF-WAVE (Star / 3-Pulse) SCHEMATIC */}
        {/* ========================================================= */}
        {phase === '3-phase' && wave === 'half-wave' && (() => {
          const phA = isConducting('D1') || isConducting('T1');
          const phB = isConducting('D2') || isConducting('T2');
          const phC = isConducting('D3') || isConducting('T3');
          const fwdActive = isConducting('FWD');
          const anyActive = (phA || phB || phC || fwdActive) && hasCurrent;

          const acActive = phA || phB || phC;
          const loadActive = (acActive || fwdActive) && hasCurrent;

          return (
            <svg viewBox="0 0 620 310" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[380px] select-none">
              {/* Star Center Point N at (25, 145).
                  Each phase connects independently to Star Point N.
                  Neutral current ONLY flows into the branch of the ACTIVE phase! */}

              {/* Branch A: From Star Point (25, 145) up to Va neutral terminal (52, 75) - Active ONLY if Phase A conducts */}
              {renderWire('M 25,145 L 25,75 L 52,75', phA, 'fwd', '#64748b')}
              {renderJunction(25, 75, phA)}
              {phA && renderCurrentArrow(25, 110, -90, phA)}

              {/* Branch B: From Star Point (25, 145) into Vb neutral terminal (52, 145) - Active ONLY if Phase B conducts */}
              {renderWire('M 25,145 L 52,145', phB, 'fwd', '#64748b')}
              {phB && renderCurrentArrow(38, 145, 0, phB)}

              {/* Branch C: From Star Point (25, 145) down to Vc neutral terminal (52, 215) - Active ONLY if Phase C conducts */}
              {renderWire('M 25,145 L 25,215 L 52,215', phC, 'fwd', '#64748b')}
              {renderJunction(25, 215, phC)}
              {phC && renderCurrentArrow(25, 180, 90, phC)}

              {/* Central Star Point Junction at (25, 145) */}
              {renderJunction(25, 145, acActive && hasCurrent)}
              {/* Neutral Star Label & Ground Reference */}
              <text x="18" y="137" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="end" className="font-mono">
                Star (N)
              </text>
              <path d="M 25,145 L 12,145 M 12,137 L 12,153 M 9,140 L 9,150 M 6,143 L 6,147" stroke="#64748b" strokeWidth="1.6" />

              {/* 3-Phase AC Sources */}
              {renderAcSource(70, 75, 'Va', '#ef4444', phA)}
              {renderAcSource(70, 145, 'Vb', '#eab308', phB)}
              {renderAcSource(70, 215, 'Vc', '#3b82f6', phC)}

              {/* Phase Lines to Switches (Point RIGHT) */}
              {/* Phase A to Switch 1 */}
              {renderWire('M 88,75 L 195,75', phA, 'fwd', '#ef4444')}
              {renderCurrentArrow(140, 75, 0, phA)}
              {renderSwitch(isThyristor ? 'T1' : 'D1', 205, 75, 'right', isThyristor ? 'T1' : 'D1')}

              {/* Phase B to Switch 2 */}
              {renderWire('M 88,145 L 195,145', phB, 'fwd', '#eab308')}
              {renderCurrentArrow(140, 145, 0, phB)}
              {renderSwitch(isThyristor ? 'T2' : 'D2', 205, 145, 'right', isThyristor ? 'T2' : 'D2')}

              {/* Phase C to Switch 3 */}
              {renderWire('M 88,215 L 195,215', phC, 'fwd', '#3b82f6')}
              {renderCurrentArrow(140, 215, 0, phC)}
              {renderSwitch(isThyristor ? 'T3' : 'D3', 205, 215, 'right', isThyristor ? 'T3' : 'D3')}

              {/* Common Cathode Positive DC Bus: all cathodes tie UP to top rail at y=55 */}
              {/* Switch 1 cathode to top rail (235, 55) */}
              {renderWire('M 218,75 L 235,75 L 235,55', phA, 'fwd')}
              {/* Switch 2 cathode to top rail (265, 55) */}
              {renderWire('M 218,145 L 265,145 L 265,55', phB, 'fwd')}
              {/* Switch 3 cathode to top rail (295, 55) */}
              {renderWire('M 218,215 L 295,215 L 295,55', phC, 'fwd')}

              {/* TOP POSITIVE DC BUS (y=55) - SEGMENTED */}
              {/* Segment 1: from Switch 1 (235) to Switch 2 (265) - ONLY active if Phase A conducts */}
              {renderWire('M 235,55 L 265,55', phA, 'fwd')}
              {/* Segment 2: from Switch 2 (265) to Switch 3 (295) - active if Phase A or Phase B conducts */}
              {renderWire('M 265,55 L 295,55', phA || phB, 'fwd')}
              {/* Segment 3: from Switch 3 (295) to FWD (410) - active if ANY AC phase conducts */}
              {renderWire('M 295,55 L 410,55', acActive, 'fwd')}
              {/* Segment 4: from FWD (410) to Load (480) - active if ANY AC phase OR FWD conducts */}
              {renderWire('M 410,55 L 480,55', acActive || fwdActive, 'fwd')}

              {renderJunction(235, 55, phA)}
              {renderJunction(265, 55, phB)}
              {renderJunction(295, 55, phC)}
              {renderCurrentArrow(445, 55, 0, acActive || fwdActive)}
              <text x="330" y="45" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                + COMMON CATHODE BUS
              </text>

              {/* Optional FWD Branch */}
              {renderFWDBranch(410, 55, 260)}

              {/* Solidly Connected Load Assembly between y=55 (Top Bus) and y=260 (Neutral Rail) */}
              {renderLoadAssembly(480, 55, 260, loadActive)}

              {/* BOTTOM NEUTRAL RETURN BUS (y=260) - SEGMENTED */}
              {/* Segment 1: from Load (480) to FWD (410) - active if ANY AC phase OR FWD conducts */}
              {renderWire('M 480,260 L 410,260', acActive || fwdActive, 'fwd', '#64748b')}
              {renderCurrentArrow(445, 260, 180, acActive || fwdActive)}

              {/* Segment 2: from FWD (410) back to Star Point N (25, 145) - ONLY active when AC phases conduct (ZERO when FWD freewheels) */}
              {renderWire('M 410,260 L 25,260 L 25,145', acActive, 'fwd', '#64748b')}
              {renderJunction(25, 260, acActive)}
              {renderCurrentArrow(220, 260, 180, acActive)}
              {acActive && renderCurrentArrow(25, 200, -90, acActive)}
              <text x="120" y="275" fill="#64748b" fontSize="10" className="font-mono">
                Neutral Return Bus (N)
              </text>

              {/* Output Voltage Annotation */}
              <g transform="translate(525, 155)">
                <line x1="0" y1="-85" x2="0" y2="85" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="0,-85 -4,-75 4,-75" fill="#10b981" />
                <polygon points="0,85 -4,75 4,75" fill="#10b981" />
                <text x="8" y="4" fill="#34d399" fontSize="11" fontWeight="bold" className="font-mono">
                  + Vo -
                </text>
              </g>
            </svg>
          );
        })()}

        {/* ========================================================= */}
        {/* TOPOLOGY 4: 3-PHASE FULL-WAVE BRIDGE (6-Pulse) SCHEMATIC */}
        {/* ALL SIX DIODES/THYRISTORS POINT UP */}
        {/* ========================================================= */}
        {phase === '3-phase' && wave === 'full-wave' && (() => {
          const t1 = isConducting('D1') || isConducting('T1');
          const t2 = isConducting('D2') || isConducting('T2');
          const t3 = isConducting('D3') || isConducting('T3');
          const t4 = isConducting('D4') || isConducting('T4');
          const t5 = isConducting('D5') || isConducting('T5');
          const t6 = isConducting('D6') || isConducting('T6');
          const fwdActive = isConducting('FWD');
          const anyActive = (t1 || t3 || t5 || fwdActive) && hasCurrent;
          const phA = t1 || t4;
          const phB = t3 || t6;
          const phC = t5 || t2;

          return (
            <svg viewBox="0 0 650 320" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[380px] select-none">
              {/* Star Center Point N is at (20, 155). 
                  Each phase connects independently to the star center point:
                  Current ONLY flows through the neutral branches of the 2 conducting phases!
                  The non-conducting phase has ZERO current (completely inactive dark gray). */}

              {/* Branch A: From Va left terminal (36, 80) down to Star Point (20, 155) - Active ONLY if Phase A conducts */}
              {renderWire('M 36,80 L 20,80 L 20,155', phA, t4 ? 'fwd' : 'bwd', '#64748b')}
              {renderJunction(20, 80, phA)}
              {phA && renderCurrentArrow(20, 115, t4 ? 90 : -90, phA)}

              {/* Branch B: From Vb left terminal (36, 155) to Star Point (20, 155) - Active ONLY if Phase B conducts */}
              {renderWire('M 36,155 L 20,155', phB, t6 ? 'fwd' : 'bwd', '#64748b')}
              {phB && renderCurrentArrow(28, 155, t6 ? 180 : 0, phB)}

              {/* Branch C: From Vc left terminal (36, 230) up to Star Point (20, 155) - Active ONLY if Phase C conducts */}
              {renderWire('M 36,230 L 20,230 L 20,155', phC, t2 ? 'fwd' : 'bwd', '#64748b')}
              {renderJunction(20, 230, phC)}
              {phC && renderCurrentArrow(20, 195, t2 ? -90 : 90, phC)}

              {/* Central Star Point Junction at (20, 155) */}
              {renderJunction(20, 155, (phA || phB || phC) && hasCurrent)}
              {/* Neutral Star Label & Ground Reference */}
              <text x="14" y="145" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="end" className="font-mono">
                Star (N)
              </text>
              <path d="M 20,155 L 8,155 M 8,147 L 8,163 M 5,150 L 5,160 M 2,153 L 2,157" stroke="#64748b" strokeWidth="1.6" />

              {/* 3-Phase AC Sources (Va, Vb, Vc) */}
              {renderAcSource(54, 80, 'Va', '#ef4444', phA)}
              {renderAcSource(54, 155, 'Vb', '#eab308', phB)}
              {renderAcSource(54, 230, 'Vc', '#3b82f6', phC)}

              {/* LEG 1 (x=175): T1 (top, y=92) & T4 (bottom, y=222) - Drawn first so jumpers cleanly arc over */}
              {/* Top T1 Cathode up to Top (+) DC Bus */}
              {renderWire('M 175,50 L 175,80', t1, 'fwd')}
              {renderSwitch(isThyristor ? 'T1' : 'D1', 175, 92, 'up', isThyristor ? 'T1' : 'D1')}
              {/* T1 Anode down to Leg 1 Midpoint (y=135) */}
              {renderWire('M 175,104 L 175,135', t1, 'fwd')}
              {/* Leg 1 Midpoint (y=135) down to T4 Cathode (y=210) - Phase B and C will jump over this wire */}
              {renderWire('M 175,135 L 175,210', t4, 'fwd')}
              {renderSwitch(isThyristor ? 'T4' : 'D4', 175, 222, 'up', isThyristor ? 'T4' : 'D4')}
              {/* T4 Anode down to Bottom (-) DC Bus */}
              {renderWire('M 175,234 L 175,265', t4, 'fwd')}

              {/* LEG 2 (x=265): T3 (top, y=92) & T6 (bottom, y=222) */}
              {/* Top T3 Cathode up to Top (+) DC Bus */}
              {renderWire('M 265,50 L 265,80', t3, 'fwd')}
              {renderSwitch(isThyristor ? 'T3' : 'D3', 265, 92, 'up', isThyristor ? 'T3' : 'D3')}
              {/* T3 Anode down to Leg 2 Midpoint (y=155) */}
              {renderWire('M 265,104 L 265,155', t3, 'fwd')}
              {/* Leg 2 Midpoint (y=155) down to T6 Cathode (y=210) - Phase C will jump over this wire */}
              {renderWire('M 265,155 L 265,210', t6, 'fwd')}
              {renderSwitch(isThyristor ? 'T6' : 'D6', 265, 222, 'up', isThyristor ? 'T6' : 'D6')}
              {/* T6 Anode down to Bottom (-) DC Bus */}
              {renderWire('M 265,234 L 265,265', t6, 'fwd')}

              {/* LEG 3 (x=355): T5 (top, y=92) & T2 (bottom, y=222) */}
              {/* Top T5 Cathode up to Top (+) DC Bus */}
              {renderWire('M 355,50 L 355,80', t5, 'fwd')}
              {renderSwitch(isThyristor ? 'T5' : 'D5', 355, 92, 'up', isThyristor ? 'T5' : 'D5')}
              {/* T5 Anode down to Leg 3 Midpoint (y=175) */}
              {renderWire('M 355,104 L 355,175', t5, 'fwd')}
              {/* Leg 3 Midpoint (y=175) down to T2 Cathode (y=210) */}
              {renderWire('M 355,175 L 355,210', t2, 'fwd')}
              {renderSwitch(isThyristor ? 'T2' : 'D2', 355, 222, 'up', isThyristor ? 'T2' : 'D2')}
              {/* T2 Anode down to Bottom (-) DC Bus */}
              {renderWire('M 355,234 L 355,265', t2, 'fwd')}

              {/* ========================================================= */}
              {/* PHASE INPUT WIRES WITH WIRE JUMPERS (BRIDGES) */}
              {/* ========================================================= */}
              {/* Phase A (Va): Enters Leg 1 Midpoint directly at (175, 135) */}
              {renderWire('M 72,80 L 115,80 L 115,135 L 175,135', phA, t1 ? 'fwd' : 'bwd', '#ef4444')}
              {renderJunction(175, 135, phA)}
              {renderCurrentArrow(145, 135, t1 ? 0 : 180, phA)}

              {/* Phase B (Vb): Goes horizontally along y=155, JUMPS over Leg 1 at x=175, connects to Leg 2 Midpoint (265, 155) */}
              {renderJumperWire(
                'M 72,155 L 167,155 A 8 8 0 0 1 183,155 L 265,155',
                phB,
                t3 ? 'fwd' : 'bwd',
                '#eab308'
              )}
              {renderJunction(265, 155, phB)}
              {renderCurrentArrow(120, 155, t3 ? 0 : 180, phB)}
              {renderCurrentArrow(224, 155, t3 ? 0 : 180, phB)}

              {/* Phase C (Vc): Goes to y=175, JUMPS over Leg 1 at x=175, JUMPS over Leg 2 at x=265, connects to Leg 3 Midpoint (355, 175) */}
              {renderJumperWire(
                'M 72,230 L 115,230 L 115,175 L 167,175 A 8 8 0 0 1 183,175 L 257,175 A 8 8 0 0 1 273,175 L 355,175',
                phC,
                t5 ? 'fwd' : 'bwd',
                '#3b82f6'
              )}
              {renderJunction(355, 175, phC)}
              {renderCurrentArrow(135, 175, t5 ? 0 : 180, phC)}
              {renderCurrentArrow(220, 175, t5 ? 0 : 180, phC)}
              {renderCurrentArrow(314, 175, t5 ? 0 : 180, phC)}

              {/* TOP POSITIVE DC BUS (y=50) */}
              {/* Segment from T1 (175) to T3 (265): only active if T1 conducts */}
              {renderWire('M 175,50 L 265,50', t1, 'fwd')}
              {/* Segment from T3 (265) to T5 (355): active if T1 or T3 conducts */}
              {renderWire('M 265,50 L 355,50', t1 || t3, 'fwd')}
              {/* Segment from T5 (355) to FWD (435): active if any top switch conducts */}
              {renderWire('M 355,50 L 435,50', t1 || t3 || t5, 'fwd')}
              {/* Segment from FWD (435) to Load (520): active if any top switch OR FWD conducts */}
              {renderWire('M 435,50 L 520,50', t1 || t3 || t5 || fwdActive, 'fwd')}
              {renderJunction(175, 50, t1)}
              {renderJunction(265, 50, t3)}
              {renderJunction(355, 50, t5)}
              {renderCurrentArrow(478, 50, 0, t1 || t3 || t5 || fwdActive)}
              <text x="400" y="42" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                + DC BUS (6-Pulse)
              </text>

              {/* BOTTOM NEGATIVE DC BUS (y=265) */}
              {/* Segment from Load (520) to FWD (435): active if any bottom switch OR FWD conducts */}
              {renderWire('M 520,265 L 435,265', t2 || t6 || t4 || fwdActive, 'fwd')}
              {renderCurrentArrow(478, 265, 180, t2 || t6 || t4 || fwdActive)}

              {/* Segment from FWD (435) to T2 (355): active only if bottom switch conducts */}
              {renderWire('M 435,265 L 355,265', t2 || t6 || t4, 'fwd')}
              {renderJunction(355, 265, t2)}

              {/* Segment from T2 (355) to T6 (265): active only if T6 or T4 conducts! (Stops at T2 if T2 conducts) */}
              {renderWire('M 355,265 L 265,265', t6 || t4, 'fwd')}
              {renderJunction(265, 265, t6)}

              {/* Segment from T6 (265) to T4 (175): active ONLY if T4 conducts! Zero current to T4 if T6 or T2 conducts! */}
              {renderWire('M 265,265 L 175,265', t4, 'fwd')}
              {renderJunction(175, 265, t4)}
              <text x="400" y="280" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                - DC BUS
              </text>

              {/* Optional FWD Branch */}
              {renderFWDBranch(435, 50, 265)}

              {/* Solidly Connected Load Assembly */}
              {renderLoadAssembly(520, 50, 265, anyActive)}

              {/* Output Voltage Annotation */}
              <g transform="translate(565, 155)">
                <line x1="0" y1="-85" x2="0" y2="85" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="0,-85 -4,-75 4,-75" fill="#10b981" />
                <polygon points="0,85 -4,75 4,75" fill="#10b981" />
                <text x="8" y="4" fill="#34d399" fontSize="11" fontWeight="bold" className="font-mono">
                  + Vo -
                </text>
              </g>
            </svg>
          );
        })()}
      </div>

      {/* Footer Info / Conduction Legend & Loop Explanation */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span className="text-emerald-300 font-semibold">Active Current Loop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block border border-slate-600" />
              <span>Off / Inactive</span>
            </div>
            {isThyristor && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-ping" />
                <span>Gate Trigger (α)</span>
              </div>
            )}
            {useFWD && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
                <span>Freewheeling Active</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-300">
            Switches:{' '}
            <span className="text-emerald-400 font-bold">
              {conducting.length > 0 ? conducting.join(' + ') : 'None (Extinct)'}
            </span>
          </div>
        </div>

        {/* Real-time Current Loop Physical Path Description */}
        <div className="text-[10px] bg-slate-900/80 px-2 py-1 rounded border border-slate-800/80 text-emerald-400/90 font-mono flex items-center gap-1.5">
          <span className="text-slate-400 font-bold">Path:</span>
          <span className="truncate">{getCurrentLoopText()}</span>
        </div>
      </div>
    </div>
  );
};
