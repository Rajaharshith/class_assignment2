import {
  HarmonicComponent,
  RectifierConfig,
  RectifierMetrics,
  SimulationResult,
  SimulationSample,
} from '../types/rectifier';

/**
 * High-precision Power Electronics Physics Simulation Engine
 * Models single-phase and three-phase uncontrolled (diode) and controlled (thyristor)
 * half-wave and full-wave bridge rectifiers with R and R-L loads.
 */
export function simulateRectifier(config: RectifierConfig): SimulationResult {
  const {
    phase,
    device,
    wave,
    loadType,
    resistance: R_in,
    inductance: L_in,
    useFWD,
    firingAngleDeg,
    sourceVrms,
    frequency,
    cyclesToDisplay = 2,
  } = config;

  const R = Math.max(0.1, R_in);
  const L = loadType === 'RL' ? Math.max(0.0001, L_in) : 0;
  const alphaRad = (firingAngleDeg * Math.PI) / 180;
  const omega = 2 * Math.PI * frequency;
  const T = 1 / frequency;
  const Vm = sourceVrms * Math.SQRT2; // Peak phase voltage

  // Pre-simulation steady-state settling:
  // Run 4 warm-up cycles to establish true continuous/discontinuous DC current equilibrium
  const warmupCycles = 4;
  const totalCycles = warmupCycles + cyclesToDisplay;
  const samplesPerCycle = 1200;
  const totalSamples = totalCycles * samplesPerCycle;
  const dt = T / samplesPerCycle;

  let current_io = 0; // inductor load current
  let conductingSwitches: string[] = [];

  // Intermediate recording array for the display cycles
  const displaySamples: SimulationSample[] = [];

  for (let step = 0; step < totalSamples; step++) {
    const t = step * dt;
    const cycleNum = Math.floor(t / T);
    const tInCycle = t - cycleNum * T;
    const thetaRad = omega * tInCycle; // 0 to 2*PI in current cycle
    const thetaDeg = (thetaRad * 180) / Math.PI;

    // AC Source Voltages
    // Phase A:
    const vSourceA = Vm * Math.sin(thetaRad);
    // Phase B & C (120 deg shifted)
    const vSourceB = Vm * Math.sin(thetaRad - (2 * Math.PI) / 3);
    const vSourceC = Vm * Math.sin(thetaRad + (2 * Math.PI) / 3);

    // Line-to-line voltages (for 3-phase full bridge)
    const vLineAB = vSourceA - vSourceB;
    const vLineBC = vSourceB - vSourceC;
    const vLineCA = vSourceC - vSourceA;

    // Determine applied rectified voltage before inductor based on topology
    const { vApplied, activeSwitches, gatePulse, vSwitch1, iSwitch1, iFWD } =
      solveInstantaneousRectifierState({
        phase,
        device,
        wave,
        loadType,
        useFWD,
        alphaRad,
        thetaRad,
        thetaDeg,
        vSourceA,
        vSourceB,
        vSourceC,
        vLineAB,
        vLineBC,
        vLineCA,
        current_io,
        R,
        L,
        Vm,
      });

    conductingSwitches = activeSwitches;

    // Solve for load current io(t) using RK4 numerical integration
    let next_io = current_io;

    if (L <= 0.0001) {
      // Pure R load: immediate algebraic solution
      next_io = Math.max(0, vApplied / R);
    } else {
      // RL load: di/dt = (vApplied - R*i) / L
      // RK4 step
      const f = (i: number, v: number) => (v - R * i) / L;

      const k1 = f(current_io, vApplied);
      const k2 = f(current_io + 0.5 * dt * k1, vApplied);
      const k3 = f(current_io + 0.5 * dt * k2, vApplied);
      const k4 = f(current_io + dt * k3, vApplied);

      next_io = current_io + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

      // Current cannot be negative (diodes/thyristors are unidirectional)
      if (next_io < 0) {
        next_io = 0;
      }
    }

    // In display cycles, record samples
    if (cycleNum >= warmupCycles) {
      const displayTime = t - warmupCycles * T;
      const displayThetaDeg = (omega * displayTime * 180) / Math.PI;

      // Calculate AC source currents based on conduction
      let iSource = 0; // Phase A
      let iSourceB = 0; // Phase B
      let iSourceC = 0; // Phase C

      if (phase === '1-phase') {
        if (wave === 'half-wave') {
          iSource = activeSwitches.includes(device === 'diode' ? 'D1' : 'T1') ? current_io : 0;
        } else {
          // Full-wave bridge
          if (activeSwitches.includes(device === 'diode' ? 'D1' : 'T1')) {
            iSource = current_io;
          } else if (activeSwitches.includes(device === 'diode' ? 'D3' : 'T3')) {
            iSource = -current_io;
          }
        }
      } else {
        // 3-phase source currents:
        if (wave === 'half-wave') {
          iSource = activeSwitches.includes('D1') || activeSwitches.includes('T1') ? current_io : 0;
          iSourceB = activeSwitches.includes('D2') || activeSwitches.includes('T2') ? current_io : 0;
          iSourceC = activeSwitches.includes('D3') || activeSwitches.includes('T3') ? current_io : 0;
        } else {
          // 3-phase full-wave bridge:
          // Phase A: Top D1/T1 (+Io), Bottom D4/T4 (-Io)
          if (activeSwitches.includes('D1') || activeSwitches.includes('T1')) {
            iSource = current_io;
          } else if (activeSwitches.includes('D4') || activeSwitches.includes('T4')) {
            iSource = -current_io;
          }

          // Phase B: Top D3/T3 (+Io), Bottom D6/T6 (-Io)
          if (activeSwitches.includes('D3') || activeSwitches.includes('T3')) {
            iSourceB = current_io;
          } else if (activeSwitches.includes('D6') || activeSwitches.includes('T6')) {
            iSourceB = -current_io;
          }

          // Phase C: Top D5/T5 (+Io), Bottom D2/T2 (-Io)
          if (activeSwitches.includes('D5') || activeSwitches.includes('T5')) {
            iSourceC = current_io;
          } else if (activeSwitches.includes('D2') || activeSwitches.includes('T2')) {
            iSourceC = -current_io;
          }
        }
      }

      displaySamples.push({
        time: displayTime,
        thetaDeg: displayThetaDeg,
        thetaRad: (displayThetaDeg * Math.PI) / 180,
        vSourceA,
        vSourceB: phase === '3-phase' ? vSourceB : undefined,
        vSourceC: phase === '3-phase' ? vSourceC : undefined,
        vLineAB: phase === '3-phase' ? vLineAB : undefined,
        vLineBC: phase === '3-phase' ? vLineBC : undefined,
        vLineCA: phase === '3-phase' ? vLineCA : undefined,
        vOutput: vApplied,
        iOutput: current_io,
        iSource,
        iSourceB: phase === '3-phase' ? iSourceB : undefined,
        iSourceC: phase === '3-phase' ? iSourceC : undefined,
        conductingDevices: conductingSwitches,
        gatePulseActive: gatePulse,
        vSwitch1,
        iSwitch1,
        iFWD,
      });
    }

    current_io = next_io;
  }

  // Calculate simulated metrics over the recorded display cycles
  const metrics = calculateMetrics(displaySamples, config, Vm);

  // Calculate Harmonics via FFT / Discrete Fourier Transform
  const harmonics = calculateHarmonics(displaySamples, frequency, cyclesToDisplay);

  return {
    samples: displaySamples,
    metrics,
    harmonics,
    period: T,
    omega,
  };
}

interface InstantStateArgs {
  phase: '1-phase' | '3-phase';
  device: 'diode' | 'thyristor';
  wave: 'half-wave' | 'full-wave';
  loadType: 'R' | 'RL';
  useFWD: boolean;
  alphaRad: number;
  thetaRad: number; // 0 to 2*pi
  thetaDeg: number;
  vSourceA: number;
  vSourceB: number;
  vSourceC: number;
  vLineAB: number;
  vLineBC: number;
  vLineCA: number;
  current_io: number;
  R: number;
  L: number;
  Vm: number;
}

function solveInstantaneousRectifierState(args: InstantStateArgs): {
  vApplied: number;
  activeSwitches: string[];
  gatePulse: boolean;
  vSwitch1: number;
  iSwitch1: number;
  iFWD: number;
} {
  const {
    phase,
    device,
    wave,
    loadType,
    useFWD,
    alphaRad,
    thetaRad,
    thetaDeg,
    vSourceA,
    vSourceB,
    vSourceC,
    vLineAB,
    vLineBC,
    vLineCA,
    current_io,
  } = args;

  const isControlled = device === 'thyristor';
  const hasRL = loadType === 'RL';
  const pulseWidthDeg = 8; // degrees pulse duration

  // Helper to check gate pulse window
  const isPulseActive = (targetDeg: number) => {
    const diff = (thetaDeg - targetDeg + 360) % 360;
    return diff >= 0 && diff < pulseWidthDeg;
  };

  let vApplied = 0;
  const activeSwitches: string[] = [];
  let gatePulse = false;
  let vSwitch1 = 0; // Voltage across D1 or T1
  let iSwitch1 = 0;
  let iFWD = 0;

  // ============================================================
  // TOPOLOGY 1: 1-PHASE HALF-WAVE
  // ============================================================
  if (phase === '1-phase' && wave === 'half-wave') {
    const swName = isControlled ? 'T1' : 'D1';
    const fireDeg = isControlled ? (alphaRad * 180) / Math.PI : 0;
    gatePulse = isControlled && isPulseActive(fireDeg);

    // Conduction condition:
    let isConducting = false;
    if (!isControlled) {
      // Diode: forward biased when vSourceA > 0, OR has current flowing through RL
      if (vSourceA > 0 || (hasRL && current_io > 0.001)) {
        isConducting = true;
      }
    } else {
      // Thyristor: fires at alpha, stays ON while current_io > 0
      const afterAlpha = thetaDeg >= fireDeg && thetaDeg < 360;
      if ((afterAlpha && vSourceA > 0) || (hasRL && current_io > 0.001 && thetaDeg >= fireDeg)) {
        isConducting = true;
      }
    }

    // Freewheeling diode behavior:
    if (useFWD && vSourceA < 0 && current_io > 0.001) {
      // FWD clamps output voltage to 0, main switch turns off
      isConducting = false;
      vApplied = 0;
      activeSwitches.push('FWD');
      iFWD = current_io;
      vSwitch1 = -vSourceA; // T1/D1 blocks negative source voltage
    } else if (isConducting) {
      vApplied = vSourceA;
      activeSwitches.push(swName);
      vSwitch1 = 0; // Conducting: switch drop approx 0
      iSwitch1 = current_io;
    } else {
      vApplied = 0;
      vSwitch1 = vSourceA; // Off: switch bears source voltage
    }
    return { vApplied, activeSwitches, gatePulse, vSwitch1, iSwitch1, iFWD };
  }

  // ============================================================
  // TOPOLOGY 2: 1-PHASE FULL-WAVE BRIDGE
  // ============================================================
  if (phase === '1-phase' && wave === 'full-wave') {
    const swPair1 = isControlled ? ['T1', 'T2'] : ['D1', 'D2'];
    const swPair2 = isControlled ? ['T3', 'T4'] : ['D3', 'D4'];
    const fireDeg1 = isControlled ? (alphaRad * 180) / Math.PI : 0;
    const fireDeg2 = isControlled ? (alphaRad * 180) / Math.PI + 180 : 180;

    const pulse1 = isControlled && isPulseActive(fireDeg1);
    const pulse2 = isControlled && isPulseActive(fireDeg2);
    gatePulse = pulse1 || pulse2;

    if (!isControlled) {
      // Diode bridge: Pair 1 (D1, D2) during positive half cycle [0, 180]
      // Pair 2 (D3, D4) during negative half cycle [180, 360]
      if (vSourceA >= 0) {
        vApplied = vSourceA;
        activeSwitches.push(...swPair1);
        vSwitch1 = 0;
        iSwitch1 = current_io;
      } else {
        vApplied = -vSourceA;
        activeSwitches.push(...swPair2);
        vSwitch1 = vSourceA; // D1 reverse biased
      }
    } else {
      // Fully Controlled SCR Bridge:
      // Pair 1 fires at alpha; Pair 2 fires at 180 + alpha
      if (thetaDeg >= fireDeg1 && thetaDeg < fireDeg2) {
        // Interval 1: Pair 1 (T1, T2)
        if (useFWD && vSourceA < 0 && current_io > 0.001) {
          vApplied = 0;
          activeSwitches.push('FWD');
          iFWD = current_io;
          vSwitch1 = -vSourceA;
        } else {
          vApplied = vSourceA;
          activeSwitches.push(...swPair1);
          vSwitch1 = 0;
          iSwitch1 = current_io;
        }
      } else {
        // Interval 2: Pair 2 (T3, T4)
        if (useFWD && -vSourceA < 0 && current_io > 0.001) {
          vApplied = 0;
          activeSwitches.push('FWD');
          iFWD = current_io;
          vSwitch1 = vSourceA;
        } else {
          vApplied = -vSourceA;
          activeSwitches.push(...swPair2);
          vSwitch1 = vSourceA; // T1 reverse biased
        }
      }

      // If DCM with R load or zero current before firing angle:
      if (!hasRL && (thetaDeg < fireDeg1 || (thetaDeg >= 180 && thetaDeg < fireDeg2))) {
        vApplied = 0;
        activeSwitches.length = 0;
        vSwitch1 = vSourceA;
        iSwitch1 = 0;
      }
    }

    return { vApplied, activeSwitches, gatePulse, vSwitch1, iSwitch1, iFWD };
  }

  // ============================================================
  // TOPOLOGY 3: 3-PHASE HALF-WAVE (Star connected 3-pulse)
  // ============================================================
  if (phase === '3-phase' && wave === 'half-wave') {
    const prefix = isControlled ? 'T' : 'D';
    // Natural commutation points for 3-phase half wave occur at:
    // Phase A highest from 30° to 150°
    // Phase B highest from 150° to 270°
    // Phase C highest from 270° to 390° (30°)
    const alphaOffset = isControlled ? (alphaRad * 180) / Math.PI : 0;

    const fireA = (30 + alphaOffset) % 360;
    const fireB = (150 + alphaOffset) % 360;
    const fireC = (270 + alphaOffset) % 360;

    gatePulse = isControlled && (isPulseActive(fireA) || isPulseActive(fireB) || isPulseActive(fireC));

    // Determine conducting phase
    let conductingPhase = 'A';
    const angleRel = (thetaDeg - 30 - alphaOffset + 360) % 360;

    if (angleRel < 120) {
      conductingPhase = 'A';
      vApplied = vSourceA;
      activeSwitches.push(`${prefix}1`);
      vSwitch1 = 0;
      iSwitch1 = current_io;
    } else if (angleRel < 240) {
      conductingPhase = 'B';
      vApplied = vSourceB;
      activeSwitches.push(`${prefix}2`);
      vSwitch1 = vSourceA - vSourceB;
    } else {
      conductingPhase = 'C';
      vApplied = vSourceC;
      activeSwitches.push(`${prefix}3`);
      vSwitch1 = vSourceA - vSourceC;
    }

    // FWD clamping
    if (useFWD && vApplied < 0 && current_io > 0.001) {
      vApplied = 0;
      activeSwitches.length = 0;
      activeSwitches.push('FWD');
      iFWD = current_io;
    } else if (!hasRL && vApplied < 0) {
      vApplied = 0;
      activeSwitches.length = 0;
    }

    return { vApplied, activeSwitches, gatePulse, vSwitch1, iSwitch1, iFWD };
  }

  // ============================================================
  // TOPOLOGY 4: 3-PHASE FULL-WAVE BRIDGE (6-pulse)
  // ============================================================
  {
    const prefix = isControlled ? 'T' : 'D';
    // 6-pulse bridge line-to-line conduction intervals
    // Natural crossover line voltages:
    // 60° intervals: V_ab, V_ac, V_bc, V_ba, V_ca, V_cb
    // Natural commutation starts at 60° (or 30° for phase crossings)
    // Positive rail: T1 (Ph A), T3 (Ph B), T5 (Ph C)
    // Negative rail: T4 (Ph A), T6 (Ph B), T2 (Ph C)
    const alphaOffset = isControlled ? (alphaRad * 180) / Math.PI : 0;
    // Natural crossover of line voltages occurs at 30° (when va = vc, and vb is negative peak).
    // Conduction intervals of 60° each:
    // Sector 0 (30° to 90°):   V_ab with T1 & T6
    // Sector 1 (90° to 150°):  V_ac with T1 & T2
    // Sector 2 (150° to 210°): V_bc with T3 & T2
    // Sector 3 (210° to 270°): V_ba with T3 & T4
    // Sector 4 (270° to 330°): V_ca with T5 & T4
    // Sector 5 (330° to 30°):  V_cb with T5 & T6
    const baseAngle = (thetaDeg - 30 - alphaOffset + 720) % 360;
    const sector = Math.floor(baseAngle / 60);

    gatePulse = isControlled && isPulseActive((30 + alphaOffset + sector * 60) % 360);

    switch (sector) {
      case 0: // V_ab: T1 (A) & T6 (B)
        vApplied = vLineAB;
        activeSwitches.push(`${prefix}1`, `${prefix}6`);
        vSwitch1 = 0;
        iSwitch1 = current_io;
        break;
      case 1: // V_ac: T1 (A) & T2 (C)
        vApplied = -vLineCA;
        activeSwitches.push(`${prefix}1`, `${prefix}2`);
        vSwitch1 = 0;
        iSwitch1 = current_io;
        break;
      case 2: // V_bc: T3 (B) & T2 (C)
        vApplied = vLineBC;
        activeSwitches.push(`${prefix}3`, `${prefix}2`);
        vSwitch1 = vLineAB;
        break;
      case 3: // V_ba: T3 (B) & T4 (A)
        vApplied = -vLineAB;
        activeSwitches.push(`${prefix}3`, `${prefix}4`);
        vSwitch1 = vLineAB;
        break;
      case 4: // V_ca: T5 (C) & T4 (A)
        vApplied = vLineCA;
        activeSwitches.push(`${prefix}5`, `${prefix}4`);
        vSwitch1 = -vLineCA;
        break;
      case 5: // V_cb: T5 (C) & T6 (B)
      default:
        vApplied = -vLineBC;
        activeSwitches.push(`${prefix}5`, `${prefix}6`);
        vSwitch1 = -vLineCA;
        break;
    }

    if (vApplied < 0) {
      if (useFWD && current_io > 0.001) {
        vApplied = 0;
        activeSwitches.length = 0;
        activeSwitches.push('FWD');
        iFWD = current_io;
      } else if (!hasRL || current_io <= 0.001) {
        vApplied = 0;
        activeSwitches.length = 0;
      }
    }

    if (activeSwitches.length === 0) {
      iSwitch1 = 0;
      if (sector === 0 || sector === 1) {
        vSwitch1 = sector === 0 ? vLineAB : -vLineCA;
      }
    }

    return { vApplied, activeSwitches, gatePulse, vSwitch1, iSwitch1, iFWD };
  }
}

/**
 * Calculates theoretical and simulated performance metrics
 */
function calculateMetrics(
  samples: SimulationSample[],
  config: RectifierConfig,
  Vm: number
): RectifierMetrics {
  const N = samples.length;
  if (N === 0) {
    return {
      vDc: 0,
      vRms: 0,
      iDc: 0,
      iRms: 0,
      pDc: 0,
      pAc: 0,
      efficiency: 0,
      formFactor: 1,
      rippleFactor: 0,
      rippleFreq: config.frequency * (config.wave === 'half-wave' ? 1 : 2),
      thdCurrent: 0,
      powerFactor: 0.9,
      displacementPF: 1,
      isDiscontinuous: false,
      theoreticalVDc: 0,
      theoreticalVRms: 0,
    };
  }

  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let zeroCurrentCount = 0;

  for (let i = 0; i < N; i++) {
    const s = samples[i];
    sumVo += s.vOutput;
    sumVoSq += s.vOutput * s.vOutput;
    sumIo += s.iOutput;
    sumIoSq += s.iOutput * s.iOutput;
    if (s.iOutput < 0.001) {
      zeroCurrentCount++;
    }
  }

  const vDc = sumVo / N;
  const vRms = Math.sqrt(sumVoSq / N);
  const iDc = sumIo / N;
  const iRms = Math.sqrt(sumIoSq / N);

  const pDc = vDc * iDc;
  const pAc = vRms * iRms;
  const efficiency = pAc > 0 ? Math.min(100, (pDc / pAc) * 100) : 0;
  const formFactor = vDc > 0 ? vRms / vDc : 1;
  const rippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1));

  // Determine ripple frequency
  let rippleMultiplier = 1;
  if (config.phase === '1-phase') {
    rippleMultiplier = config.wave === 'half-wave' ? 1 : 2;
  } else {
    rippleMultiplier = config.wave === 'half-wave' ? 3 : 6;
  }
  const rippleFreq = config.frequency * rippleMultiplier;

  // Discontinuous mode flag
  const isDiscontinuous = zeroCurrentCount > N * 0.03 && config.loadType === 'RL';

  // Calculate Theoretical Textbook Formulas
  const { theoreticalVDc, theoreticalVRms } = calculateTheoreticalValues(config, Vm);

  // Displacement and Input Power Factor
  const alphaRad = (config.firingAngleDeg * Math.PI) / 180;
  const displacementPF = config.device === 'thyristor' ? Math.cos(alphaRad) : 0.95;
  const powerFactor = Math.min(1, Math.max(0, displacementPF * (vDc > 0 ? 0.9 : 0.5)));

  // Current THD estimate from ripple
  const thdCurrent = iDc > 0 ? Math.min(200, (Math.sqrt(Math.max(0, iRms * iRms - iDc * iDc)) / iDc) * 100) : 0;

  return {
    vDc,
    vRms,
    iDc,
    iRms,
    pDc,
    pAc,
    efficiency,
    formFactor,
    rippleFactor,
    rippleFreq,
    thdCurrent,
    powerFactor,
    displacementPF,
    isDiscontinuous,
    theoreticalVDc,
    theoreticalVRms,
  };
}

/**
 * Standard power electronics closed-form theoretical formulas
 */
function calculateTheoreticalValues(
  config: RectifierConfig,
  Vm: number
): { theoreticalVDc: number; theoreticalVRms: number } {
  const { phase, device, wave, firingAngleDeg, loadType, useFWD } = config;
  const alpha = (firingAngleDeg * Math.PI) / 180;

  let theoreticalVDc = 0;
  let theoreticalVRms = 0;

  if (phase === '1-phase' && wave === 'half-wave') {
    if (device === 'diode') {
      // V_dc = Vm / pi
      theoreticalVDc = Vm / Math.PI;
      theoreticalVRms = Vm / 2;
    } else {
      // Thyristor: V_dc = (Vm / 2pi) * (1 + cos(alpha)) for R or with FWD
      if (useFWD || loadType === 'R') {
        theoreticalVDc = (Vm / (2 * Math.PI)) * (1 + Math.cos(alpha));
        theoreticalVRms =
          (Vm / 2) * Math.sqrt(Math.max(0, 1 - alpha / Math.PI + Math.sin(2 * alpha) / (2 * Math.PI)));
      } else {
        // Without FWD, RL continuous extinction depends on beta; approximate
        theoreticalVDc = (Vm / (2 * Math.PI)) * (1 + Math.cos(alpha));
        theoreticalVRms = Vm / 2;
      }
    }
  } else if (phase === '1-phase' && wave === 'full-wave') {
    if (device === 'diode') {
      // V_dc = 2 * Vm / pi
      theoreticalVDc = (2 * Vm) / Math.PI;
      theoreticalVRms = Vm / Math.SQRT2;
    } else {
      // Thyristor bridge:
      if (loadType === 'RL' && !useFWD) {
        // CCM without FWD: V_dc = (2 * Vm / pi) * cos(alpha)
        theoreticalVDc = ((2 * Vm) / Math.PI) * Math.cos(alpha);
        theoreticalVRms = Vm / Math.SQRT2;
      } else {
        // R load or with FWD: V_dc = (Vm / pi) * (1 + cos(alpha))
        theoreticalVDc = (Vm / Math.PI) * (1 + Math.cos(alpha));
        theoreticalVRms =
          (Vm / Math.SQRT2) *
          Math.sqrt(Math.max(0, 1 - alpha / Math.PI + Math.sin(2 * alpha) / (2 * Math.PI)));
      }
    }
  } else if (phase === '3-phase' && wave === 'half-wave') {
    // 3-phase half-wave (3-pulse):
    // V_dc = 3 * sqrt(3) * Vm_phase / (2 * pi)
    const vDc0 = (3 * Math.sqrt(3) * Vm) / (2 * Math.PI);
    if (device === 'diode') {
      theoreticalVDc = vDc0;
      theoreticalVRms = Vm * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (8 * Math.PI));
    } else {
      if (alpha <= Math.PI / 6 || loadType === 'RL') {
        theoreticalVDc = vDc0 * Math.cos(alpha);
      } else {
        theoreticalVDc = ((3 * Vm) / (2 * Math.PI)) * (1 + Math.cos(alpha + Math.PI / 6));
      }
      theoreticalVRms = theoreticalVDc * 1.02; // Close approximation
    }
  } else {
    // 3-Phase Full-Wave Bridge (6-pulse):
    // Line peak = sqrt(3) * Vm_phase
    const Vm_LL = Math.sqrt(3) * Vm;
    const vDc0 = (3 * Vm_LL) / Math.PI; // approx 1.654 Vm_ph or 1.35 V_LL,rms
    if (device === 'diode') {
      theoreticalVDc = vDc0;
      theoreticalVRms = Vm_LL * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (4 * Math.PI));
    } else {
      if (alpha <= Math.PI / 3 || loadType === 'RL') {
        theoreticalVDc = vDc0 * Math.cos(alpha);
      } else {
        theoreticalVDc = (3 * Vm_LL * (1 + Math.cos(alpha + Math.PI / 3))) / Math.PI;
      }
      theoreticalVRms = theoreticalVDc * 1.005;
    }
  }

  return { theoreticalVDc, theoreticalVRms };
}

/**
 * Fast Fourier Transform (DFT) to decompose load voltage into harmonics
 */
function calculateHarmonics(
  samples: SimulationSample[],
  fundamentalFreq: number,
  cycles: number
): HarmonicComponent[] {
  const N = samples.length;
  if (N < 50) return [];

  // Calculate DC component (order 0)
  let sumVo = 0;
  for (let i = 0; i < N; i++) {
    sumVo += samples[i].vOutput;
  }
  const dcVal = sumVo / N;

  const harmonics: HarmonicComponent[] = [
    {
      order: 0,
      freq: 0,
      amplitude: Math.abs(dcVal),
      phaseDeg: 0,
      percentOfDc: 100,
    },
  ];

  // Orders 1 to 15
  const maxOrder = 15;
  for (let k = 1; k <= maxOrder; k++) {
    let re = 0;
    let im = 0;
    const harmonicCycles = k * cycles;

    for (let i = 0; i < N; i++) {
      const angle = (2 * Math.PI * harmonicCycles * i) / N;
      re += samples[i].vOutput * Math.cos(angle);
      im += samples[i].vOutput * Math.sin(angle);
    }

    re = (2 / N) * re;
    im = -(2 / N) * im;

    const amplitude = Math.sqrt(re * re + im * im);
    const phaseDeg = (Math.atan2(im, re) * 180) / Math.PI;
    const percentOfDc = dcVal > 0 ? (amplitude / dcVal) * 100 : 0;

    harmonics.push({
      order: k,
      freq: k * fundamentalFreq,
      amplitude,
      phaseDeg,
      percentOfDc,
    });
  }

  return harmonics;
}
