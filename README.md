# Arlington Electrical

A static site for Arlington Electrical, built with HTML, CSS, and vanilla JavaScript.

## Local preview

From the repository root, run:

```sh
python -m http.server 8000 --directory dist
```

Open [localhost:8000](http://localhost:8000). On Windows, use `py` in place of `python` if needed.

## Project layout

| Path | Contents |
| --- | --- |
| `dist/index.html` | Page content and markup |
| `dist/assets/lighting-scene.css` | All styles: design tokens, hero, sections, dialogs |
| `dist/assets/card-reveal.js` | Hero lights-on switch and video, Selected Work showcase (tabs, swipe), dialogs, call button |
| `dist/assets/images/hero/` | Hero poster |
| `dist/assets/images/selected-work/` | Project gallery photos |
| `dist/assets/images/process/` | Process section photos |
| `dist/assets/images/shared/` | Site logo and photos used across sections |
| `dist/assets/videos/hero/` | Hero video |
| `dist/assets/images/unused/` and `dist/assets/videos/unused/` | Existing media without references on the current page |

When adding media, place it under the matching image or video section and update the reference in `dist/index.html`. Keep media used in more than one section in a `shared/` folder.

## Deployment

Serve `dist/` as the web root. The site needs no build command or package installation. The hosting configuration is in `.openai/hosting.json`.
