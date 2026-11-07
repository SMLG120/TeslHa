import type { Source } from "@/types/vehicle";

const ACCESSED = "2026-11-07";

/**
 * Every figure in the dataset cites one or more of these sources.
 * Third-party sources are tagged "secondary" at the value level and should be
 * re-checked against Tesla or fueleconomy.gov before being presented as definitive.
 */
export const SOURCES = {
  // Verified 2026-11-07 via the fueleconomy.gov web-services API (/ws/rest/vehicle/{id}).
  "epa-49741": {
    id: "epa-49741",
    title: "2026 Tesla Model S (EPA label data, record 49741)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49741",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-49742": {
    id: "epa-49742",
    title: "2026 Tesla Model S Plaid (EPA label data, record 49742)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49742",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50252": {
    id: "epa-50252",
    title: "2026 Tesla Model S Plaid (21in wheels) (EPA label data, record 50252)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50252",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-49745": {
    id: "epa-49745",
    title: "2026 Tesla Model X (EPA label data, record 49745)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49745",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-49746": {
    id: "epa-49746",
    title: "2026 Tesla Model X Plaid (EPA label data, record 49746)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49746",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50251": {
    id: "epa-50251",
    title: "2026 Tesla Model 3 Standard RWD (EPA label data, record 50251)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50251",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50038": {
    id: "epa-50038",
    title: "2026 Tesla Model 3 Premium RWD (EPA label data, record 50038)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50038",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50037": {
    id: "epa-50037",
    title: "2026 Tesla Model 3 Premium AWD (EPA label data, record 50037)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50037",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50250": {
    id: "epa-50250",
    title: "2026 Tesla Model 3 Performance AWD (EPA label data, record 50250)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50250",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50036": {
    id: "epa-50036",
    title: "2026 Tesla Model 3 Performance (EPA label data, record 50036)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50036",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50040": {
    id: "epa-50040",
    title: "2026 Tesla Model Y Standard RWD (18in Wheels) (EPA label data, record 50040)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50040",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50041": {
    id: "epa-50041",
    title: "2026 Tesla Model Y Standard RWD (19in Wheels) (EPA label data, record 50041)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50041",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50304": {
    id: "epa-50304",
    title: "2026 Tesla Model Y Standard AWD (EPA label data, record 50304)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50304",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-49743": {
    id: "epa-49743",
    title: "2026 Tesla Model Y Long Range RWD (EPA label data, record 49743)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49743",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-49744": {
    id: "epa-49744",
    title: "2026 Tesla Model Y Long Range AWD (EPA label data, record 49744)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49744",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "epa-50253": {
    id: "epa-50253",
    title: "2026 Tesla Model Y Performance AWD (EPA label data, record 50253)",
    url: "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=50253",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "fueleconomy-tesla": {
    id: "fueleconomy-tesla",
    title: "Tesla vehicles, 2025–2026 (Find & Compare Cars)",
    url: "https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2025&year2=2026&make=Tesla&srchtyp=ymm",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "fueleconomy-roadster": {
    id: "fueleconomy-roadster",
    title: "Tesla Roadster, 2008–2012 (Find & Compare Cars)",
    url: "https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2008&year2=2012&make=Tesla&srchtyp=ymm",
    publisher: "U.S. DOE / EPA",
    accessed: ACCESSED,
  },
  "tesla-model-3": {
    id: "tesla-model-3",
    title: "Model 3",
    url: "https://www.tesla.com/model3",
    publisher: "Tesla",
    accessed: ACCESSED,
  },
  "tesla-model-y": {
    id: "tesla-model-y",
    title: "Model Y",
    url: "https://www.tesla.com/modely",
    publisher: "Tesla",
    accessed: ACCESSED,
  },
  "tesla-model-s": {
    id: "tesla-model-s",
    title: "Model S (archived product page)",
    url: "https://www.tesla.com/models",
    publisher: "Tesla",
    accessed: ACCESSED,
  },
  "tesla-model-x": {
    id: "tesla-model-x",
    title: "Model X (archived product page)",
    url: "https://www.tesla.com/modelx",
    publisher: "Tesla",
    accessed: ACCESSED,
  },
  "tesla-roadster": {
    id: "tesla-roadster",
    title: "Roadster (announced specifications)",
    url: "https://www.tesla.com/roadster",
    publisher: "Tesla",
    accessed: ACCESSED,
  },
  "motor1-sx-end": {
    id: "motor1-sx-end",
    title: "Tesla Model S and Model X are dead",
    url: "https://www.motor1.com/news/785771/tesla-model-s-and-model-x-dead/",
    publisher: "Motor1",
    accessed: ACCESSED,
  },
  "carfactsheet-model-3-2026": {
    id: "carfactsheet-model-3-2026",
    title: "2026 Tesla Model 3: EPA Range, Price & Specifications",
    url: "https://carfactsheet.com/2026/tesla/model-3/",
    publisher: "CarFactSheet",
    accessed: ACCESSED,
  },
  "pedalcommander-3-vs-y-2026": {
    id: "pedalcommander-3-vs-y-2026",
    title: "2026 Tesla Model Y vs Model 3: Full Specs, Fresh Standard Trims",
    url: "https://pedalcommander.com/blogs/garage/2026-tesla-model-y-vs-model-3-fresh-standard-trims",
    publisher: "Pedal Commander",
    accessed: ACCESSED,
  },
  "dtc-roadster-2027": {
    id: "dtc-roadster-2027",
    title: "Tesla pushes Roadster unveil and demo; production slated for 2027",
    url: "https://driveteslacanada.ca/news/tesla-pushes-roadster-unveil-and-demo-to-april-2026-production-now-slated-for-2027/",
    publisher: "Drive Tesla Canada",
    accessed: ACCESSED,
  },
  "wiki-roadster-gen1": {
    id: "wiki-roadster-gen1",
    title: "Tesla Roadster (first generation)",
    url: "https://en.wikipedia.org/wiki/Tesla_Roadster_(first_generation)",
    publisher: "Wikipedia",
    accessed: ACCESSED,
  },
  "wiki-model-s": { id: "wiki-model-s", title: "Tesla Model S", url: "https://en.wikipedia.org/wiki/Tesla_Model_S", publisher: "Wikipedia", accessed: ACCESSED },
  "wiki-model-3": { id: "wiki-model-3", title: "Tesla Model 3", url: "https://en.wikipedia.org/wiki/Tesla_Model_3", publisher: "Wikipedia", accessed: ACCESSED },
  "wiki-model-x": { id: "wiki-model-x", title: "Tesla Model X", url: "https://en.wikipedia.org/wiki/Tesla_Model_X", publisher: "Wikipedia", accessed: ACCESSED },
  "wiki-model-y": { id: "wiki-model-y", title: "Tesla Model Y", url: "https://en.wikipedia.org/wiki/Tesla_Model_Y", publisher: "Wikipedia", accessed: ACCESSED },
  "epa-tailpipe-co2": {
    id: "epa-tailpipe-co2",
    title: "Greenhouse Gas Emissions from a Typical Passenger Vehicle",
    url: "https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle",
    publisher: "U.S. EPA",
    accessed: ACCESSED,
  },
  "eia-co2-per-kwh": {
    id: "eia-co2-per-kwh",
    title: "How much carbon dioxide is produced per kilowatthour of U.S. electricity generation?",
    url: "https://www.eia.gov/tools/faqs/faq.php?id=74&t=11",
    publisher: "U.S. EIA",
    accessed: ACCESSED,
  },
  "anl-tco-2021": {
    id: "anl-tco-2021",
    title: "Comprehensive Total Cost of Ownership Quantification for Vehicles with Different Size Classes and Powertrains (Burnham et al., 2021)",
    url: "https://publications.anl.gov/anlpubs/2021/05/167399.pdf",
    publisher: "Argonne National Laboratory",
    accessed: ACCESSED,
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export function getSource(id: string): Source | undefined {
  return (SOURCES as Record<string, Source>)[id];
}
