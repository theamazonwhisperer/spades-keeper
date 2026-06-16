# SpadesKeeper

Beautiful, modern Spades scorekeeper — built as a Progressive Web App (PWA). Works on iOS, Android, and desktop. Installable from the browser with no app store required.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer
- A terminal

### Install & Run
```bash
cd spades-keeper
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. This folder is what you deploy.

---

## Deployment Options

### Option A — GitHub Pages (Recommended, Free)

1. Create a repo on GitHub (e.g. `spades-keeper`)
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/spades-keeper.git
   git push -u origin main
   ```
3. Install the deploy tool: `npm install --save-dev gh-pages` (already in package.json)
4. In `package.json`, update `"homepage"` to your GitHub Pages URL:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/spades-keeper"
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```
6. In your GitHub repo → Settings → Pages → Source: `gh-pages` branch

Your app will be live at `https://YOUR_USERNAME.github.io/spades-keeper`

### Option B — Vercel (Instant, also free)

1. [Install Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. From the project folder:
   ```bash
   npm run build
   vercel deploy dist/
   ```
3. Follow the prompts. You'll get a live URL immediately.

---

## Installing on Your Phone (PWA)

Once deployed (or even on localhost):

**Android (Chrome):**
- Open the URL in Chrome
- Tap the three-dot menu → "Add to Home Screen"
- It installs like a native app

**iOS (Safari):**
- Open the URL in Safari
- Tap Share → "Add to Home Screen"
- It installs like a native app

---

## Scoring Rules Implemented

| Scenario | Score |
|---|---|
| Team makes bid | `bid × 10` + bags |
| Team misses bid | `-(bid × 10)` |
| Team bids 10+ and makes it | `bid × 20` + bags (double!) |
| Team bids 10+ and misses | `-(bid × 20)` (double penalty!) |
| Nil (0 tricks taken) | +100 |
| Nil (any tricks taken) | -100 |
| Blind Nil (0 tricks taken) | +200 |
| Blind Nil (any tricks taken) | -200 |
| Every 10 cumulative bags | -100 penalty |

**Notes:**
- All team tricks count toward making the bid, even if a nil player took them
- A nil player's tricks only matter for their personal nil bonus/penalty
- Negative scores are fully supported

---

## Features

- ♠ Full team + individual nil/blind nil scoring
- ♠ Double bid logic (10+ tricks = double points/penalty)
- ♠ Bag tracking with -100 penalty every 10 bags
- ♠ Fix Bids — go back and correct bids before entering tricks
- ♠ Rename players and teams between rounds
- ♠ Win target: 300 or 500 points
- ♠ Game length: 10 rounds max or play until won
- ♠ Full game history with expandable scorecards
- ♠ Dark / light mode toggle
- ♠ Installable PWA — works offline
- ♠ All data stored locally (no account needed)
- ♠ Future-ready for cloud sync + live multiplayer scorecards

---

## Tech Stack

- React 18 + TypeScript
- Material UI v5 (Material Design 3-inspired)
- Zustand (state management + localStorage persistence)
- React Router v6 (HashRouter for GitHub Pages compatibility)
- Vite + vite-plugin-pwa
