import { LEVELS, MONTHS, MONTHS_LONG, REGION_ORDER, type Dataset } from "./data";

export interface PlanView {
  setMonth(m: number): void;
}

export function createPlan(
  data: Dataset,
  els: { months: HTMLElement; regions: HTMLElement; list: HTMLElement; off: HTMLDetailsElement; label: HTMLElement },
  initialMonth: number,
  onSelect: (code: string) => void,
): PlanView {
  let month = initialMonth;
  const regions = new Set<string>();

  // Month chips (a radio group with arrow-key support).
  const monthBtns = MONTHS.map((name, m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("role", "radio");
    b.textContent = name;
    b.setAttribute("aria-label", MONTHS_LONG[m]);
    b.addEventListener("click", () => setMonth(m));
    b.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = (month + step + 12) % 12;
      setMonth(next);
      monthBtns[next].focus();
    });
    return b;
  });
  els.months.replaceChildren(...monthBtns);

  // Region filter chips (multi-select; none selected = all regions).
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "chip";
  allBtn.textContent = "All regions";
  allBtn.addEventListener("click", () => {
    regions.clear();
    render();
  });
  const regionBtns = REGION_ORDER.map((r) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = r;
    b.addEventListener("click", () => {
      regions.has(r) ? regions.delete(r) : regions.add(r);
      render();
    });
    return [r, b] as const;
  });
  els.regions.replaceChildren(allBtn, ...regionBtns.map(([, b]) => b));

  function render() {
    els.label.textContent = MONTHS_LONG[month];
    monthBtns.forEach((b, m) => {
      b.setAttribute("aria-checked", String(m === month));
      b.tabIndex = m === month ? 0 : -1;
    });
    allBtn.setAttribute("aria-pressed", String(regions.size === 0));
    regionBtns.forEach(([r, b]) => b.setAttribute("aria-pressed", String(regions.has(r))));

    const inRegion = data.parks.filter((p) => regions.size === 0 || regions.has(p.region));
    const open = inRegion.filter((p) => p.levels[month] !== "off").sort((a, b) => a.index[month] - b.index[month]);
    const off = inRegion.filter((p) => p.levels[month] === "off");

    els.list.replaceChildren(
      ...open.map((p) => {
        const lv = LEVELS.find((l) => l.id === p.levels[month])!;
        const pct = Math.round(p.index[month] * 100);
        const li = document.createElement("li");
        li.className = "plan-item";
        li.innerHTML = `<button type="button" aria-label="${p.name}: ${lv.label}, ${pct}% of peak in ${MONTHS_LONG[month]}">
          <span class="pn">${p.name}</span>
          <span class="pd"><i class="swatch lv-${lv.id}"></i>${lv.label} · ${pct}% of peak<span class="meter"><i class="lv-${lv.id}" style="width:${Math.max(pct, 3)}%"></i></span></span>
        </button>`;
        li.querySelector("button")!.addEventListener("click", () => onSelect(p.code));
        return li;
      }),
    );
    if (!open.length) {
      const li = document.createElement("li");
      li.className = "plan-empty";
      li.textContent = "No parks in these regions are reliably open this month.";
      els.list.replaceChildren(li);
    }

    els.off.hidden = off.length === 0;
    els.off.innerHTML = off.length
      ? `<summary>${off.length} ${off.length === 1 ? "park is" : "parks are"} likely closed or hard to reach in ${MONTHS_LONG[month]}</summary>
         <p>${off.map((p) => p.name).join(" · ")}</p>`
      : "";
  }

  function setMonth(m: number) {
    month = m;
    render();
  }

  render();
  return { setMonth };
}
