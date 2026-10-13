# Talks

The Talks screen lists recorded talks, newest first, with their event. A talk's page shows a still from the recording, tinted green, as a link to YouTube. Pressing Enter or clicking it swaps in YouTube's privacy-enhanced player (youtube-nocookie.com) in place, playing. Until then the page makes no request to YouTube.

## Sub-features

- `talks-list`: Talks lists the KubeCon talk first.
- `talk-page`: the talk page shows the poster, loaded, linking to the YouTube recording; Back returns to Talks.
- `talk-privacy`: no request reaches YouTube before play.
- `talk-play-key`: Enter swaps the poster for the `youtube-nocookie.com/embed/<id>?autoplay=1` player.
- `talk-play-click`: a plain click on the poster does the same.

## How to get to it (user POV)

- From Home, choose `Talks`; then choose a talk. Or open `/talks/cerebrium-knative/`.
- On the talk page: Enter from anywhere outside a control, or click the poster.
- A modified or middle click on the poster opens YouTube in a new tab instead. Not driven.

## Driving it with verify-webshite

Preconditions:

- Drive target: `.agents/skills/verify-webshite/scripts/verify-webshite talks --run RUN_ID`.
- `doctor` passed for this run.
- `src/content/talks/cerebrium-knative.md` still points at `https://www.youtube.com/watch?v=QqApwTinlUk`.

- **List.** ArrowDown three times on Home highlights `> Talks`; Enter opens `/talks/`, whose first entry is `/talks/cerebrium-knative/` (`01-talks.png`).
- **Talk page.** Enter opens it. The poster image has loaded, and its link is `https://www.youtube.com/watch?v=QqApwTinlUk`. No request so far has gone to a YouTube, ytimg or googlevideo host (`02-talk.png`, `02-talk.aria.txt`, `requests-0.json`).
- **Play by key.** Enter. `.talk-video iframe` appears with a `src` starting `https://www.youtube-nocookie.com/embed/QqApwTinlUk` and containing `autoplay=1`, and the poster link is gone (`03-playing.png`).
- **Play by click.** Reload the talk page and click the poster: the same player appears. Clicking `> Back` returns to `/talks/`.

## Gotchas

- After the player appears it has focus, and keys go to YouTube's frame, so Escape on the page does nothing. Use `> Back`.
- The player loads YouTube's own scripts and requests, some of which headless Chrome blocks. They are logged in `requests-N.json` but never fail the drive; only requests to the site itself do.
- `03-playing.png` shows YouTube's player only if this machine can reach YouTube; the drive waits up to 10 seconds for the player page to be requested, then 3 seconds for it to draw. Offline, it shows an empty green frame and the checks still pass, because they prove the swap, not YouTube.
- The privacy check compares host names. A poster served from YouTube (instead of the committed still) would fail it, which is the intent.
