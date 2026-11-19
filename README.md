# Pilgrim Forge

A one-page title screen for the Pilgrim Forge studio. A brass astrolabe — three nested rings on a thin rod — turns slowly above a dark iron anvil, with a warm forge glow underneath and a small star on top. The wordmark reads **PILGRIM FORGE**, with a **Demo v0.1** label.

This is a plain static page. There is no build step and nothing to install.

## How to view it

Open it through a small local web server. Loading the file directly (`file://`) will not work: the page uses JavaScript modules, and browsers refuse those from a `file://` address.

From this folder, run:

```bash
python3 -m http.server
```

Then visit [http://localhost:8000](http://localhost:8000).

The same files work on any static host, such as GitHub Pages.

If your system is set to reduce motion, the rings stay still instead of spinning.

## The files

- `index.html` — the page itself. It holds the “PILGRIM FORGE” title and tells the browser where to download Three.js (the 3D library) from a public CDN.
- `css/style.css` — how the title and the “Demo v0.1” label look and where they sit on the screen.
- `js/astrolabe.js` — builds the 3D picture out of simple shapes (rings, boxes, a star) and turns the rings. It also redraws the scene when you resize the window.
