# Relay Rift Desktop 3.0.0 Alpha

Own-app desktop rework. Relay Rift now hosts, checks, scans, and joins lobbies from inside the application window instead of using a browser UI.

## Run

Windows:

```text
Double-click RelayRiftDesktop.cmd
```

macOS/Linux:

```bash
chmod +x RelayRiftDesktop.command
./RelayRiftDesktop.command
```

The desktop alpha uses Python 3 + Tkinter. On a normal Python install Tkinter is included. This build has no npm dependencies and no browser requirement.

## Host

1. Enter name and role.
2. Click **Host Local Lobby** for LAN play.
3. Click **Host Public Internet Lobby** for outside-network play.
4. Click **Start Run**.
5. Copy the invite URL shown in the status box.

## Join

1. Paste the lobby URL.
2. Click **Check URL**.
3. Click **Join URL**.

For LAN games, click **Scan LAN Lobbies** and join a detected lobby from inside the app.

## Public lobbies

Public hosting uses `cloudflared` on the host machine. Install `cloudflared` or place `cloudflared.exe` in a local `tools` folder. The app prints the generated `https://...trycloudflare.com` public link in the status box. Joiners paste that URL into the app.

## Scope

This is a structural desktop rework. The gameplay is intentionally simpler than the previous browser alpha so that the own-app host/check/join architecture is stable first.

Next packaging step: build a Windows `.exe` on Windows using PyInstaller, so users do not need Python installed.
