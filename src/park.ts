import { area, line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { RYAN_VISITED } from "./passport";
import { LEVELS, MONTHS, MONTHS_LONG, formatFull, formatVisits, monthList, type Dataset, type Park } from "./data";

const levelLabel = (id: string) => LEVELS.find((l) => l.id === id)!.label;

/** Short "best time to go" summary used in the hero card and park detail. */
export function bestSummary(park: Park): string {
  return park.sweetSpot.length ? monthList(park.sweetSpot) : "Any time";
}

export function calendarBars(park: Park, compact = false): string {
  const bars = park.index
    .map((v, m) => {
      const lv = park.levels[m];
      const best = park.sweetSpot.includes(m);
      const h = Math.max(v * 100, 3).toFixed(1);
      const tip = `${MONTHS_LONG[m]}: ${levelLabel(lv)}, ${Math.round(v * 100)}% of peak, ~${formatVisits(park.typical[m])} visits`;
      return `<div class="cal-bar${best ? " best-m" : ""}" title="${tip}">
        <div class="fill lv-${lv}" style="height:${h}%"></div>
        <span class="m">${compact ? MONTHS[m][0] : MONTHS[m]}</span>
      </div>`;
    })
    .join("");
  const summary = park.index
    .map((v, m) => `${MONTHS_LONG[m]} ${levelLabel(park.levels[m]).toLowerCase()} (${Math.round(v * 100)}%)`)
    .join(", ");
  return `<div class="cal-bars" role="img" aria-label="Crowd calendar for ${park.name}: ${summary}"${
    compact ? ' style="height:120px"' : ""
  }>${bars}</div>`;
}

function trendChart(park: Park, years: number[]): string {
  const W = 640;
  const H = 210;
  const M = { t: 18, r: 56, b: 26, l: 8 };
  const x = scaleLinear().domain([years[0], years[years.length - 1]]).range([M.l, W - M.r]);
  const max = Math.max(...park.annual, 1);
  const y = scaleLinear().domain([0, max * 1.1]).range([H - M.b, M.t]);
  const pts = park.annual.map((v, i) => [years[i], v] as [number, number]);
  const a = area<[number, number]>().x((d) => x(d[0])).y0(y(0)).y1((d) => y(d[1]))(pts) ?? "";
  const l = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]))(pts) ?? "";
  const ticks = [1980, 1990, 2000, 2010, 2020].filter((t) => t >= years[0]);
  const last = pts[pts.length - 1];
  const i2020 = years.indexOf(2020);
  const i2019 = years.indexOf(2019);
  const dip = i2020 > 0 && i2019 >= 0 && park.annual[i2020] < park.annual[i2019] * 0.85;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual recreation visits to ${park.name}, ${years[0]} to ${last[0]}. Latest: ${formatFull(last[1])}. Peak year: ${years[park.annual.indexOf(max)]}.">
    <g class="axis">
      <line x1="${M.l}" x2="${W - M.r}" y1="${y(0)}" y2="${y(0)}" />
      ${ticks.map((t) => `<text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`).join("")}
      <text x="${M.l}" y="${M.t - 6}">Peak year: ${formatVisits(max)} (${years[park.annual.indexOf(max)]})</text>
    </g>
    <path class="area" d="${a}" />
    <path class="line" d="${l}" />
    ${dip ? `<text class="note" x="${x(2020)}" y="${y(park.annual[i2020]) + 18}" text-anchor="middle">2020: COVID closures</text>` : ""}
    <circle class="last" cx="${x(last[0])}" cy="${y(last[1])}" r="4.5" />
    <text class="note" x="${x(last[0]) + 8}" y="${y(last[1]) + 4}">${formatVisits(last[1])}</text>
  </svg>`;
}

export function renderPark(el: HTMLElement, park: Park, data: Dataset) {
  const peakM = park.peakMonth;
  const offMonths = park.levels.map((l, m) => (l === "off" ? m : -1)).filter((m) => m >= 0);
  // Months that are quiet but below the "realistically open" bar (10–25% of peak).
  const veryQuiet = park.index.map((v, m) => (v >= 0.1 && v < 0.25 ? m : -1)).filter((m) => m >= 0);
  const firstYear = data.years.find((_, i) => park.annual[i] > 0) ?? data.years[0];

  el.innerHTML = `
    <article class="park-card">
      <header class="park-top">
        <div>
          <p class="kicker">${park.region}${RYAN_VISITED.has(park.code) ? ' <span class="been">✓ Ryan has been here</span>' : ""}</p>
          <h2 id="park-name">${park.name} National Park</h2>
          <p class="park-meta">${park.state}</p>
        </div>
        <div class="stats">
          <div class="stat"><b>${formatVisits(park.latestVisits)}</b><span>visits in ${park.latestYear}</span></div>
          <div class="stat"><b>#${park.rank}</b><span>most visited of 63</span></div>
          <div class="stat"><b>${Math.round(park.peakSeasonShare * 100)}%</b><span>of visits in its 3 busiest months</span></div>
        </div>
      </header>
      <div class="park-body">
        <div>
          <div class="best">
            <h3>Best time to go</h3>
            <p class="best-months">${bestSummary(park)}</p>
            <p>The quietest months that still see real traffic, so the park is likely open and accessible.${
              veryQuiet.length
                ? ` ${monthList(veryQuiet, true)} ${veryQuiet.length > 1 ? "are" : "is"} even quieter, but under a quarter of peak traffic often means harsh weather or fewer services.`
                : ""
            }</p>
          </div>
          <div class="avoid">Busiest month: <strong>${MONTHS_LONG[peakM]}</strong>, with about ${formatVisits(park.typical[peakM])} visits in a typical year.${
            offMonths.length
              ? ` ${monthList(offMonths, true)} ${offMonths.length > 1 ? "are" : "is"} off-season: expect closures or limited access.`
              : ""
          }</div>
        </div>
        <div>
          <div class="calendar">
            <h3>Crowd calendar · typical year (2022–2024)</h3>
            ${calendarBars(park)}
            <p class="cal-note">Bar height shows each month’s visits compared with ${park.name}’s busiest month.</p>
          </div>
          <div class="trend">
            <h3>Visitors per year, ${firstYear}–${park.latestYear}</h3>
            ${trendChart(park, data.years)}
          </div>
        </div>
      </div>
    </article>`;
}

export function renderHeroCard(el: HTMLElement, park: Park, onOpen: () => void) {
  el.innerHTML = `
    <div class="hc-top"><h3>${park.name}</h3><span class="hc-sub">${park.state}</span></div>
    <p class="hc-best">Best time to go: <strong>${bestSummary(park)}</strong></p>
    ${calendarBars(park, true)}
    <button class="link" type="button">See the full crowd calendar →</button>`;
  el.querySelector("button")!.addEventListener("click", onOpen);
}
