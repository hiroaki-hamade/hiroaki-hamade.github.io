# Hiroaki Hamade — research website

Static personal website for https://hiroaki-hamade.github.io/.
No build step is required. All assets are served from this repository.

## Preview

Run `python3 -m http.server 8000` in this directory and open http://localhost:8000.

The main page chooses its artwork once when opened, using the visitor's device-local time:

- 06:00–17:59: neural-model artwork.
- 18:00–05:59: black hole.

It stays fixed until a new page load, even if the time crosses 06:00 or 18:00. This uses the device's clock and time-zone settings, not geographical sunrise/sunset. There are no location permissions, external time services, timers, cookies, or local-storage entries for selection.

Only the selected poster, animation module, dependencies, and canvases load. The other artwork's inert HTML template is never mounted; it is neither initialized nor drawn. The fixed-size illustration slot keeps the existing layout. Without JavaScript, a static black-hole image appears. If the chosen animation cannot load or initialize, its matching static poster remains visible.

Local-only preview links, also supported on `127.0.0.1` and `[::1]`:

- Automatic: http://localhost:8000/
- Day: http://localhost:8000/?artwork=day
- Night: http://localhost:8000/?artwork=night

The query override is ignored on the public site. The earlier `model.html` remains as a standalone, `noindex` comparison page, without a link from the main page. `noindex` is not access control.

## Edit

- Profile, research, and review status: `index.html`
- Layout and colors: `styles.css`
- Day/night selection and conditional loading: `assets/artwork.js`
- Black-hole rendering and colors: `assets/black-hole-shader.js`
- Hover, drag, touch, and keyboard interactions: `assets/black-hole.js`
- Static artwork fallback: `assets/black-hole-poster.png`

## Black-hole artwork

The compact black hole beside the profile is original, cinema-inspired procedural artwork. A bending field gives the luminous disk its warped appearance; this is an artistic illustration, not a calibrated scientific simulation or research result. No film images are used.

- Native WebGL2 renders the disk; a small 2D canvas draws the interactive stars. No third-party libraries, CDN, analytics, or remote assets are needed.
- Hover to stir the light; drag to change the viewing angle. Click or tap to send a star into orbit and watch it spiral inward.
- Tab focuses the artwork. Arrow keys rotate the view, Enter or Space launches a star, and Escape or Home resets it. The control has a screen-reader description and a visible keyboard focus indicator.
- A short introductory animation settles after entry. Rendering runs on interaction, stops when settled, and pauses offscreen or in hidden tabs. There are no playback controls. Rendering is capped at 30 frames per second and 2× pixel density, with at most seven star trails.
- `prefers-reduced-motion` removes continuous motion, inertia, and star flights while retaining direct view adjustment and a static response to clicks.
- The artwork shrinks alongside the name on small screens. The static PNG, rendered from the same artwork, appears without JavaScript or WebGL2 and on graphics-context loss. Inactive controls remain hidden.
- Serve through the preview HTTP server to enable interaction; opening the HTML directly from disk may show only the fallback.

When changing the artwork, refresh the PNG fallback with a screenshot of `.cosmic-art` at the default viewing angle, with reduced motion enabled and without hover or keyboard focus. The current fallback is captured at 2× pixel density against the page background.

The research submission is currently under review. Update the status only after a decision, and add paper or code links when public URLs are available. The source screenshot is a private reference and is excluded from Git.

## Neural-model artwork

The daytime artwork, also available in `model.html`, uses the same compact slot beside the name. Five translucent planes, 45 neurons, and sparse connections form an abstract neural network, not a scientific diagram of a particular model or an experimental result.

- Geometry and drawing: `assets/neural-core-art.js`
- Interaction and animation: `assets/neural-core.js`
- Static fallback: `assets/neural-core-poster.png`
- Hover selects a neuron and highlights a connected path. Clicking or tapping sends a signal through a new connected route; repeated clicks can overlap up to six signals.
- Drag rotates the network with gentle, damped inertia. Arrow keys rotate it; Enter or Space sends a signal; Escape or Home resets the view.
- Native 2D canvas projects and depth-sorts the 3D geometry. No external libraries, fonts, images, or network calls are required.
- A short introductory signal stops after passing through the network. The animation loop stops at rest, offscreen, and in hidden tabs. Reduced-motion mode provides static path changes and direct view adjustment without signal flights or inertia.
- Rendering uses up to 2× pixel density; the animation loop is capped at 30 frames per second. A matching PNG remains visible without JavaScript or canvas support, with inactive controls hidden.

Refresh this fallback by capturing `.neural-art` at the default view, with reduced motion enabled, no hover or keyboard focus, and 2× pixel density. Keep the text in `model.html` in sync with `index.html` while comparing the two alternatives.

## Publish to GitHub Pages

1. Create the public repository `hiroaki-hamade/hiroaki-hamade.github.io`.
2. Push these website files to its `main` branch.
3. In Settings → Pages, choose **Deploy from a branch**, **main**, and **/ (root)**.
4. Wait for the Pages deployment to finish and visit https://hiroaki-hamade.github.io/.

Do not upload the reference screenshot. No custom domain or CNAME file is needed.
