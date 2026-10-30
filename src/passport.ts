import { type Dataset } from "./data";

// The national parks Ryan has visited.
export const RYAN_VISITED = new Set([
  "ZION", "BRCA", "CANY", "ARCH", "GRTE", "YELL", "JOTR", "DEVA", "EVER", "GRSM",
  "ROMO", "JEFF", "MACA", "INDU", "PEFO", "GRCA", "MEVE", "SAGU", "SEQU", "YOSE",
]);

const STORAGE_KEY = "npp-my-parks";

// A visitor's own passport lives only in their browser.
function loadMine(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveMine(codes: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...codes]));
  } catch {
    /* storage unavailable: the passport still works for this visit */
  }
}

// A small, stable tilt per park so the stamps look hand-pressed.
function tilt(code: string) {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 11) - 5;
}

export function createPassport(
  data: Dataset,
  els: { tabs: HTMLElement; title: HTMLElement; sub: HTMLElement; bar: HTMLElement; grid: HTMLElement },
  onOpen: (code: string) => void,
) {
  const mine = loadMine();
  let tab: "ryan" | "mine" = "ryan";

  const tabBtns = (["ryan", "mine"] as const).map((id) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("role", "tab");
    b.textContent = id === "ryan" ? "Ryan’s parks" : "Your parks";
    b.addEventListener("click", () => {
      tab = id;
      render();
    });
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      tab = tab === "ryan" ? "mine" : "ryan";
      render();
      tabBtns[tab === "ryan" ? 0 : 1].focus();
    });
    return b;
  });
  els.tabs.replaceChildren(...tabBtns);

  function render(focusCode?: string) {
    const visited = tab === "ryan" ? RYAN_VISITED : mine;
    const n = data.parks.filter((p) => visited.has(p.code)).length;
    tabBtns.forEach((b, i) => {
      const on = (i === 0) === (tab === "ryan");
      b.setAttribute("aria-selected", String(on));
      b.setAttribute("aria-pressed", String(on));
      b.tabIndex = on ? 0 : -1;
    });

    els.title.textContent =
      tab === "ryan" ? `${n} of 63 parks, and counting` : n ? `You’ve been to ${n} of 63` : "How many have you visited?";
    els.sub.textContent =
      tab === "ryan"
        ? "The national parks Ryan has explored so far. Tap a stamp to see that park’s crowd calendar."
        : "Tap a stamp to mark a park you’ve visited. It’s saved on this device only.";
    els.bar.innerHTML = `<span class="pp-count">${n}<small>/63</small></span><span class="meter pp-meter"><i style="width:${(n / 63) * 100}%"></i></span>`;

    els.grid.replaceChildren(
      ...data.parks.map((p) => {
        const on = visited.has(p.code);
        const b = document.createElement("button");
        b.type = "button";
        b.className = `stamp${on ? " on" : ""}`;
        b.style.setProperty("--tilt", `${tilt(p.code)}deg`);
        if (tab === "mine") b.setAttribute("aria-pressed", String(on));
        b.setAttribute(
          "aria-label",
          tab === "ryan" ? `${p.name}${on ? ", visited by Ryan" : ""}. Open crowd calendar` : `${p.name}${on ? ", visited" : ""}`,
        );
        b.innerHTML = `<span class="stamp-ring"><span class="stamp-code">${p.code}</span><span class="stamp-check" aria-hidden="true">${on ? "✓" : ""}</span></span><span class="stamp-name">${p.name}</span>`;
        b.dataset.code = p.code;
        b.addEventListener("click", () => {
          if (tab === "ryan") return onOpen(p.code);
          mine.has(p.code) ? mine.delete(p.code) : mine.add(p.code);
          saveMine(mine);
          render(p.code);
        });
        return b;
      }),
    );
    if (focusCode) els.grid.querySelector<HTMLButtonElement>(`[data-code="${focusCode}"]`)?.focus();
  }

  render();
}
