# FlowShield: screen-share video script (about 2 min 50 s)

**Format:** screen recording with voiceover. The narrator clicks as they speak. Spoken pace is about 140 words per minute, so the voiceover below (about 400 words) fits in under three minutes.

## Before you press record (2 minutes of setup)

1. Open `dist/flowshield.html` in Chrome or Edge. Browser zoom 100%, window at least 1440 px wide, dark mode on, bookmarks bar hidden.
2. **Wait about 90 seconds.** The page runs the other four scenarios and trains the AI in the background. It is ready when the **AI forecast** tab shows "Emulator ready" and the zone list shows "AI x% critical".
3. Click **Extreme event (2018-like)** in the left panel, then drag the time slider to about the middle so the flood is visible. Click the **Timeline** tab so the charts are showing.
4. Do one dry run of the click path below. Numbers on screen may differ by a small amount from the ones in this script. If they do, read out what is on screen.

## Timed script

| Time | What is on screen (do this) | Voiceover (say this) |
|---|---|---|
| **0:00 to 0:15** | Full dashboard, Extreme scenario, flood visible on the map. Slowly move the mouse over the map. | "This is FlowShield. It answers one question: when will each part of a Kerala river basin flood, how bad will it get, and how many people are in the way? Many flood demos just push water downhill with a simple rule. FlowShield is built like the real thing: a physics model of the whole basin." |
| **0:15 to 0:35** | Click the **Elevation** layer, then **Land use**, then back to **Water depth**. Hover a river and a hill. | "The basin is generated from numbers, not a fixed picture. Ghats in the east, midland, backwater lowlands, three rivers, and the Arabian Sea in the west. Change the terrain seed and a new basin appears, or load a real elevation file. Nothing here is hard-coded." |
| **0:35 to 1:00** | Point at the **Rainfall** sliders in the left panel: peak intensity, duration, storm shape, last five days rain. Wiggle one slider. | "Start with the rain. You choose how hard, how long, the shape of the storm, and how wet the soil already is. Hills get extra rain. Not all rain becomes flood, though. A standard method called the Curve Number decides how much soaks in and how much runs off. Wetter soil means more runoff." |
| **1:00 to 1:30** | Click **Play** on the time bar at 2×. Watch the flood spread. Point at the river, then the coast. | "Now the water moves. Every cell trades water with its four neighbours using the shallow-water equations, the same idea professional flood models use. In simple words: water speeds up going downhill, and friction from ground and plants slows it. Water also arrives from upstream rivers and dam releases, and at the coast the tide pushes back. Drains take water away at a fixed capacity. And the model checks itself: it counts every drop, and the water books balance to zero percent error." |
| **1:30 to 1:55** | Click **Risk level** layer. Point at the alert banner, then the top of the zone list (countdown, people, evacuation note). Click **Alert bulletin**, point at the Malayalam text, close it. | "Now the warning. Each cell gets a hazard score from depth and speed, then becomes Safe, Warning or Critical. Each zone gets a countdown. Here, the top zone goes critical in this many hours, with the number of people affected and where to evacuate. The bulletin comes out in English and Malayalam." |
| **1:55 to 2:20** | Click the **Scenarios** tab. Point at the table rows: Heavy, Drainage failure, Blocked channel. Click a row to load it. Optionally show the paint tool: **Fail drains** and drag on the map. | "You can compare scenarios: normal, heavy, and an extreme 2018-style event. Same heavy rain, but with clogged drains, people affected goes from 232 thousand to 309 thousand. Blocking a river gives 305 thousand. You can also paint clogged drains or drop a river blockage yourself and re-run." |
| **2:20 to 2:45** | Click the **AI forecast** tab. Point at the accuracy boxes and the scatter plot. Then point at the "AI x% critical" numbers in the zone list. | "On top sits an AI. We ran forty random storms through the physics and trained a small neural network on the results. Now it answers instantly as you move a slider, gives each zone a probability of going critical, and shows what drives risk. On storms it never saw, it scores 0.98 out of 1 at spotting critical zones. The physics stays the referee." |
| **2:45 to 2:55** | Return to the full dashboard. Slow pan across the map. | "Honest limits: the terrain is generated until a real elevation file is loaded, and the constants need calibrating on 2018 data. But the machinery is real. FlowShield: predict the flood, protect the future." |

## Full voiceover, read straight through

> This is FlowShield. It answers one question: when will each part of a Kerala river basin flood, how bad will it get, and how many people are in the way? Many flood demos just push water downhill with a simple rule. FlowShield is built like the real thing: a physics model of the whole basin.
>
> The basin is generated from numbers, not a fixed picture. Ghats in the east, midland, backwater lowlands, three rivers, and the Arabian Sea in the west. Change the terrain seed and a new basin appears, or load a real elevation file. Nothing here is hard-coded.
>
> Start with the rain. You choose how hard, how long, the shape of the storm, and how wet the soil already is. Hills get extra rain. Not all rain becomes flood, though. A standard method called the Curve Number decides how much soaks in and how much runs off. Wetter soil means more runoff.
>
> Now the water moves. Every cell trades water with its four neighbours using the shallow-water equations, the same idea professional flood models use. In simple words: water speeds up going downhill, and friction from ground and plants slows it. Water also arrives from upstream rivers and dam releases, and at the coast the tide pushes back. Drains take water away at a fixed capacity. And the model checks itself: it counts every drop, and the water books balance to zero percent error.
>
> Now the warning. Each cell gets a hazard score from depth and speed, then becomes Safe, Warning or Critical. Each zone gets a countdown. Here, the top zone goes critical in this many hours, with the number of people affected and where to evacuate. The bulletin comes out in English and Malayalam.
>
> You can compare scenarios: normal, heavy, and an extreme 2018-style event. Same heavy rain, but with clogged drains, people affected goes from 232 thousand to 309 thousand. Blocking a river gives 305 thousand. You can also paint clogged drains or drop a river blockage yourself and re-run.
>
> On top sits an AI. We ran forty random storms through the physics and trained a small neural network on the results. Now it answers instantly as you move a slider, gives each zone a probability of going critical, and shows what drives risk. On storms it never saw, it scores 0.98 out of 1 at spotting critical zones. The physics stays the referee.
>
> Honest limits: the terrain is generated until a real elevation file is loaded, and the constants need calibrating on 2018 data. But the machinery is real. FlowShield: predict the flood, protect the future.

## The three ideas to land (if the narrator forgets everything else)

1. **It is physics, not a drawing.** Water moves by real equations, and the model proves it by balancing every drop.
2. **The output is a warning.** Which zone, how bad, how many hours, how many people, where to go.
3. **AI supports the physics.** It learns from the simulator, so it is fast and can be checked against the truth.

## Plain-language explanations for the narrator (if asked)

- **Shallow-water equations:** Think of a bath with a sloped floor. Water pushes downhill, gets slowed by the rough floor, and piles up where it cannot escape. The equations say exactly how fast, cell by cell.
- **Curve Number:** A number from 0 to 100 for how "waterproof" the ground is. Concrete is about 92, forest about 60. Higher means more rain runs off instead of soaking in.
- **Hazard score:** Depth alone is not enough. Fast shallow water can knock you over. The score multiplies depth by speed (plus a little constant), so fast water counts as more dangerous.
- **Time to critical:** For each cell, the exact moment the hazard score crosses the Critical line, found between the half-hour snapshots by straight-line interpolation.
- **AI emulator:** The physics takes two seconds per run. The AI learned from forty runs, so it can answer in a fraction of a second, and it can test hundreds of "what if the forecast is wrong" cases.
- **Water balance:** Rain in, plus river inflow, minus drains and sea outflow, must equal the change in stored water. If a model gets this wrong it is leaking or inventing water.

## Numbers you can quote (default settings)

| Scenario | People affected (peak) | Critical zones |
|---|---|---|
| Normal monsoon | about 100 | 0 |
| Heavy rainfall | 232,000 | 1 |
| Drainage failure | 309,000 | 3 |
| Blocked river channel | 305,000 | 2 |
| Extreme (2018-like) | 805,000 | 11 |

AI on held-out storms: AUC 0.98, 94% accuracy, R² 0.87. One physics run takes about 2 seconds.

## If the recording runs short or long

- **Short on time:** drop the Elevation and Land use clicks in the 0:15 segment and the paint-tool demo in the 1:55 segment.
- **Extra 20 seconds:** click **Method** and scroll briefly to show the equations, and say "every formula is written out here and in the README."
