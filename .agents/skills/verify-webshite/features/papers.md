# Papers

The Papers screen lists unpublished academic papers, newest first, with year and context. A paper's page shows its authors and abstract and offers the PDF as a download. Where they exist, it also links the related project and shows a muted demo video. The list has the same fuzzy search as Projects.

## Sub-features

- `papers-list`: Papers lists the ant swarm paper (2021) before the Implicative Bayesian Networks paper (2016); Escape from a paper returns to it.
- `paper-page`: a paper's page has its authors line and, for the ant paper, a link to its project.
- `paper-pdf`: the first entry downloads the PDF, which is served as a PDF.
- `paper-demo`: clicking the ant paper's demo video plays it, muted.
- `paper-search`: typing on the list narrows it, and Enter opens the match.

## How to get to it (user POV)

- From Home, choose `Papers`; then choose a paper. Or open `/papers/<id>/`.
- On a paper page: `Download the paper` (the PDF), `Project: <name>`, and the demo video's own controls.
- Search on the list by typing or `/`.

## Driving it with verify-webshite

Preconditions:

- Drive target: `.agents/skills/verify-webshite/scripts/verify-webshite papers --run RUN_ID`.
- `doctor` passed for this run.
- `src/content/papers/` holds exactly the two papers named above, with their PDFs and `right-biased-ants.mp4` in `public/papers/`.

- **List.** ArrowDown four times on Home highlights `> Papers`; Enter opens `/papers/`, listing `/papers/neuroevolution-ant-swarms/` then `/papers/implicative-bayesian-networks/` (`01-papers.png`).
- **Ant paper.** Enter opens the first. Its first entry is `/papers/neuroevolution-ant-swarms.pdf` with a `download` attribute, and its second is `/projects/ant-neuroevolution/`. Fetching the PDF returns 200, `application/pdf`, over 100 KB (`02-ant-paper.png`, `02-ant-paper.aria.txt`).
- **Demo.** Clicking `.paper-demo video` plays it past 0.3 s, muted (`03-demo-playing.png`).
- **Search.** Escape returns to `/papers/`. With the pointer moved off the list, type `implicative`. Only the Bayesian networks paper remains; Enter opens it.
- **Honours paper.** Its authors line reads `Elijah Roussos · supervised by Prof. Thomas Meyer`, and its only entry is the PDF download (`04-ibn-paper.png`).

## Gotchas

- `bayes` matches both papers (the ant paper ranks second), so it cannot prove filtering. Use `implicative`.
- After clicking the video the pointer rests where the list will be on `/papers/`, and hovering selects; move it away before typing (`park_pointer`).
- The PDF is fetched, not downloaded through the browser's download UI; the `download` attribute is checked separately.
- The day-long cache on PDFs and the demo comes from `public/_headers`, which `astro preview` ignores. Check it against a deployed address.
