import type { Dataset } from "./data";

// Accessible combobox (ARIA 1.2 pattern): type to filter, arrows to move, Enter to pick, Esc to close.
export function createSearch(data: Dataset, input: HTMLInputElement, list: HTMLUListElement, onSelect: (code: string) => void) {
  let results: typeof data.parks = [];
  let active = -1;

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯʻ]/g, "").toLowerCase();

  function open(show: boolean) {
    list.hidden = !show;
    input.setAttribute("aria-expanded", String(show));
    if (!show) input.removeAttribute("aria-activedescendant");
  }

  function render() {
    const q = norm(input.value.trim());
    results = q
      ? data.parks.filter((p) => norm(p.name).includes(q) || norm(p.state).includes(q) || p.code.toLowerCase() === q).slice(0, 8)
      : [];
    active = results.length ? 0 : -1;
    if (!q) return open(false);
    list.replaceChildren(
      ...(results.length
        ? results.map((p, i) => {
            const li = document.createElement("li");
            li.id = `opt-${p.code}`;
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", String(i === active));
            li.innerHTML = `<span>${p.name}</span><span class="st">${p.state}</span>`;
            li.addEventListener("mousedown", (e) => {
              e.preventDefault();
              pick(i);
            });
            return li;
          })
        : [Object.assign(document.createElement("li"), { className: "empty", textContent: "No national park matches that." })]),
    );
    updateActive();
    open(true);
  }

  function updateActive() {
    [...list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    if (active >= 0) input.setAttribute("aria-activedescendant", `opt-${results[active].code}`);
  }

  function pick(i: number) {
    const p = results[i];
    if (!p) return;
    input.value = p.name;
    open(false);
    onSelect(p.code);
  }

  input.addEventListener("input", render);
  input.addEventListener("focus", () => input.value && render());
  input.addEventListener("blur", () => setTimeout(() => open(false), 100));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      active = (active + 1) % results.length;
      updateActive();
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      active = (active - 1 + results.length) % results.length;
      updateActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      open(false);
    }
  });
}
