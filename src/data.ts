// Loads the NPS visitation data and derives everything the UI shows.

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A "typical year" averages recent normal years: after the 2020–21 COVID dip,
// and before the October–November 2025 federal shutdown disrupted counts.
export const TYPICAL_YEARS = [2022, 2023, 2024];

export type Level = "off" | "quiet" | "moderate" | "busy" | "peak";

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "quiet", label: "Quiet", hint: "Under 40% of the park's peak month" },
  { id: "moderate", label: "Moderate", hint: "40–70% of peak" },
  { id: "busy", label: "Busy", hint: "70–90% of peak" },
  { id: "peak", label: "Peak", hint: "90% of peak or more" },
  { id: "off", label: "Off-season", hint: "Under 10% of peak: closures or limited access are likely" },
];

export function levelFor(index: number): Level {
  if (index < 0.1) return "off";
  if (index < 0.4) return "quiet";
  if (index < 0.7) return "moderate";
  if (index < 0.9) return "busy";
  return "peak";
}

export const REGIONS: Record<string, string> = {
  ME: "Northeast", WV: "Northeast", VA: "Northeast", OH: "Midwest", IN: "Midwest", MI: "Midwest", MN: "Midwest",
  MO: "Midwest", SD: "Midwest", ND: "Midwest", KY: "Southeast", TN: "Southeast", SC: "Southeast", FL: "Southeast",
  AR: "Southeast", TX: "Southwest", NM: "Southwest", AZ: "Southwest", UT: "Southwest", NV: "Southwest",
  CO: "Rocky Mountains", WY: "Rocky Mountains", MT: "Rocky Mountains", ID: "Rocky Mountains",
  CA: "Pacific", OR: "Pacific", WA: "Pacific", AK: "Alaska", HI: "Hawaiʻi & territories", AS: "Hawaiʻi & territories",
  VI: "Hawaiʻi & territories",
};
export const REGION_ORDER = ["Northeast", "Southeast", "Midwest", "Southwest", "Rocky Mountains", "Pacific", "Alaska", "Hawaiʻi & territories"];

interface RawPark {
  code: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  monthly: (number | null)[][];
}

interface RawData {
  source: { name: string; url: string; license: string; statistic: string };
  generated: string;
  years: number[];
  parks: RawPark[];
}

export interface Park {
  code: string;
  name: string;
  state: string;
  region: string;
  lat: number;
  lon: number;
  /** Average visits per month in a typical year (Jan..Dec). */
  typical: number[];
  /** typical[m] / busiest typical month, 0..1 */
  index: number[];
  levels: Level[];
  /** Annual recreation visits per year, aligned with data.years. */
  annual: number[];
  latestYear: number;
  latestVisits: number;
  rank: number;
  peakMonth: number;
  /** Quietest months that are still realistically open (index >= 0.25), best first. */
  sweetSpot: number[];
  /** Share of a typical year's visits that land in the busiest three months. */
  peakSeasonShare: number;
}

export interface Dataset {
  source: RawData["source"];
  years: number[];
  parks: Park[];
  byCode: Map<string, Park>;
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((s, v) => s + (v ?? 0), 0);

export async function loadData(): Promise<Dataset> {
  const res = await fetch(new URL("data/visits.json", document.baseURI));
  if (!res.ok) throw new Error(`Could not load visitation data (HTTP ${res.status})`);
  const raw = (await res.json()) as RawData;
  const yIndex = (y: number) => raw.years.indexOf(y);
  const latestYear = raw.years[raw.years.length - 1];

  const parks: Park[] = raw.parks.map((p) => {
    const typical = Array.from({ length: 12 }, (_, m) => {
      const vals = TYPICAL_YEARS.map((y) => p.monthly[yIndex(y)]?.[m]).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const peak = Math.max(...typical, 1);
    const index = typical.map((v) => v / peak);
    const annual = p.monthly.map(sum);
    const order = index.map((v, m) => [v, m] as const);
    const sweetSpot = order
      .filter(([v]) => v >= 0.25)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 3)
      .map(([, m]) => m);
    const typicalTotal = typical.reduce((a, b) => a + b, 0) || 1;
    const top3 = [...typical].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
    const firstState = p.state.split(",")[0].trim();

    return {
      code: p.code,
      name: p.name,
      state: p.state,
      region: REGIONS[firstState] ?? "Other",
      lat: p.lat,
      lon: p.lon,
      typical,
      index,
      levels: index.map(levelFor),
      annual,
      latestYear,
      latestVisits: annual[annual.length - 1],
      rank: 0,
      peakMonth: index.indexOf(1),
      sweetSpot,
      peakSeasonShare: top3 / typicalTotal,
    };
  });

  [...parks].sort((a, b) => b.latestVisits - a.latestVisits).forEach((p, i) => (p.rank = i + 1));
  parks.sort((a, b) => a.name.localeCompare(b.name));

  return { source: raw.source, years: raw.years, parks, byCode: new Map(parks.map((p) => [p.code, p])) };
}

export function formatVisits(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

export function formatFull(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "Mar, Apr and Nov" */
export function monthList(months: number[], long = false): string {
  const names = [...months].sort((a, b) => a - b).map((m) => (long ? MONTHS_LONG : MONTHS)[m]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
