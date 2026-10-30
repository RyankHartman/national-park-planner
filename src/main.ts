import "./styles.css";
import { LEVELS, MONTHS, MONTHS_LONG, loadData } from "./data";
import { createMap } from "./map";
import { createPlan } from "./plan";
import { renderHeroCard, renderPark } from "./park";
import { createSearch } from "./search";
import { createPassport } from "./passport";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const QUICK_PICKS = ["ZION", "YOSE", "GRSM", "ACAD", "GLAC", "ARCH"];

// ---------- Theme toggle ----------
const themeBtn = $("theme-toggle");
const isDark = () =>
  document.documentElement.dataset.theme === "dark" ||
  (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
const syncThemeLabel = () => themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("npp-theme", next);
  } catch {
    /* storage unavailable */
  }
  syncThemeLabel();
});
syncThemeLabel();

async function start() {
  const data = await loadData();

  // State lives in the URL (?park=ZION&month=4) so any view can be shared.
  const params = new URLSearchParams(location.search);
  const thisMonth = new Date().getMonth();
  let park = data.byCode.get((params.get("park") ?? "").toUpperCase()) ?? data.byCode.get("ZION")!;
  const urlMonth = Number(params.get("month"));
  let month = Number.isInteger(urlMonth) && urlMonth >= 1 && urlMonth <= 12 ? urlMonth - 1 : thisMonth;

  const syncUrl = () => {
    const p = new URLSearchParams({ park: park.code, month: String(month + 1) });
    history.replaceState(null, "", `?${p}${location.hash}`);
  };

  // ---------- Legend ----------
  $("legend").innerHTML = LEVELS.map(
    (l) => `<span title="${l.hint}"><i class="swatch lv-${l.id}"></i>${l.label}</span>`,
  ).join("");

  // ---------- Map ----------
  const slider = $<HTMLInputElement>("map-month");
  const ticks = document.querySelector(".month-ticks")!;
  ticks.innerHTML = MONTHS.map((m) => `<span>${m}</span>`).join("");
  const map = await createMap(
    data,
    { canvas: $("map-canvas"), tooltip: $("map-tooltip"), territories: $("territories") },
    (code) => selectPark(code, true),
  );

  function setMapMonth(m: number) {
    month = m;
    slider.value = String(m);
    slider.setAttribute("aria-valuetext", MONTHS_LONG[m]);
    $("map-month-label").textContent = MONTHS_LONG[m];
    [...ticks.children].forEach((t, i) => t.classList.toggle("on", i === m));
    map.setMonth(m);
    syncUrl();
  }
  slider.addEventListener("input", () => {
    stopPlay();
    setMapMonth(Number(slider.value));
  });

  const playBtn = $("map-play");
  let timer: number | undefined;
  function stopPlay() {
    if (timer) clearInterval(timer);
    timer = undefined;
    playBtn.setAttribute("aria-pressed", "false");
    playBtn.setAttribute("aria-label", "Play through the months");
  }
  playBtn.addEventListener("click", () => {
    if (timer) return stopPlay();
    playBtn.setAttribute("aria-pressed", "true");
    playBtn.setAttribute("aria-label", "Pause");
    timer = window.setInterval(() => setMapMonth((month + 1) % 12), 900);
  });

  // ---------- Park detail + hero ----------
  const parkEl = $("park");
  const heroCard = $("hero-card");
  function selectPark(code: string, scroll = false) {
    const p = data.byCode.get(code);
    if (!p) return;
    park = p;
    renderPark(parkEl, p, data);
    renderHeroCard(heroCard, p, () => parkEl.scrollIntoView({ behavior: "smooth" }));
    map.setSelected(p.code);
    document.querySelectorAll<HTMLButtonElement>("#quick-picks .chip").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.code === p.code)),
    );
    syncUrl();
    if (scroll) parkEl.scrollIntoView({ behavior: "smooth" });
  }

  $("quick-picks").replaceChildren(
    ...QUICK_PICKS.map((code) => {
      const p = data.byCode.get(code)!;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.code = code;
      b.textContent = p.name;
      b.addEventListener("click", () => selectPark(code));
      return b;
    }),
  );

  createSearch(data, $<HTMLInputElement>("search-input"), $<HTMLUListElement>("search-list"), (code) => selectPark(code, true));

  // ---------- Plan by month ----------
  createPlan(
    data,
    {
      months: $("plan-months"),
      regions: $("plan-regions"),
      list: $("plan-list"),
      off: $<HTMLDetailsElement>("plan-off"),
      label: $("plan-month-label"),
    },
    month,
    (code) => selectPark(code, true),
  );

  // ---------- Passport ----------
  createPassport(
    data,
    { tabs: $("passport-tabs"), title: $("passport-title"), sub: $("passport-sub"), bar: $("passport-bar"), grid: $("passport-grid") },
    (code) => selectPark(code, true),
  );

  setMapMonth(month);
  selectPark(park.code);
}

start().catch((err) => {
  console.error(err);
  $("hero-card").innerHTML = `<p>Couldn’t load the park data. Please refresh the page.</p>`;
});
