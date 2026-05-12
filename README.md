# Repo Stats

<p align="center">
🇺🇸 English · <a href="readme/README-CN.md">🇨🇳 中文</a> · <a href="readme/README-JA.md">🇯🇵 日本語</a> · <a href="readme/README-KO.md">🇰🇷 한국어</a> · <a href="readme/README-FR.md">🇫🇷 Français</a> · <a href="readme/README-DE.md">🇩🇪 Deutsch</a> · <a href="readme/README-ES.md">🇪🇸 Español</a> · <a href="readme/README-PT.md">🇧🇷 Português</a> · <a href="readme/README-RU.md">🇷🇺 Русский</a> · <a href="readme/README-AR.md">🇸🇦 العربية</a> · <a href="readme/README-HI.md">🇮🇳 हिन्दी</a> · <a href="readme/README-TR.md">🇹🇷 Türkçe</a> · <a href="readme/README-VI.md">🇻🇳 Tiếng Việt</a> · <a href="readme/README-IT.md">🇮🇹 Italiano</a>
</p>

![GitHub Repo stars](https://img.shields.io/github/stars/Termix-SSH/Termix?style=flat&label=Stars)
![GitHub forks](https://img.shields.io/github/forks/Termix-SSH/Termix?style=flat&label=Forks)
![GitHub Release](https://img.shields.io/github/v/release/Termix-SSH/Termix?style=flat&label=Release&v=1)
<a href="https://discord.gg/jVQGdvHDrf"><img alt="Discord" src="https://img.shields.io/discord/1347374268253470720"></a>

<p align="center">
  <img src="./repo-images/RepoOfTheDay.png" alt="Repo of the Day Achievement" style="width: 300px; height: auto;">
  <br>
  <small style="color: #666;">Achieved on September 1st, 2025</small>
</p>

<br />
<p align="center">
  <a href="https://github.com/Termix-SSH/Termix">
    <img alt="Termix Banner" src=./repo-images/HeaderImage.png style="width: auto; height: auto;">  </a>
</p>

# Overview

<p align="center">
  <a href="https://github.com/Termix-SSH/Termix">
    <img alt="Termix Banner" src=./public/icon.svg style="width: 250px; height: 250px;">  </a>
</p>

Termix is an open-source, forever-free, self-hosted all-in-one server management platform. It provides a multi-platform
solution for managing your servers and infrastructure through a single, intuitive interface. Termix offers SSH terminal
access, remote desktop control (RDP, VNC, Telnet), SSH tunneling capabilities, remote SSH file management, and many other tools. Termix is the perfect
free and self-hosted alternative to Termius available for all platforms.

## Development Notes

- **eDEX Vite shell (Phase A):** Workspace `packages/edex-vite-shell` — standalone Vite+React app for porting upstream eDEX-UI without Electron. From repo root: `npm run edex:vite:dev` (port **5174**), `npm run sync-edex-assets` (set `EDEX_UI_SRC` to your `edex-ui/src` if needed), `npm run edex:vite:build`, `npm run edex:vite:verify` (typecheck + dist scan for forbidden Electron imports), `npm run edex:vite:lint` (ESLint on `packages/edex-vite-shell`), `npm run edex:vite:e2e` (Playwright smoke; first run `npm run e2e:install --workspace=@termix/edex-vite-shell`). **Inside Termix:** set `ui.edex.shellUi` to `edex-vite` (sidebar **eDEX Vite**) to lazy-load the same `App` after login; run `npm run sync-edex-assets` then `npm run sync-edex-vite-public` so `public/edex-assets` exists. Plan: `docs/superpowers/plans/2026-05-12-termix-edex-ui-vite-frontend-replacement-plan.md`. The standalone app includes a **boot sequence**, **main shell**, **left system column** (`EdexModColumnLeft`: clock, sysinfo, hardware, CPU, RAM, netstat, top processes — mock metrics + `contracts/hostMetrics.ts`), **xterm** (`EdexTerminalSurface`, mock PTY or optional `VITE_EDEX_TERMINAL_WS`), **on-screen keyboard** (`EdexOnScreenKeyboard`), **globe** (`EdexGlobeModule`), and **filesystem** (`EdexFilesystemPanel` with mock `/mock/...` paths), **overlays** (`EdexShellOverlays`: draggable `EdexModalPopup`, fuzzy finder tied to mock FS cwd via `EdexMockFsProvider` / `useEdexMockFs`, `EdexMediaPlayerStub`, optional WebAudio SFX via `VITE_EDEX_AUDIO=1` in `audio/edexAudioPlaceholder.ts`; session-scoped Termix version tip replaces upstream GitHub update check; shortcuts `Ctrl+Shift+B` about, `Ctrl+Shift+F` fuzzy, `Escape` close), **contracts** (`src/contracts/*` + `docs/termix-bridge-api.md` for planned REST/WS). Optional Vite env: `VITE_EDEX_SKIP_BOOT` (truthy skips boot), `VITE_EDEX_BOOT_FULL` (more log lines), `VITE_EDEX_DISPLAY_NAME` (greeting text), `VITE_EDEX_KB_LAYOUT` (on-screen keyboard JSON basename under `kb_layouts`, default `en-US`), `VITE_EDEX_SKIP_GLOBE` (skip ENCOM WebGL globe), `VITE_EDEX_GLOBE_MOCK_LAT` / `VITE_EDEX_GLOBE_MOCK_LON` (mock endpoint for globe header and pins), `VITE_EDEX_TERMINAL_WS` (optional WebSocket for JSON `input`/`data` terminal framing — no Termix `connectToHost` from this demo; default is an in-shell mock PTY), `VITE_EDEX_AUDIO` (set to `1` for short UI SFX stubs), `VITE_TERMX_APP_VERSION` / `VITE_EDEX_APP_VERSION` (shown in the Termix about modal).
- Added an optional full-screen **eDEX shell** (`EdexShell`) toggled via `ui.edex.shellUi` (`"classic"` | `"edex"`) alongside the existing classic desktop chrome. Build-time escape hatch: set **`VITE_TERMX_CLASSIC_UI=1`** in the Vite env to force classic chrome even when `shellUi` is `"edex"` (QA / rollout per full replacement plan Phase 4).
- The sidebar **eDEX UI** button switches `shellUi` to `"edex"`; the shell header includes a **Classic** control to return to `"classic"`.
- `EdexLayout` embeds real `Terminal`, `ServerStats`, and `FileManager` components using the active tab’s SSH host context (with a host-unavailable fallback UI).
- Removed the legacy `"edex"` **tab type**; persisted `termix_tabs` entries of type `"edex"` are migrated on restore into a normal `"terminal"` tab and `shellUi` is set to `"edex"` when possible.
- `EdexShell` wraps its tree in `SidebarProvider` so `TopNavbar` and tabbed surfaces keep working (`useSidebar()`), even though the classic floating host sidebar is not mounted in shell mode. **`EdexTabStage`** routes every `TabContextTab` inside the shell (`EdexLayout`, lazy `AppView` for RDP/VNC/telnet/network graph, dashboard, host manager, admin, profile).
- **Visual parity (shell):** `edexShellTheme.css` + `document.documentElement[data-termix-shell="edex"]` apply a full-viewport grid/neon backdrop; `TopNavbar` uses `chromeVariant="edex"` in shell mode for a matching tab strip. See `docs/superpowers/plans/2026-05-11-edex-shell-visual-parity.md`.
- **Theme bridge:** With `shellUi === "edex"`, `DesktopApp` calls `applyEdexShellThemeVars` so `edexShellTheme.css` reads `--edex-shell-neon-rgb`, `--edex-shell-grid-alpha`, `--edex-shell-ui-font`, and related tokens from `ui.edex` (`gridIntensity`, optional `shellNeonRgb` / `shellNeonRgbLight`, `shellUiFont`: `system` | `exo2` | `rajdhani` | `share-tech-mono`; non-`system` loads Google Fonts via `edexFontLoader.ts`). Vars and the font `<link>` are cleared when leaving eDEX shell or logging out.
- **Motion:** `prefers-reduced-motion: reduce` disables the shell intro animation and trims transitions under `html[data-termix-shell="edex"]` (`edexShellTheme.css`, `edexLayout.css`). `EdexShell` uses `usePrefersReducedMotion` so the intro gate class is not left animating when reduced motion is requested.
- **Module chrome (eDEX panels):** `Terminal`, `FileManager`, and `ServerStats` accept optional `chromeAppearance="edex"` from `EdexLayout` when `chromeMode === "edex"` so embedded modules drop duplicate outer canvas and tighten the stats header; see `edexLayout.css` (`termix-*--edex*`).
- **Phase C (shell):** `ui.edex.shellBootSplash` drives `EdexShellBootSplash` (skip / Escape / reduced-motion bypass; strings under `edex` in `locales/en.json` and `locales/translated/*`, merged via `npm run merge-edex-locales`). `shellBootSplashOncePerSession` (default **true**) stores dismissal in `sessionStorage` (`edexBootSession.ts`) so re-entering eDEX in the same tab skips the splash. `globeEnabled` + `globeShowHostMarkers` drive `EdexGlobeBackdrop`; markers reload on **window focus** and **visibility** (debounced). `showKeyboardOverlay` + `keyboardHudLayout` enable `EdexKeyboardHud` in `EdexLayout`.
- **Shell quick settings:** `EdexShellQuickSettings` (header gear) toggles `ui.edex` flags (`enabled`, HUD, globe, markers, boot splash, file/stats panels) without devtools; disabled during split-screen like other shell actions.
- **Upstream theme JSON:** `ui.edex.shellThemeImportJson` stores pasted theme JSON; `applyEdexShellThemeVars` applies `edexThemeJson` → `--edex-shell-theme-*` on the document root. Shell header **gear → Theme import** can paste from the clipboard or clear the import. `edexShellTheme.css` uses those vars for shell / tab-strip / globe / boot splash / keyboard HUD active key where supported. Screenshot QA: `docs/superpowers/specs/edex-screenshot-checklist.md`. Local upstream clone workflow: `docs/superpowers/specs/edex-upstream-reference.md`.
- **Phase D (fiction):** Header **SYSTEM** menu (`EdexShellSystemMenu`) routes to profile / admin / hosts / SSH manager with console-style labels. Boot splash optional **chime** (`shellBootSoundEnabled`, default off; volume sub-menu in gear) via `edexBootSound.ts`, and optional **quips** (`shellBootQuipEnabled`, `edex.bootQuips`); both respect reduced motion where applicable.

### eDEX Mode Status

- **Availability:** eDEX UI is available in the authenticated desktop app via the sidebar launcher and the `ui.edex.shellUi` setting.
- **Fidelity goal:** Match **GitSquared/eDEX-UI** as closely as the web stack allows while keeping Termix behavior under the hood; classic UI remains one toggle away (`shellUi: "classic"`).
- **Current capabilities:** Full-screen shell wraps `TopNavbar` and always mounts **`EdexTabStage`**, which picks `EdexLayout` vs `AppView` vs full-page modules per active tab.
- **Known limitations:** Split/layout polish (Phase 3 of the full replacement plan) and deep visual parity with upstream eDEX modules remain in progress; see `docs/superpowers/plans/2026-05-11-termix-full-edex-ui-replacement-plan.md`.
- **Next planned enhancements:** See `docs/superpowers/plans/2026-05-12-edex-ui-port-layer-plan.md` (module chrome, keyboard HUD, boot sequence, globe, upstream reference clone; theme bridge baseline is in place).

# Features

- **SSH Terminal Access** - Full-featured terminal with split-screen support (up to 4 panels) with a browser-like tab system. Includes support for customizing the terminal including common terminal themes, fonts, and other components.
- **Remote Desktop Access** - RDP, VNC, and Telnet support over the browser with complete customization and split screening
- **SSH Tunnel Management** - Create and manage server-to-server SSH tunnels with automatic reconnection, health monitoring, and local, remote, or dynamic SOCKS forwarding. Desktop client-to-server tunnel settings are stored locally per desktop install, optional C2S preset snapshots can be saved to the server, renamed, loaded, or deleted when you want to move a local tunnel configuration between clients.
- **Remote File Manager** - Manage files directly on remote servers with support for viewing and editing code, images, audio, and video. Upload, download, rename, delete, and move files seamlessly with sudo support.
- **Docker Management** - Start, stop, pause, remove containers. View container stats. Control container using docker exec terminal. It was not made to replace Portainer or Dockge but rather to simply manage your containers compared to creating them.
- **SSH Host Manager** - Save, organize, and manage your SSH connections with tags and folders, and easily save reusable login info while being able to automate the deployment of SSH keys
- **Server Stats** - View CPU, memory, and disk usage along with network, uptime, system information, firewall, port monitor, on most Linux based servers
- **Dashboard** - View server information at a glance on your dashboard
- **RBAC** - Create roles and share hosts across users/roles
- **User Authentication** - Secure user management with admin controls and OIDC (with access control) and 2FA (TOTP) support. View active user sessions across all platforms and revoke permissions. Link your OIDC/Local accounts together.
- **Database Encryption** - Backend stored as encrypted SQLite database files. View [docs](https://docs.termix.site/security) for more.
- **API Keys** - Create user-scoped API keys with expiration dates to be used for automation/CI
- **Data Export/Import** - Export and import SSH hosts, credentials, and file manager data
- **Automatic SSL Setup** - Built-in SSL certificate generation and management with HTTPS redirects
- **Modern UI** - Clean desktop/mobile-friendly interface built with React, Tailwind CSS, and Shadcn. Choose between many different UI themes including light, dark, Dracula, etc. Use URL routes to open any connection in full-screen.
- **Languages** - Built-in support ~30 languages (managed by [Crowdin](https://docs.termix.site/translations))
- **Platform Support** - Available as a web app, desktop application (Windows, Linux, and macOS, can be run standalone without Termix backend), PWA, and dedicated mobile/tablet app for iOS and Android.
- **SSH Tools** - Create reusable command snippets that execute with a single click. Run one command simultaneously across multiple open terminals.
- **Command History** - Auto-complete and view previously ran SSH commands
- **Quick Connect** - Connect to a server without having to save the connection data
- **Command Palette** - Double tap left shift to quickly access SSH connections with your keyboard
- **SSH Feature Rich** - Supports jump hosts, Warpgate, TOTP based connections, SOCKS5, host key verification, password autofill, [OPKSSH](https://github.com/openpubkey/opkssh), tmux, port knocking, etc.
- **Network Graph** - Customize your Dashboard to visualize your homelab based off your SSH connections with status support
- **Persistent Tabs** - SSH sessions and tabs stay open across devices/refreshes if enabled in user profile

# Planned Features

See [Projects](https://github.com/orgs/Termix-SSH/projects/2) for all planned features. If you are looking to contribute, see [Contributing](https://github.com/Termix-SSH/Termix/blob/main/CONTRIBUTING.md).

# Installation

Supported Devices:

- Website (any modern browser on any platform like Chrome, Safari, and Firefox) (includes PWA support)
- Windows (x64/ia32)
  - Portable
  - MSI Installer
  - Chocolatey Package Manager
- Linux (x64/ia32)
  - Portable
  - AUR
  - AppImage
  - Deb
  - Flatpak
- macOS (x64/ia32 on v12.0+)
  - Apple App Store
  - DMG
  - Homebrew
- iOS/iPadOS (v15.1+)
  - Apple App Store
  - IPA
- Android (v7.0+)
  - Google Play Store
  - APK

Visit the Termix [Docs](https://docs.termix.site/install) for more information on how to install Termix on all platforms. Otherwise, view
a sample Docker Compose file here (you can omit guacd and the network if you don't plan on using remote desktop features):

```yaml
services:
  termix:
    image: ghcr.io/lukegus/termix:latest
    container_name: termix
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - termix-data:/app/data
    environment:
      PORT: "8080"
    depends_on:
      - guacd
    networks:
      - termix-net

  guacd:
    image: guacamole/guacd:1.6.0
    container_name: guacd
    restart: unless-stopped
    ports:
      - "4822:4822"
    networks:
      - termix-net

volumes:
  termix-data:
    driver: local

networks:
  termix-net:
    driver: bridge
```

# Sponsors

<p align="left">
  <a href="https://www.digitalocean.com/">
    <img src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/SVG/DO_Logo_horizontal_blue.svg" height="50" alt="DigitalOcean">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://crowdin.com/">
    <img src="https://support.crowdin.com/assets/logos/core-logo/svg/crowdin-core-logo-cDark.svg" height="50" alt="Crowdin">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.blacksmith.sh/">
    <img src="https://cdn.prod.website-files.com/681bfb0c9a4601bc6e288ec4/683ca9e2c5186757092611b8_e8cb22127df4da0811c4120a523722d2_logo-backsmith-wordmark-light.svg" height="50" alt="Blacksmith">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.cloudflare.com/">
    <img src="https://sirv.sirv.com/website/screenshots/cloudflare/cloudflare-logo.png?w=300" height="50" alt="Crowdflare">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://tailscale.com/">
    <img src="https://drive.google.com/uc?export=view&id=1lIxkJuX6M23bW-2FElhT0rQieTrzaVSL" height="50" alt="TailScale">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://akamai.com/">
    <img src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Akamai_logo.svg" height="50" alt="Akamai">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://aws.amazon.com/">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/960px-Amazon_Web_Services_Logo.svg.png" height="50" alt="AWS">
  </a>
</p>

# Support

If you need help or want to request a feature with Termix, visit the [Issues](https://github.com/Termix-SSH/Support/issues) page, log in, and press `New Issue`.
Please be as detailed as possible in your issue, preferably written in English. You can also join the [Discord](https://discord.gg/jVQGdvHDrf) server and visit the support
channel, however, response times may be longer.

# Screenshots

[![YouTube](./repo-images/YouTube.jpg)](https://www.youtube.com/@TermixSSH/videos)

<p align="center">
  <img src="./repo-images/Image 1.png" width="400" alt="Termix Demo 1"/>
  <img src="./repo-images/Image 2.png" width="400" alt="Termix Demo 2"/>
</p>

<p align="center">
  <img src="./repo-images/Image 3.png" width="400" alt="Termix Demo 3"/>
  <img src="./repo-images/Image 4.png" width="400" alt="Termix Demo 4"/>
</p>

<p align="center">
  <img src="./repo-images/Image 5.png" width="400" alt="Termix Demo 5"/>
  <img src="./repo-images/Image 6.png" width="400" alt="Termix Demo 6"/>
</p>

<p align="center">
  <img src="./repo-images/Image 7.png" width="400" alt="Termix Demo 7"/>
  <img src="./repo-images/Image 8.png" width="400" alt="Termix Demo 8"/>
</p>

<p align="center">
  <img src="./repo-images/Image 9.png" width="400" alt="Termix Demo 9"/>
  <img src="./repo-images/Image 10.png" width="400" alt="Termix Demo 10"/>
</p>

<p align="center">
  <img src="./repo-images/Image 11.png" width="400" alt="Termix Demo 11"/>
  <img src="./repo-images/Image 12.png" width="400" alt="Termix Demo 12"/>
</p>

Some videos and images may be out of date or may not perfectly showcase features.

# License

Distributed under the Apache License Version 2.0. See LICENSE for more information.
