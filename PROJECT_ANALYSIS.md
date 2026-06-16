# Desktop Rework Analysis

The previous build still depended on a browser UI and browser join flow. This rework converts Relay Rift into a desktop application:

- Tkinter app window and canvas renderer.
- Host server embedded in the app.
- Lobby URL check inside the app.
- LAN lobby scan inside the app.
- Join by URL inside the app.
- Optional public internet link through host-side `cloudflared`.
- No npm packages.

The current alpha intentionally prioritizes architecture over feature depth. It proves the desired product shape: one downloadable app, host once, others join from inside the same app.

A truly global lobby browser still requires a central lobby directory service. Current support covers LAN scan and public URL check/join. Next pass should add a simple rendezvous server or hosted lobby directory if public lobby browsing without shared links is required.
