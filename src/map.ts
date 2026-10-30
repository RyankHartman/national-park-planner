import { geoAlbersUsa, geoPath } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { LEVELS, MONTHS_LONG, formatVisits, type Dataset, type Park } from "./data";

const W = 960;
const H = 600;
const SVG_NS = "http://www.w3.org/2000/svg";

export interface MapView {
  setMonth(month: number): void;
  setSelected(code: string): void;
}

export async function createMap(
  data: Dataset,
  els: { canvas: HTMLElement; tooltip: HTMLElement; territories: HTMLElement },
  onSelect: (code: string) => void,
): Promise<MapView> {
  const res = await fetch(new URL("data/states-10m.json", document.baseURI));
  const topo = (await res.json()) as Topology<{ states: GeometryCollection }>;
  const states = feature(topo, topo.objects.states);

  const projection = geoAlbersUsa().fitExtent([[10, 10], [W - 10, H - 10]], states);
  const path = geoPath(projection);
  const radius = scaleSqrt().domain([0, Math.max(...data.parks.map((p) => p.latestVisits))]).range([3.5, 19]);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Map of U.S. national parks colored by crowd level");

  const land = document.createElementNS(SVG_NS, "g");
  for (const f of states.features) {
    const d = path(f);
    if (!d) continue;
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", "land");
    land.appendChild(p);
  }
  svg.appendChild(land);

  const dots = new Map<string, SVGCircleElement>();
  const dotLayer = document.createElementNS(SVG_NS, "g");
  const offMap: Park[] = [];
  // Big parks first so small ones stay clickable on top.
  for (const park of [...data.parks].sort((a, b) => b.latestVisits - a.latestVisits)) {
    const xy = projection([park.lon, park.lat]);
    if (!xy) {
      offMap.push(park);
      continue;
    }
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", xy[0].toFixed(1));
    c.setAttribute("cy", xy[1].toFixed(1));
    c.setAttribute("r", radius(park.latestVisits).toFixed(1));
    c.setAttribute("class", "dot");
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "button");
    c.dataset.code = park.code;
    c.addEventListener("click", () => onSelect(park.code));
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(park.code);
      }
    });
    c.addEventListener("pointerenter", () => showTip(park, c));
    c.addEventListener("pointerleave", hideTip);
    c.addEventListener("focus", () => showTip(park, c));
    c.addEventListener("blur", hideTip);
    dots.set(park.code, c);
    dotLayer.appendChild(c);
  }
  svg.appendChild(dotLayer);
  els.canvas.replaceChildren(svg);

  // Territories the projection can't place get chips instead.
  const terrChips = new Map<string, HTMLButtonElement>();
  els.territories.replaceChildren(
    Object.assign(document.createElement("span"), { textContent: "Also:" }),
    ...offMap.map((park) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.addEventListener("click", () => onSelect(park.code));
      terrChips.set(park.code, b);
      return b;
    }),
  );

  let month = 6;

  function label(park: Park) {
    const lv = LEVELS.find((l) => l.id === park.levels[month])!;
    return `${park.name}: ${lv.label} in ${MONTHS_LONG[month]} (${Math.round(park.index[month] * 100)}% of peak)`;
  }

  function showTip(park: Park, c: SVGCircleElement) {
    const lv = LEVELS.find((l) => l.id === park.levels[month])!;
    const box = els.canvas.getBoundingClientRect();
    const wrap = els.canvas.parentElement!.getBoundingClientRect();
    const scale = box.width / W;
    const x = box.left - wrap.left + Number(c.getAttribute("cx")) * scale;
    const y = box.top - wrap.top + Number(c.getAttribute("cy")) * scale;
    els.tooltip.innerHTML = `<strong>${park.name}</strong>${lv.label} in ${MONTHS_LONG[month]} · ${Math.round(
      park.index[month] * 100,
    )}% of peak<br>~${formatVisits(park.typical[month])} visits that month`;
    els.tooltip.style.left = `${x}px`;
    els.tooltip.style.top = `${y}px`;
    els.tooltip.hidden = false;
  }

  function hideTip() {
    els.tooltip.hidden = true;
  }

  function setMonth(m: number) {
    month = m;
    for (const park of data.parks) {
      const color = `var(--c-${park.levels[m]})`;
      const c = dots.get(park.code);
      if (c) {
        c.style.fill = color;
        c.setAttribute("aria-label", label(park));
      }
      const b = terrChips.get(park.code);
      if (b) {
        b.innerHTML = `<i class="swatch lv-${park.levels[m]}"></i>${park.name}`;
        b.setAttribute("aria-label", label(park));
      }
    }
  }

  function setSelected(code: string) {
    for (const [c, el] of dots) el.classList.toggle("selected", c === code);
  }

  setMonth(month);
  return { setMonth, setSelected };
}
