// Builds public/data/visits.json from the NPS Visitor Use Statistics data package.
//
// Source: NPS Visitor Use Statistics Data Package, 2025 (CC0), Main_Data.csv
//   https://irma.nps.gov/DataStore/Reference/Profile/2317666
// Usage: node scripts/build-data.mjs path/to/Main_Data.csv

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/build-data.mjs path/to/Main_Data.csv");
  process.exit(1);
}

const parks = JSON.parse(fs.readFileSync(path.join(root, "scripts", "parks.json"), "utf8"));
const codes = new Set(parks.map((p) => p.code));
const FIRST_YEAR = 1979;

// visits[code][year][month-1] = total recreation visits (TRV)
const visits = {};
let lastYear = FIRST_YEAR;
const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/);
const header = lines[0].replace(/"/g, "").split(",");
const col = (name) => header.indexOf(name);
const [cUnit, cYear, cMonth, cStat, cValue] = ["UnitCode", "Year", "Month", "Statistic", "Value"].map(col);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.includes('"TRV"')) continue;
  const f = line.replace(/"/g, "").split(",");
  const code = f[cUnit];
  if (!codes.has(code) || f[cStat] !== "TRV") continue;
  const year = Number(f[cYear]);
  const month = Number(f[cMonth]);
  const value = Number(f[cValue]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || !Number.isFinite(value)) continue;
  visits[code] ??= {};
  visits[code][year] ??= Array(12).fill(null);
  visits[code][year][month - 1] = value;
  lastYear = Math.max(lastYear, year);
}

const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
const missing = parks.filter((p) => !visits[p.code]).map((p) => p.code);
if (missing.length) console.warn("No TRV rows for:", missing.join(", "));

const out = {
  source: {
    name: "NPS Visitor Use Statistics Data Package, 2025",
    url: "https://irma.nps.gov/DataStore/Reference/Profile/2317666",
    license: "CC0 1.0 (public domain)",
    statistic: "Total recreation visits (TRV), by month",
  },
  generated: new Date().toISOString().slice(0, 10),
  years,
  parks: parks.map((p) => ({
    ...p,
    // One row per year, 12 monthly values (null where not reported).
    monthly: years.map((y) => visits[p.code]?.[y] ?? Array(12).fill(null)),
  })),
};

const dest = path.join(root, "public", "data", "visits.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`Wrote ${dest}: ${parks.length} parks, ${years[0]}-${lastYear}, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
