/**
 * Simplified longitudinal EV model for the educational powertrain simulation.
 * NOT calibrated to any specific vehicle. Parameters describe a generic mid-size EV.
 */
export interface PowertrainParams {
  massKg: number;
  cdA: number; // drag coefficient × frontal area, m²
  crr: number; // rolling resistance coefficient
  wheelRadiusM: number;
  gearRatio: number;
  maxMotorPowerKw: number;
  maxMotorTorqueNm: number;
  maxRegenKw: number;
  drivetrainEfficiency: number; // battery → wheel, one direction
  packKwh: number;
}

export const GENERIC_EV: PowertrainParams = {
  massKg: 1900,
  cdA: 0.58,
  crr: 0.01,
  wheelRadiusM: 0.35,
  gearRatio: 9,
  maxMotorPowerKw: 250,
  maxMotorTorqueNm: 420,
  maxRegenKw: 60,
  drivetrainEfficiency: 0.9,
  packKwh: 75,
};

export interface PowertrainState {
  speedMs: number;
  socPct: number;
  /** Cumulative energy drawn from (positive) / returned to (negative) the battery, kWh. */
  energyKwh: number;
  regenKwhTotal: number;
}

export interface PowertrainSample extends PowertrainState {
  motorPowerKw: number; // mechanical, + drive / − regen
  batteryPowerKw: number; // + discharge / − charge
  wheelTorqueNm: number;
  regenPowerKw: number;
  mode: "drive" | "regen" | "coast";
}

const G = 9.81;
const RHO = 1.2;

/**
 * Advance the model by dt seconds. `pedal` in [-1, 1]: positive = accelerator, negative = brake (regen first).
 */
export function step(state: PowertrainState, pedal: number, dt: number, p: PowertrainParams = GENERIC_EV): PowertrainSample {
  const v = Math.max(state.speedMs, 0);
  const vEff = Math.max(v, 0.5);
  const torqueLimitedForce = (p.maxMotorTorqueNm * p.gearRatio) / p.wheelRadiusM;
  let force = 0;
  let mode: PowertrainSample["mode"] = "coast";
  const canDrive = state.socPct > 0;

  if (pedal > 0 && canDrive) {
    const powerLimitedForce = (pedal * p.maxMotorPowerKw * 1000) / vEff;
    force = Math.min(pedal * torqueLimitedForce, powerLimitedForce);
    mode = "drive";
  } else if (pedal < 0 && v > 0.3) {
    // Regen fades out at very low speed; friction brakes would take over.
    const fade = Math.min(1, v / 3);
    const regenForce = Math.min((-pedal * p.maxRegenKw * 1000) / vEff, torqueLimitedForce) * fade;
    force = -regenForce;
    mode = "regen";
  }

  const resist = 0.5 * RHO * p.cdA * v * v + (v > 0.05 ? p.crr * p.massKg * G : 0);
  const accel = (force - resist) / p.massKg;
  const speedMs = Math.max(0, v + accel * dt);

  const motorPowerKw = (force * v) / 1000;
  const batteryPowerKw = motorPowerKw >= 0 ? motorPowerKw / p.drivetrainEfficiency : motorPowerKw * p.drivetrainEfficiency;
  const dE = (batteryPowerKw * dt) / 3600;
  const energyKwh = state.energyKwh + dE;
  const socPct = Math.min(100, Math.max(0, state.socPct - (dE / p.packKwh) * 100));
  const regenPowerKw = mode === "regen" ? -batteryPowerKw : 0;

  return {
    speedMs,
    socPct,
    energyKwh,
    regenKwhTotal: state.regenKwhTotal + (mode === "regen" ? -dE : 0),
    motorPowerKw,
    batteryPowerKw,
    wheelTorqueNm: force * p.wheelRadiusM,
    regenPowerKw,
    mode,
  };
}
