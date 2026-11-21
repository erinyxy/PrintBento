# PrintBento

- Static HTML/CSS/JS project. No package install or build step.
- Local preview: `python3 -m http.server 4173`; use `http://127.0.0.1:4173/`.
- Deployment target: GitHub `erinyxy/PrintBento`, then Vercel (`Other`, root `.`, no build command, output `.`).
- Photos and coordinates are processed in the browser. Do not add uploads or third-party location services without explicit request.
- Keep paper and item geometry in millimeters; PDF output must preserve exact page dimensions.
