export type ComponentId =
  | "battery"
  | "motors"
  | "inverter"
  | "regen"
  | "thermal"
  | "charging"
  | "power-distribution"
  | "suspension"
  | "sensors"
  | "computer";

export interface EngineeringComponent {
  id: ComponentId;
  name: string;
  shortName: string;
  summary: string;
  howItWorks: string[];
  connectsTo: ComponentId[];
  /** Facts are general engineering principles or widely documented Tesla design choices. No invented numbers. */
  facts: { label: string; value: string }[];
  rangeImpact: string;
}

export const COMPONENTS: EngineeringComponent[] = [
  {
    id: "battery",
    name: "High-voltage battery pack",
    shortName: "Battery",
    summary:
      "A flat pack of lithium-ion cells forms the structural floor of the car. It stores the energy that sets range and supplies the power that sets acceleration.",
    howItWorks: [
      "Thousands of cells are grouped into modules, or bonded directly into a structural pack. Series strings raise the voltage and parallel groups raise capacity.",
      "A battery management system (BMS) monitors cell voltages and temperatures, balances cells, and limits charge and discharge power to protect the pack.",
      "Placing the pack low between the axles lowers the centre of gravity and stiffens the chassis.",
    ],
    connectsTo: ["inverter", "thermal", "charging", "power-distribution"],
    facts: [
      { label: "Location", value: "Under the cabin floor, between the axles" },
      { label: "Cell formats used by Tesla", value: "Cylindrical (18650, 2170, 4680) and prismatic LFP, depending on model and year" },
      { label: "Chemistries used by Tesla", value: "Nickel-based (NCA / NCM) and LFP, depending on trim and market" },
      { label: "Usable capacity", value: "Not officially published by Tesla for current models" },
    ],
    rangeImpact:
      "Range is roughly usable energy divided by consumption per mile. A bigger pack adds range but also mass, which raises consumption, so pack size is always a trade-off against efficiency and cost.",
  },
  {
    id: "motors",
    name: "Electric drive units",
    shortName: "Motors",
    summary:
      "Each drive unit combines a motor, a single-speed reduction gearbox and a differential. Dual-motor cars put one unit on each axle, and Plaid models use three.",
    howItWorks: [
      "Three-phase AC current from the inverter creates a rotating magnetic field that drags the rotor around and produces torque.",
      "Torque is available from zero rpm, so a single fixed gear covers the whole speed range. No multi-speed transmission is needed.",
      "Tesla pairs permanent-magnet machines, which are efficient while cruising, with induction machines on some performance and dual-motor setups.",
    ],
    connectsTo: ["inverter", "regen", "thermal"],
    facts: [
      { label: "Motor types used by Tesla", value: "Permanent-magnet synchronous reluctance and AC induction" },
      { label: "Gearing", value: "Single-speed reduction" },
      { label: "Plaid rotors", value: "Carbon-sleeved rotors to tolerate very high rpm (per Tesla)" },
    ],
    rangeImpact:
      "Electric drive units typically turn most of their electrical input into wheel work. Combustion engines lose most of their fuel energy as heat, which is the main reason EVs use far less energy per mile.",
  },
  {
    id: "inverter",
    name: "Inverter & power electronics",
    shortName: "Inverter",
    summary:
      "The inverter converts the pack's DC into variable-frequency three-phase AC for the motor. It runs in reverse during regenerative braking.",
    howItWorks: [
      "Power transistors (MOSFETs) switch thousands of times per second to synthesise AC waveforms. Silicon-carbide devices cut switching losses.",
      "Motor torque and speed are controlled by varying the current's amplitude and frequency.",
      "A DC-DC converter steps pack voltage down to power the 12 V or 16 V low-voltage systems.",
    ],
    connectsTo: ["battery", "motors", "regen", "thermal"],
    facts: [
      { label: "Switching devices", value: "Tesla was an early adopter of silicon-carbide (SiC) MOSFETs, starting with Model 3" },
      { label: "Location", value: "Integrated into each drive unit housing" },
    ],
    rangeImpact: "Every percentage point of inverter loss is lost range, so switching efficiency matters as much as motor efficiency.",
  },
  {
    id: "regen",
    name: "Regenerative braking",
    shortName: "Regen",
    summary:
      "When you lift off the accelerator, the motor works as a generator. It slows the car and sends energy back to the battery instead of turning it into brake heat.",
    howItWorks: [
      "The inverter commands negative torque, so the wheels' kinetic energy drives the motor and generates current.",
      "Regen power is limited by battery temperature and state of charge. A cold or full pack accepts less.",
      "Friction brakes still handle emergency stops and any braking beyond the regen limit.",
    ],
    connectsTo: ["motors", "inverter", "battery"],
    facts: [
      { label: "Energy path", value: "Wheels → motor (as generator) → inverter → battery" },
      { label: "Side effect", value: "Much less friction-brake wear than comparable ICE vehicles" },
    ],
    rangeImpact:
      "Regen helps most in stop-and-go city driving, where an ICE car wastes braking energy as heat. At steady highway speed there is little braking to recover.",
  },
  {
    id: "thermal",
    name: "Thermal management",
    shortName: "Thermal",
    summary:
      "A coolant network with a heat pump moves heat between the battery, drive units, power electronics and cabin. It keeps each within its ideal temperature window.",
    howItWorks: [
      "A single valve assembly routes coolant between multiple loops, so motor waste heat can warm the battery or the cabin.",
      "A heat pump moves heat rather than generating it, which uses less energy than resistive heating in mild cold.",
      "Before DC fast charging, the pack is preconditioned to a warmer temperature so it can accept higher power.",
    ],
    connectsTo: ["battery", "motors", "inverter", "charging"],
    facts: [
      { label: "Heat pump", value: "Introduced on Model Y and later added to Model 3, S and X (per Tesla)" },
      { label: "Front radiator", value: "Rejects excess heat to ambient air" },
    ],
    rangeImpact: "Cold-weather range loss is largely a thermal problem: heating the cabin and pack. Efficient heat management recovers a meaningful share of it.",
  },
  {
    id: "charging",
    name: "Charging port & architecture",
    shortName: "Charging",
    summary:
      "The rear-left charge port accepts AC through the onboard charger, or high-power DC that bypasses the charger and goes straight to the pack.",
    howItWorks: [
      "AC (home, Level 2): the onboard charger rectifies grid AC to DC, so power is limited by the charger's rating.",
      "DC fast charging: the station supplies DC directly, and the BMS sets the power, which tapers as state of charge rises.",
      "Tesla's connector has been standardised as SAE J3400 (NACS) in North America.",
    ],
    connectsTo: ["battery", "thermal", "power-distribution"],
    facts: [
      { label: "Connector (NA)", value: "SAE J3400 / NACS" },
      { label: "Charge curve", value: "Peak power only at low state of charge; tapers as the pack fills" },
    ],
    rangeImpact: "Charging speed does not change range, but it decides how much a long trip feels like refuelling or like waiting.",
  },
  {
    id: "power-distribution",
    name: "Power distribution",
    shortName: "Power dist.",
    summary:
      "High-voltage junctions, fuses and contactors route pack power to the drive units, compressor and heater. A low-voltage network runs everything else.",
    howItWorks: [
      "Pyro-fuses and contactors isolate the high-voltage pack in a crash or fault.",
      "Body controllers replace long point-to-point wiring with zonal networks, which cut harness length and mass.",
      "Newer Tesla vehicles moved the low-voltage system from 12 V lead-acid to lithium-ion batteries (per Tesla).",
    ],
    connectsTo: ["battery", "inverter", "charging", "computer"],
    facts: [{ label: "Isolation", value: "Contactors + pyrotechnic disconnect" }],
    rangeImpact: "Less harness copper means less mass. Low-voltage loads such as computers and screens draw a small but constant amount of energy.",
  },
  {
    id: "suspension",
    name: "Suspension & chassis",
    shortName: "Suspension",
    summary:
      "Double-wishbone front and multi-link rear suspension are common across the range. Model S and X can carry adaptive air suspension.",
    howItWorks: [
      "The heavy, low battery pack drives most chassis tuning: it lowers roll tendency but raises unsprung-to-sprung load demands.",
      "Large aluminium castings (Model Y) replace dozens of stamped parts, stiffening the body and simplifying manufacture.",
      "Air suspension can lower the car at highway speed to cut aerodynamic drag.",
    ],
    connectsTo: ["battery", "sensors"],
    facts: [
      { label: "Model Y", value: "Large single-piece front and rear castings (per Tesla)" },
      { label: "Model S / X", value: "Adaptive air suspension available" },
    ],
    rangeImpact: "Ride height affects frontal area and underbody airflow, both of which change highway consumption.",
  },
  {
    id: "sensors",
    name: "Cameras & driver-assistance hardware",
    shortName: "Sensors",
    summary:
      "A vision-based suite of cameras gives 360° coverage for Autopilot and Full Self-Driving (Supervised). Tesla removed radar and ultrasonic sensors from new vehicles in 2021–2022.",
    howItWorks: [
      "Forward cameras behind the windshield, plus cameras in the B-pillars, front fenders and rear, feed a neural network.",
      "The network builds a 3D representation of the surroundings (vector space) used for planning.",
      "All current Tesla driver-assistance features require an attentive, supervising driver.",
    ],
    connectsTo: ["computer", "power-distribution"],
    facts: [
      { label: "Sensor strategy", value: "Camera-only (\"Tesla Vision\")" },
      { label: "Autonomy level", value: "Driver supervision required" },
    ],
    rangeImpact: "Sensor and compute power draw is small compared with traction energy, but it is continuous.",
  },
  {
    id: "computer",
    name: "Onboard computing & infotainment",
    shortName: "Computer",
    summary:
      "A driver-assistance computer runs the vision network, and a separate infotainment computer drives the touchscreen, navigation and over-the-air updates.",
    howItWorks: [
      "Tesla-designed FSD chips (Hardware 3, AI4 / Hardware 4) process camera data in real time.",
      "The infotainment system controls climate, media, vehicle settings and trip planning with charger routing.",
      "Over-the-air updates can change everything from UI to motor calibration.",
    ],
    connectsTo: ["sensors", "power-distribution", "battery"],
    facts: [
      { label: "Driver-assist hardware", value: "Tesla-designed FSD computer (HW3 → AI4)" },
      { label: "Updates", value: "Over-the-air, whole-vehicle" },
    ],
    rangeImpact: "Trip planning that preconditions the pack before Supercharging shortens charging stops.",
  },
];

export const getComponent = (id: ComponentId) => COMPONENTS.find((c) => c.id === id)!;
