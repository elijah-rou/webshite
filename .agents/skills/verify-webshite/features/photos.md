# Photos

The Photos screen is a grid of Instagram posts, newest first; an album's tile shows its image count. Opening a post shows the viewer. `<` and `>` beside the image step within an album, and the left and right arrow keys step through every image across posts. Buttons below move between posts. Stepping swaps the image in place and the address follows it without adding history entries, so Back or Escape leaves the viewer for the grid.

## Sub-features

- `photo-grid`: Photos shows the grid with its first thumbnails loaded; Escape from the viewer returns to it.
- `photo-open`: an album tile opens the viewer at `1/<count>` with the image loaded.
- `photo-step-link`: `>` shows the next image, loads a different file, and changes the address.
- `photo-step-keys`: ArrowRight and ArrowLeft step, without new history entries.
- `photo-next-post`: the post buttons open the neighbouring post.

## How to get to it (user POV)

- From Home, choose `Photos`, or open `/instagram/`. The address stays `/instagram/` for historical reasons.
- In the viewer: click `<` or `>`, press ArrowLeft or ArrowRight, use the previous and next post buttons, and click `> Back` or press Escape.
- Clicking the image opens the post on Instagram. Not driven.

## Driving it with verify-webshite

Preconditions:

- Drive target: `.agents/skills/verify-webshite/scripts/verify-webshite photos --run RUN_ID`.
- `doctor` passed for this run.
- `src/content/photos/` has at least two posts, one of them an album with three or more images.

- **Grid.** On Home, click `Photos`. `/instagram/` shows `[data-photo-grid]` tiles, and the first six thumbnails have loaded (`01-grid.png`, `01-grid.aria.txt`).
- **Open an album.** Click the first tile whose name ends `, N images`. The viewer opens at `1/N` with the image loaded (`02-album-1.png`).
- **Step by link.** Click `>`. The count reads `2/N`, a different image file has loaded, and the address has changed.
- **Step by key.** ArrowRight shows `3/N`; ArrowLeft returns to `2/N`. `history.length` is unchanged (`03-album-2.png`).
- **Other post.** Click the next-post button (or previous-post, if the album is the last post). The title changes and the image loads (`04-other-post.png`).
- **Leave.** Escape returns to the grid at `/instagram/`.

## Gotchas

- Images load after the terminal font, so wait for `.photo-link img` to be complete and for `.photo-frame[data-loading]` to clear. Don't read the count alone.
- The arrow keys cross into neighbouring posts at an album's ends; `<` and `>` do not, and are hidden there.
- Photos keep their colour under the CRT effects, so screenshots show colour photos inside a green screen. That is intended.
