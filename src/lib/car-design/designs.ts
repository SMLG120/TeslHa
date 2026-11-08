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
  /** Cabin half-width at the glass base, for bodies whose flanks narrow before reaching the beltline. */
  beltHalfWidth?: number;
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
  /** Coupe doors: "side" swing outward on a vertical hinge, "scissor" lift upward from the front edge. */
  doorHinge?: "side" | "scissor";
  cabin: CabinSpec;
  /** Short human description of what the representation approximates. */
  note: string;
}

export type SteeringType = "round" | "yoke";

/**
 * Cabin specification. Every feature here is backed by the listed source; anything not
 * confirmed there is left out or recorded in `unverified` rather than guessed.
 */
export interface CabinSpec {
  steering: SteeringType;
  /** Centre touchscreen, landscape. Diagonal in inches as published. */
  screen: { diagIn: number; aspect: number } | null;
  /** Driver display behind the wheel. */
  cluster: boolean;
  /** Two small forward displays flanking the yoke (next-gen Roadster). */
  forwardDisplays: boolean;
  /** Conventional instrument binnacle with dials. */
  binnacle: boolean;
  /** Second-row display on the back of the centre console; diagonal when published. */
  rearScreen: { diagIn: number | null } | null;
  /** Ambient light strip along the dash and door trims. */
  ambient: boolean;
  /** Seats per row, front to rear. */
  rows: readonly number[];
  /** Steering column rake from horizontal, radians. Packaging approximation (not published). */
  steeringTilt: number;
  upholstery: { base: string; accent: string; label: string };
  /** Panoramic glass roof (visible from the cabin). */
  glassRoof: boolean;
  sources: readonly string[];
  unverified: readonly string[];
}

const BLACK = { base: "#1c1d20", accent: "#2b2d31", label: "Black" };

export const CABINS = {
  "model-s": {
    steering: "yoke",
    screen: { diagIn: 17.4, aspect: 1.7 },
    cluster: true,
    forwardDisplays: false,
    binnacle: false,
    rearScreen: { diagIn: 9.4 },
    ambient: true,
    rows: [2, 3],
    steeringTilt: 0.42,
    upholstery: { base: "#e9e7e2", accent: "#1b1c1f", label: "White / black" },
    glassRoof: true,
    sources: ["tesla.com/models: 17.4\" first-row and 9.4\" second-row touchscreens, driver cluster, wrap-around ambient lighting, all-glass roof, three-seat second row; interior photo shows a yoke"],
    unverified: ["A round steering wheel has also been offered; the page photo shows the yoke"],
  },
  "model-x": {
    steering: "round",
    screen: { diagIn: 17.4, aspect: 1.7 },
    cluster: true,
    forwardDisplays: false,
    binnacle: false,
    rearScreen: { diagIn: 9.4 },
    ambient: true,
    rows: [2, 2, 2],
    steeringTilt: 0.5,
    upholstery: BLACK,
    glassRoof: false,
    sources: ["tesla.com/modelx: 17.4\" first-row and 9.4\" second-row touchscreens, driver cluster, wrap-around ambient lighting, spec table \"up to 6 seats\""],
    unverified: [
      "Steering type is not shown on the page; a round wheel is used",
      "The page copy says the second and third rows seat five, which conflicts with the 6-seat spec table; the 6-seat layout is shown",
    ],
  },
  "model-3": {
    steering: "round",
    screen: { diagIn: 16, aspect: 1.75 },
    cluster: false,
    forwardDisplays: false,
    binnacle: false,
    rearScreen: { diagIn: null },
    ambient: true,
    rows: [2, 3],
    steeringTilt: 0.44,
    upholstery: BLACK,
    glassRoof: true,
    sources: ["tesla.com/model3: 16\" centre touchscreen, heated steering wheel, turn-signal stalk, 5 seats; Premium lists a rear display"],
    unverified: ["Rear display size and ambient strip are not stated on the page", "Rear display applies to Premium trims only"],
  },
  "model-y": {
    steering: "round",
    screen: { diagIn: 16, aspect: 1.75 },
    cluster: false,
    forwardDisplays: false,
    binnacle: false,
    rearScreen: { diagIn: null },
    ambient: true,
    rows: [2, 3],
    steeringTilt: 0.5,
    upholstery: BLACK,
    glassRoof: true,
    sources: ["tesla.com/modely: 16\" centre touchscreen, 5 seats, heated front seats; page photo shows a round wheel and landscape screen"],
    unverified: ["Rear display and ambient strip are not stated on the page for every trim"],
  },
  "roadster-gen1": {
    steering: "round",
    screen: null,
    cluster: false,
    forwardDisplays: false,
    binnacle: true,
    rearScreen: null,
    ambient: false,
    rows: [2],
    steeringTilt: 0.34,
    upholstery: BLACK,
    glassRoof: false,
    sources: ["Two-seat layout (dataset, 1st-generation Roadster)"],
    unverified: ["The 2008–2012 cabin is not documented on tesla.com; dials, trim and console are generic"],
  },
  "roadster-gen2": {
    steering: "yoke",
    screen: { diagIn: 12, aspect: 1.5 },
    cluster: false,
    forwardDisplays: true,
    binnacle: false,
    rearScreen: null,
    ambient: false,
    rows: [2],
    steeringTilt: 0.32,
    upholstery: { base: "#efede8", accent: "#6a6c70", label: "Ultrawhite / gray microsuede" },
    glassRoof: false,
    sources: ["tesla.com/roadster: seating for two, Ultrawhite interior with gray microsuede bolsters, yoke for steer-by-wire, centre touchscreen plus two smaller forward displays, fixed seat position"],
    unverified: ["Centre screen size is not published; 12\" is a visual estimate"],
  },
} as const satisfies Record<string, CabinSpec>;

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
    cabin: CABINS["model-s"],
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
    cabin: CABINS["model-3"],
    note: "Compact sedan with a short trunk deck, rounded nose and slim headlamps",
  },
  "model-x": {
    id: "model-x",
    frontOverhang: 0.98,
    groundClearance: 0.2,
    noseBottom: 0.3,
    tailBottom: 0.4,
    bodyTop: [[0, 0.72], [0.03, 0.84], [0.08, 0.92], [0.19, 0.98], [0.27, 1.03], [0.33, 1.09], [0.55, 1.13], [0.75, 1.16], [0.88, 1.16], [0.95, 1.12], [1, 1.02]],
    roof: [[0.22, 0], [0.29, 1.3], [0.36, 1.55], [0.44, 1.66], [0.55, 1.68], [0.72, 1.68], [0.82, 1.61], [0.9, 1.44], [0.945, 0]],
    plan: [[0, 0.84], [0.12, 0.97], [0.3, 1], [0.78, 1], [0.92, 0.96], [1, 0.9]],
    shoulder: 0.56,
    nTop: 7.5,
    nBottom: 8,
    nSide: 2.7,
    noseLen: 0.36,
    tailLen: 0.22,
    noseP: 3.4,
    tailP: 4.5,
    tumblehome: 0.76,
    archGap: 0.04,
    rimRatio: 0.7,
    rim: "split",
    caliper: "#2a2c31",
    doors: [0.3, 0.47, 0.69],
    doorU: [0.17, 0.44],
    doorV: 0.44,
    frunk: [0.07, 0.2],
    trunk: { t: [0.8, 0.985], liftback: true },
    lights: LIGHTS_ALMOND,
    cabin: CABINS["model-x"],
    note: "Tall SUV with a panoramic windshield and falcon-wing rear doors",
  },
  "model-y": {
    id: "model-y",
    frontOverhang: 0.87,
    groundClearance: 0.167,
    noseBottom: 0.24,
    tailBottom: 0.34,
    bodyTop: [[0, 0.66], [0.03, 0.78], [0.08, 0.86], [0.18, 0.91], [0.29, 0.98], [0.35, 1.03], [0.55, 1.06], [0.75, 1.1], [0.86, 1.12], [0.94, 1.1], [0.985, 1.02], [1, 0.96]],
    roof: [[0.25, 0], [0.32, 1.27], [0.39, 1.5], [0.47, 1.61], [0.55, 1.624], [0.65, 1.6], [0.75, 1.5], [0.84, 1.34], [0.92, 0]],
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
    frunk: [0.07, 0.23],
    trunk: { t: [0.8, 0.985], liftback: true },
    lights: {
      head: [{ t: [0.05, 0.075], u: [0.29, 0.325] }],
      drl: [{ t: [0.026, 0.036], u: [0.33, 0.67] }],
      tail: [{ t: [0.972, 0.984], u: [0.33, 0.67] }, { t: [0.952, 0.99], u: [0.31, 0.37] }],
    },
    cabin: CABINS["model-y"],
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
    cabin: CABINS["roadster-gen1"],
    note: "Small two-seat roadster with a mid-mounted drive unit and short cabin",
  },
  "roadster-gen2": {
    id: "roadster-gen2",
    frontOverhang: 0.95,
    groundClearance: 0.11,
    noseBottom: 0.17,
    tailBottom: 0.25,
    bodyTop: [[0, 0.4], [0.04, 0.53], [0.1, 0.66], [0.22, 0.8], [0.34, 0.81], [0.42, 0.81], [0.6, 0.88], [0.78, 0.95], [0.9, 0.95], [0.97, 0.9], [1, 0.84]],
    roof: [[0.36, 0], [0.43, 0.97], [0.5, 1.12], [0.58, 1.18], [0.66, 1.14], [0.76, 1.03], [0.86, 0]],
    plan: [[0, 0.82], [0.15, 0.95], [0.35, 0.95], [0.55, 0.93], [0.8, 1], [1, 0.9]],
    shoulder: 0.55,
    nTop: 3.4,
    nBottom: 6,
    nSide: 1.7,
    noseLen: 0.42,
    tailLen: 0.3,
    noseP: 3.4,
    tailP: 4,
    tumblehome: 0.68,
    beltHalfWidth: 0.72,
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
      head: [{ t: [0.035, 0.05], u: [0.34, 0.4] }],
      tail: [{ t: [0.975, 0.99], u: [0.31, 0.69] }],
    },
    cabin: CABINS["roadster-gen2"],
    doorHinge: "scissor",
    note: "Angular two-seat hypercar with a faceted body, hidden headlights, a full-length taillight and upward-opening doors (tesla.com/roadster, Nov 2026)",
  },
};
