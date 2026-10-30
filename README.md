# National Park Planner 🏔️

**Find the quiet season at every national park.** Crowd calendars for all 63 U.S. national parks, built from the National Park Service's own monthly visitor counts.

**[Open the planner →](https://ryankhartman.github.io/national-park-planner/)**

## The problem

"When should I visit Zion to avoid the crowds?" is one of the most common trip-planning questions, and the usual answers are vague ("go in the shoulder season"). The NPS publishes the exact numbers, but as a 72 MB spreadsheet of park codes and statistic abbreviations that almost nobody reads. The planner turns that data into a direct answer for every park.

## What it does

- **Best time to go:** for any park, the quietest months that are still realistically open
- **Crowd calendar:** twelve months colored from quiet to peak, relative to that park's own busiest month
- **Interactive map:** slide through the year and watch 63 parks move between quiet and peak
- **Plan by month:** pick a month and get the calmest parks, filterable by region
- **47-year trend:** annual visitors for each park since 1979
- **Shareable views:** the URL carries the park and month (e.g. `?park=ZION&month=11`)
- Search with keyboard support, light and dark themes, works on phones, respects reduced-motion settings

## Product decisions

| Decision | Why |
| --- | --- |
| Crowd level is **relative to each park's own peak**, not absolute visitors | A "busy" month at Isle Royale is a quiet day at the Great Smokies. Travelers want to know when *this* park is calm. |
| A typical year averages **2022–2024** | Avoids the 2020–21 COVID closures and the fall 2025 federal shutdown, which distorted monthly counts. |
| "Best time to go" requires **at least 25% of peak traffic** | The emptiest months are often empty because roads are closed or the weather is harsh. Recommending them would be technically true and practically useless. |
| Months under 10% of peak are **flagged as off-season**, never recommended | Honest about the limits of visitor counts as a proxy for conditions. |
| No backend, no accounts, no tracking | The data changes once a year. A static site is fast, free to host and has nothing to break. |

## Data

[NPS Visitor Use Statistics Data Package, 2025](https://irma.nps.gov/DataStore/Reference/Profile/2317666), released under CC0 (public domain). National Park Planner uses **total recreation visits** by park and month, 1979–2025. Years before a park became a national park count its earlier designation (for example, a national monument).

To rebuild the dataset from a fresh download:

```bash
node scripts/build-data.mjs path/to/Main_Data.csv
```

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to docs/ for GitHub Pages
```

Built with TypeScript, Vite, D3 (map projection and charts) and no UI framework.

## What's next

- **Weather and access overlay:** combine crowd levels with typical temperatures and road-opening dates, so "quiet" and "pleasant" are both visible
- **Day-of-week patterns** where parks publish them (weekends vs. weekdays matter as much as months)
- **"My parks" passport:** mark the parks you've visited (I'm at 20 of 63)

---

<sub>A project by [Ryan Hartman](https://ryan-builds-stories.lovable.app) · 🐾 Knight is in the corner if you have questions about me · Not affiliated with the National Park Service</sub>
