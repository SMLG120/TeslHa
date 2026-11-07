/**
 * Hand-authored design parameters for the procedural vehicle bodies.
 *
 * These are STYLISED approximations drawn from published exterior dimensions and public
 * photography. They are not manufacturer surface data and are labelled as such in the UI.
 * Positions along the car use t ∈ [0, 1] from the front bumper (0) to the rear bumper (1).
 * Heights are metres above the ground. Ring positions use u ∈ [0, 1): 0 = underside centre,
 * 0.25 = right flank (+Z), 0.5 = top centre, 0.75 = left flank. Greenhouse positions use
 * v ∈ [0, 1]: 0 = right glass base, 0.5 = roof centre, 1 = left glass base.
 */

export type DesignId = "model-s" | "model-3" | "model-x" | "model-y" | "roadster-gen1" | "roadster-gen2";
export type RimStyle = "turbine" | "aero" | "split" | "twin" | "thin";
export type Curve = readonly (readonly [number, number])[];

export interface LightPatch {
  t: readonly [number, number];
  /** Right-hand u range; mirrored to the left automatically unless it spans the centre line. */
  u: readonly [number, number];
}

export interface CarDesign {
  id: DesignId;
  /** Bumper to front-axle distance (m). */
  frontOverhang: number;
  groundClearance: number;
  noseBottom: number;
  tailBottom: number;
  /** Upper body line from bumper → hood → beltline → deck → tail. */
  bodyTop: Curve;
  /** Greenhouse roof line. The first and last t bound the glass; their heights are snapped to the beltline. */
  roof: Curve;
  /** Plan-view width multiplier (1 = published body width). */
  plan: Curve;
  /** Fraction of the section height where the flank is widest. */
  shoulder: number;
  nTop: number;
  nBottom: number;
  nSide: number;
  noseLen: number;
  tailLen: number;
  /** Closure exponents: 2 = round, higher = blunter face. */
  noseP: number;
  tailP: number;
  /** Greenhouse roof half-width ÷ base half-width. */
  tumblehome: number;
  archGap: number;
  /** Rim outer radius ÷ tyre radius. */
  rimRatio: number;
  rim: RimStyle;
  caliper: string;
  /** Door cut lines along t: front door [0]→[1], rear door [1]→[2] (coupés use a single door). */
  doors: readonly number[];
  /** Body u range covered by doors (right side). */
  doorU: readonly [number, number];
  /** Greenhouse v range of the door glass (right side). Falcon doors reach toward the roof centre. */
  doorV: number;
  frunk: readonly [number, number] | null;
  trunk: { t: readonly [number, number]; liftback: boolean };
  lights: { head: readonly LightPatch[]; drl?: readonly LightPatch[]; tail: readonly LightPatch[] };
  seatRows: number;
  /** Short human description of what the representation approximates. */
  note: string;
}

const LIGHTS_ALMOND = {
  head: [{ t: [0.03, 0.085], u: [0.3, 0.37] }],
  tail: [{ t: [0.952, 0.99], u: [0.3, 0.405] }],
} as const;

export const DESIGNS: Record<DesignId, CarDesign> = {
  "model-s": {
    id: "model-s",
    frontOverhang: 0.95,
    groundClearance: 0.14,
    noseBottom: 0.26,
    tailBottom: 0.3,
    bodyTop: [[0, 0.48], [0.03, 0.6], [0.08, 0.69], [0.19, 0.77], [0.3, 0.85], [0.36, 0.89], [0.55, 0.92], [0.75, 0.96], [0.86, 0.985], [0.93, 0.975], [0.98, 0.9], [1, 0.83]],
    roof: [[0.31, 0], [0.4, 1.2], [0.47, 1.38], [0.55, 1.431], [0.62, 1.42], [0.72, 1.31], [0.82, 1.13], [0.9, 0]],
    plan: [[0, 0.84], [0.12, 0.97], [0.3, 1], [0.75, 1], [0.9, 0.97], [1, 0.88]],
    shoulder: 0.58,
    nTop: 7.5,
    nBottom: 8,
    nSide: 2.7,
    noseLen: 0.42,
    tailLen: 0.3,
    noseP: 2.8,
    tailP: 3,
    tumblehome: 0.74,
    archGap: 0.035,
    rimRatio: 0.7,
    rim: "turbine",
    caliper: "#2a2c31",
    doors: [0.335, 0.525, 0.7],
    doorU: [0.16, 0.44],
    doorV: 0.3,
    frunk: [0.07, 0.29],
    trunk: { t: [0.72, 0.975], liftback: true },
    lights: LIGHTS_ALMOND,
    seatRows: 2,
    note: "Low fastback liftback, long hood, almond headlamps",
  },
  "model-3": {
    id: "model-3",
    frontOverhang: 0.84,
    groundClearance: 0.14,
    noseBottom: 0.2,
    tailBottom: 0.3,
    bodyTop: [[0, 0.48], [0.03, 0.61], [0.08, 0.7], [0.18, 0.78], [0.3, 0.86], [0.36, 0.9], [0.55, 0.94], [0.72, 0.98], [0.83, 1.01], [0.92, 1.02], [0.97, 0.97], [1, 0.87]],
    roof: [[0.3, 0], [0.38, 1.19], [0.45, 1.39], [0.52, 1.441], [0.6, 1.42], [0.7, 1.3], [0.78, 1.14], [0.84, 0]],
    plan: [[0, 0.82], [0.12, 0.96], [0.3, 1], [0.75, 1], [0.9, 0.97], [1, 0.88]],
    shoulder: 0.58,
    nTop: 7.5,
    nBottom: 8,
    nSide: 2.9,
    noseLen: 0.46,
    tailLen: 0.3,
    noseP: 2.6,
    tailP: 3,
    tumblehome: 0.72,
    archGap: 0.035,
    rimRatio: 0.68,
    rim: "aero",
    caliper: "#2a2c31",
    doors: [0.32, 0.515, 0.685],
    doorU: [0.16, 0.44],
    doorV: 0.3,
    frunk: [0.07, 0.28],
    trunk: { t: [0.84, 0.975], liftback: false },
    lights: {
      head: [{ t: [0.04, 0.078], u: [0.315, 0.355] }],
      tail: [{ t: [0.955, 0.99], u: [0.31, 0.4] }, { t: [0.94, 0.955], u: [0.37, 0.4] }],
    },
    seatRows: 2,
    note: "Compact sedan with a short trunk deck, rounded nose and slim headlamps",
  },
  "model-x": {
    id: "model-x",
    frontOverhang: 0.98,
    groundClearance: 0.2,
    noseBottom: 0.3,
    tailBottom: 0.4,
    bodyTop: [[0, 0.62], [0.03, 0.76], [0.08, 0.86], [0.19, 0.95], [0.27, 1.03], [0.33, 1.09], [0.55, 1.13], [0.75, 1.16], [0.88, 1.16], [0.95, 1.12], [1, 1.02]],
    roof: [[0.26, 0], [0.33, 1.25], [0.4, 1.48], [0.47, 1.62], [0.55, 1.68], [0.72, 1.68], [0.82, 1.61], [0.9, 1.44], [0.945, 0]],
    plan: [[0, 0.84], [0.12, 0.97], [0.3, 1], [0.78, 1], [0.92, 0.96], [1, 0.9]],
    shoulder: 0.56,
    nTop: 7.5,
    nBottom: 8,
    nSide: 2.7,
    noseLen: 0.44,
    tailLen: 0.22,
    noseP: 2.8,
    tailP: 4.5,
    tumblehome: 0.76,
    archGap: 0.04,
    rimRatio: 0.7,
    rim: "split",
    caliper: "#2a2c31",
    doors: [0.3, 0.47, 0.69],
    doorU: [0.17, 0.44],
    doorV: 0.44,
    frunk: [0.07, 0.25],
    trunk: { t: [0.8, 0.985], liftback: true },
    lights: LIGHTS_ALMOND,
    seatRows: 3,
    note: "Tall SUV with a panoramic windshield and falcon-wing rear doors",
  },
  "model-y": {
    id: "model-y",
    frontOverhang: 0.87,
    groundClearance: 0.167,
    noseBottom: 0.24,
    tailBottom: 0.34,
    bodyTop: [[0, 0.6], [0.03, 0.73], [0.08, 0.82], [0.18, 0.89], [0.29, 0.98], [0.35, 1.03], [0.55, 1.06], [0.75, 1.1], [0.86, 1.12], [0.94, 1.1], [0.985, 1.02], [1, 0.96]],
    roof: [[0.29, 0], [0.37, 1.25], [0.44, 1.5], [0.51, 1.624], [0.6, 1.61], [0.7, 1.53], [0.8, 1.38], [0.88, 1.2], [0.92, 0]],
    plan: [[0, 0.83], [0.12, 0.96], [0.3, 1], [0.75, 1], [0.9, 0.97], [1, 0.89]],
    shoulder: 0.56,
    nTop: 7,
    nBottom: 8,
    nSide: 2.8,
    noseLen: 0.48,
    tailLen: 0.24,
    noseP: 2.6,
    tailP: 4,
    tumblehome: 0.72,
    archGap: 0.04,
    rimRatio: 0.68,
    rim: "twin",
    caliper: "#2a2c31",
    doors: [0.3, 0.505, 0.69],
    doorU: [0.17, 0.44],
    doorV: 0.3,
    frunk: [0.07, 0.27],
    trunk: { t: [0.8, 0.985], liftback: true },
    lights: {
      head: [{ t: [0.05, 0.075], u: [0.29, 0.325] }],
      drl: [{ t: [0.026, 0.036], u: [0.33, 0.67] }],
      tail: [{ t: [0.972, 0.984], u: [0.33, 0.67] }, { t: [0.952, 0.99], u: [0.31, 0.37] }],
    },
    seatRows: 2,
    note: "Crossover on the Model 3 platform with a full-width light bar front and rear",
  },
  "roadster-gen1": {
    id: "roadster-gen1",
    frontOverhang: 0.85,
    groundClearance: 0.13,
    noseBottom: 0.18,
    tailBottom: 0.24,
    bodyTop: [[0, 0.45], [0.04, 0.55], [0.1, 0.62], [0.22, 0.68], [0.32, 0.72], [0.38, 0.76], [0.6, 0.82], [0.7, 0.86], [0.85, 0.88], [0.96, 0.86], [1, 0.78]],
    roof: [[0.34, 0], [0.42, 0.97], [0.48, 1.09], [0.55, 1.127], [0.62, 1.07], [0.67, 0]],
    plan: [[0, 0.8], [0.15, 0.93], [0.4, 0.92], [0.75, 1], [1, 0.9]],
    shoulder: 0.55,
    nTop: 6,
    nBottom: 8,
    nSide: 2.7,
    noseLen: 0.38,
    tailLen: 0.28,
    noseP: 2,
    tailP: 2.6,
    tumblehome: 0.66,
    archGap: 0.035,
    rimRatio: 0.66,
    rim: "thin",
    caliper: "#2a2c31",
    doors: [0.37, 0.62],
    doorU: [0.17, 0.44],
    doorV: 0.32,
    frunk: null,
    trunk: { t: [0.75, 0.97], liftback: false },
    lights: {
      head: [{ t: [0.035, 0.095], u: [0.3, 0.385] }],
      tail: [{ t: [0.97, 0.995], u: [0.33, 0.37] }, { t: [0.97, 0.995], u: [0.385, 0.42] }],
    },
    seatRows: 1,
    note: "Small two-seat roadster with a mid-mounted drive unit and short cabin",
  },
  "roadster-gen2": {
    id: "roadster-gen2",
    frontOverhang: 0.95,
    groundClearance: 0.11,
    noseBottom: 0.17,
    tailBottom: 0.25,
    bodyTop: [[0, 0.46], [0.04, 0.58], [0.1, 0.68], [0.22, 0.79], [0.34, 0.8], [0.42, 0.82], [0.6, 0.86], [0.78, 0.92], [0.92, 0.9], [0.98, 0.84], [1, 0.78]],
    roof: [[0.38, 0], [0.44, 0.98], [0.5, 1.13], [0.56, 1.18], [0.63, 1.15], [0.72, 1.04], [0.82, 0]],
    plan: [[0, 0.82], [0.15, 0.95], [0.35, 0.95], [0.55, 0.93], [0.8, 1], [1, 0.9]],
    shoulder: 0.55,
    nTop: 6,
    nBottom: 8,
    nSide: 2.7,
    noseLen: 0.42,
    tailLen: 0.3,
    noseP: 2.6,
    tailP: 2.8,
    tumblehome: 0.62,
    archGap: 0.03,
    rimRatio: 0.74,
    rim: "thin",
    caliper: "#b3121b",
    doors: [0.42, 0.66],
    doorU: [0.17, 0.44],
    doorV: 0.34,
    frunk: [0.07, 0.33],
    trunk: { t: [0.83, 0.97], liftback: false },
    lights: {
      head: [{ t: [0.05, 0.085], u: [0.33, 0.38] }],
      tail: [{ t: [0.975, 0.99], u: [0.31, 0.69] }],
    },
    seatRows: 2,
    note: "Low, wide grand tourer with a long nose and cab-rearward targa roof (2017 prototype proportions)",
  },
};
