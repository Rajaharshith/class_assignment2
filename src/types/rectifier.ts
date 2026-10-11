export type PhaseType = '1-phase' | '3-phase';
export type DeviceType = 'diode' | 'thyristor';
export type WaveType = 'half-wave' | 'full-wave';
export type LoadType = 'R' | 'RL';

export interface RectifierConfig {
  phase: PhaseType;
  device: DeviceType;
  wave: WaveType;
  loadType: LoadType;
  resistance: number; // Ohms (e.g., 10)
  inductance: number; // Henries (e.g., 0.05 = 50 mH)
  useFWD: boolean; // Freewheeling Diode
  firingAngleDeg: number; // alpha in degrees (0 to 180)
  sourceVrms: number; // Volts RMS (e.g., 230)
  frequency: number; // Hz (e.g., 50)
  cyclesToDisplay: number; // number of AC cycles (e.g., 2)
}

export interface SimulationSample {
  time: number; // seconds
  thetaDeg: number; // omega * t in degrees (modulo 360 or continuous)
  thetaRad: number; // radians

  // Voltages
  vSourceA: number; // Phase A or 1-phase V_s
  vSourceB?: number; // Phase B (for 3-phase)
  vSourceC?: number; // Phase C (for 3-phase)
  vLineAB?: number; // Line-to-line V_ab
  vLineBC?: number; // Line-to-line V_bc
  vLineCA?: number; // Line-to-line V_ca

  vOutput: number; // Load voltage v_o(t)
  iOutput: number; // Load current i_o(t)
  iSource: number; // AC input current i_s(t)

  // Switch states
  conductingDevices: string[]; // e.g., ['D1', 'D2'] or ['T1', 'T2'] or ['FWD']
  gatePulseActive: boolean; // whether a firing trigger is firing right now
  vSwitch1: number; // Voltage across device 1 (reverse blocking / forward)
  iSwitch1: number; // Current through device 1
  iFWD: number; // Current through Freewheeling Diode
}

export interface RectifierMetrics {
  vDc: number; // Average DC voltage
  vRms: number; // RMS output voltage
  iDc: number; // Average DC current
  iRms: number; // RMS output current
  pDc: number; // DC power = V_dc * I_dc
  pAc: number; // AC power = V_rms * I_rms
  efficiency: number; // Rectification efficiency %
  formFactor: number; // FF = V_rms / V_dc
  rippleFactor: number; // RF = sqrt(FF^2 - 1)
  rippleFreq: number; // Output ripple frequency (e.g. 50, 100, 150, 300 Hz)
  thdCurrent: number; // Total Harmonic Distortion %
  powerFactor: number; // Input Power Factor
  displacementPF: number; // cos(phi_1)
  isDiscontinuous: boolean; // DCM (Discontinuous Conduction Mode)
  extinctionAngleDeg?: number; // beta in degrees for RL load
  conductionAngleDeg?: number; // gamma = beta - alpha
  theoreticalVDc: number; // Pure theoretical formula value
  theoreticalVRms: number; // Theoretical RMS
}

export interface HarmonicComponent {
  order: number;
  freq: number;
  amplitude: number;
  phaseDeg: number;
  percentOfDc: number;
}

export interface SimulationResult {
  samples: SimulationSample[];
  metrics: RectifierMetrics;
  harmonics: HarmonicComponent[];
  period: number; // 1 / frequency in seconds
  omega: number; // 2 * pi * f
}
