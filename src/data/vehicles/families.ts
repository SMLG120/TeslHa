import type { BodyGeometry, VehicleFamily } from "@/types/vehicle";

/**
 * Vehicle families. Exterior dimensions come from secondary sources (Wikipedia, citing
 * manufacturer data) and are used ONLY to proportion the procedural 3D representation.
 * The silhouettes are stylised approximations, not production surface data.
 */

const sedanProfile: BodyGeometry["profile"] = [
  [0, 0.12], [0, 0.38], [0.03, 0.5], [0.24, 0.56], [0.33, 0.6], [0.75, 0.62],
  [0.94, 0.61], [1, 0.55], [1, 0.3], [0.97, 0.12],
];

const crossoverProfile: BodyGeometry["profile"] = [
  [0, 0.14], [0, 0.4], [0.03, 0.52], [0.24, 0.58], [0.31, 0.62], [0.8, 0.64],
  [0.95, 0.63], [1, 0.57], [1, 0.3], [0.97, 0.14],
];

const MODEL_S_BODY: BodyGeometry = {
  lengthMm: 4970,
  widthMm: 1964,
  heightMm: 1431,
  wheelbaseMm: 2960,
  wheelDiameterMm: 710,
  profile: sedanProfile,
  cabin: [[0.31, 0.6], [0.47, 0.95], [0.62, 1], [0.79, 0.86], [0.94, 0.62]],
  doorStyle: "conventional",
  hasFrunk: true,
  roofType: "fixed",
  dimensionsVerification: "secondary",
  dimensionsSourceIds: ["wiki-model-s"],
};

const ROADSTER_GEN1_BODY: BodyGeometry = {
  lengthMm: 3946,
  widthMm: 1873,
  heightMm: 1127,
  wheelbaseMm: 2352,
  wheelDiameterMm: 620,
  profile: [
    [0, 0.1], [0, 0.42], [0.04, 0.55], [0.3, 0.62], [0.4, 0.66], [0.9, 0.7],
    [1, 0.62], [1, 0.3], [0.97, 0.1],
  ],
  cabin: [[0.38, 0.66], [0.5, 0.97], [0.62, 1], [0.72, 0.7]],
  doorStyle: "coupe",
  hasFrunk: false,
  roofType: "targa",
  dimensionsVerification: "secondary",
  dimensionsSourceIds: ["wiki-roadster-gen1"],
};

const ROADSTER_GEN2_BODY: BodyGeometry = {
  // Tesla has not published production dimensions. Proportions approximate the 2017 prototype.
  lengthMm: 4400,
  widthMm: 1980,
  heightMm: 1180,
  wheelbaseMm: 2650,
  wheelDiameterMm: 700,
  profile: [
    [0, 0.1], [0, 0.34], [0.05, 0.47], [0.3, 0.55], [0.36, 0.59], [0.92, 0.64],
    [1, 0.56], [1, 0.28], [0.97, 0.1],
  ],
  cabin: [[0.34, 0.59], [0.5, 0.97], [0.64, 1], [0.86, 0.7], [0.93, 0.64]],
  doorStyle: "coupe",
  hasFrunk: true,
  roofType: "targa",
  dimensionsVerification: "announced-target",
  dimensionsSourceIds: ["tesla-roadster"],
};

export const FAMILIES: VehicleFamily[] = [
  {
    id: "model-s",
    name: "Model S",
    tagline: "The benchmark long-range electric sedan",
    segment: "Full-size liftback sedan",
    productionYears: "2012 – 2026",
    summary:
      "The car that proved a long-range EV could be a flagship. Its floor-mounted pack, dual- and tri-motor drive units and over-the-air software set the template that later Tesla models simplified and scaled.",
    statusNote:
      "Production ended at Fremont in 2026 (announced on Tesla's Q4 2025 earnings call). Specs shown are the final US model year.",
    body: MODEL_S_BODY,
    asset: null,
    rigLevel: "full",
    generations: [{ id: "lr", label: "2012 – 2026" }],
  },
  {
    id: "model-3",
    name: "Model 3",
    tagline: "Mass-market efficiency, engineered down to the watt",
    segment: "Mid-size sedan",
    productionYears: "2017 – present",
    summary:
      "Designed for volume manufacturing: a simplified harness, a permanent-magnet rear drive unit, and a heat-pump thermal system make it one of the most efficient cars Tesla builds.",
    statusNote: "In production. Tesla revises trims and pricing frequently; check the source date on each figure.",
    body: {
      ...MODEL_S_BODY,
      lengthMm: 4720,
      widthMm: 1850,
      heightMm: 1441,
      wheelbaseMm: 2875,
      wheelDiameterMm: 680,
      cabin: [[0.3, 0.6], [0.46, 0.96], [0.6, 1], [0.8, 0.85], [0.94, 0.63]],
      dimensionsSourceIds: ["wiki-model-3"],
    },
    asset: null,
    rigLevel: "standard",
    generations: [{ id: "highland", label: "2024 – present" }],
  },
  {
    id: "model-x",
    name: "Model X",
    tagline: "Seven seats, falcon-wing doors, tri-motor performance",
    segment: "Full-size SUV",
    productionYears: "2015 – 2026",
    summary:
      "Shares much of its powertrain with Model S but packages it into a tall, seven-seat SUV with articulating falcon-wing rear doors and a panoramic windshield.",
    statusNote: "Production ended at Fremont in 2026 alongside Model S. Specs shown are the final US model year.",
    body: {
      lengthMm: 5057,
      widthMm: 1999,
      heightMm: 1680,
      wheelbaseMm: 2965,
      wheelDiameterMm: 760,
      profile: crossoverProfile,
      cabin: [[0.27, 0.62], [0.42, 0.97], [0.62, 1], [0.88, 0.92], [0.96, 0.65]],
      doorStyle: "falcon",
      hasFrunk: true,
      roofType: "fixed",
      dimensionsVerification: "secondary",
      dimensionsSourceIds: ["wiki-model-x"],
    },
    asset: null,
    rigLevel: "standard",
    generations: [{ id: "x", label: "2015 – 2026" }],
  },
  {
    id: "model-y",
    name: "Model Y",
    tagline: "The crossover that scaled electric mobility",
    segment: "Mid-size crossover",
    productionYears: "2020 – present",
    summary:
      "Built on the Model 3 platform with large single-piece castings front and rear. It became one of the best-selling vehicles in the world.",
    statusNote: "In production. Tesla revises trims and pricing frequently; check the source date on each figure.",
    body: {
      lengthMm: 4797,
      widthMm: 1921,
      heightMm: 1624,
      wheelbaseMm: 2891,
      wheelDiameterMm: 720,
      profile: crossoverProfile,
      cabin: [[0.3, 0.62], [0.45, 0.95], [0.6, 1], [0.83, 0.9], [0.95, 0.64]],
      doorStyle: "conventional",
      hasFrunk: true,
      roofType: "fixed",
      dimensionsVerification: "secondary",
      dimensionsSourceIds: ["wiki-model-y"],
    },
    asset: null,
    rigLevel: "standard",
    generations: [{ id: "juniper", label: "2025 – present" }],
  },
  {
    id: "roadster",
    name: "Roadster",
    tagline: "Where it started, and the hypercar that was promised",
    segment: "Two-seat sports car / 2+2 hypercar",
    productionYears: "2008 – 2012 · next generation announced",
    summary:
      "The original Roadster (2008–2012) used a Lotus-derived chassis and a pack of laptop-format cells to prove EVs could be fast. The next-generation Roadster, revealed in 2017, has not entered production.",
    statusNote:
      "Next-generation figures are 2017 announcement targets, not production specs. Unveil dates have slipped repeatedly; reported production start is 2027.",
    body: ROADSTER_GEN1_BODY,
    asset: null,
    rigLevel: "standard",
    generations: [
      { id: "gen1", label: "1st generation (2008 – 2012)", body: ROADSTER_GEN1_BODY },
      { id: "gen2", label: "Next generation (announced)", body: ROADSTER_GEN2_BODY },
    ],
  },
];
