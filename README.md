# Tavern Dashboard

A personal Hearthstone stats app for the Mac. It records your games from Hearthstone's own log files, turns them into statistics, and shows an in-game deck tracker next to the board. Everything stays on your Mac: no accounts, no cloud, no ads.

Unofficial fan tool for personal, non-commercial use. Hearthstone® is a registered trademark of Blizzard Entertainment, Inc.; this app is not affiliated with Blizzard. Card images and data come from HearthstoneJSON.

## What it does

- **Records games by itself.** It reads `/Applications/Hearthstone/Logs/` (read-only) and saves each finished game. It never reads game memory, never touches the game and never logs in anywhere.
- **Dashboard.** Overview, games, decks and matchups, in a "tavern" look. Quick add for games played elsewhere, and Power.log import for older sessions.
- **Menu bar.** Today's win–loss next to a tankard icon, plus a notification when a game is saved.
- **Deck tracker.** A slim panel on the right of the screen while you play. It shows your deck counting down as you draw, the chance of your next draw, the opponent's hand as card backs (with the turn each card arrived, The Coin, and created cards), what they have played, and both deck sizes. It only shows what you could see in the game yourself.
- **Knows your deck.** When you press Play, Hearthstone writes the deck to `Decks.log`; the app saves it as a deck if it is new and links the game to it.

## Install and run

Requirements: macOS on Apple Silicon, Node 22+ (Homebrew), Hearthstone installed in `/Applications`.

```bash
export PATH=/opt/homebrew/bin:$PATH
npm install
npm run cards:sync        # card data from HearthstoneJSON
npm run app:build         # builds the app and puts it in /Applications
```

Open **Tavern Dashboard** from Applications before you start Hearthstone. The app is not signed by Apple. If macOS says it cannot be opened, go to System Settings › Privacy & Security and click **Open Anyway** (or right-click the app › Open › Open). You only need to do this once.

The first time, open **Settings › Game logs** and approve the change to Hearthstone's `log.config` (it adds the `[Power]` and `[Decks]` logs). Restart Hearthstone afterwards.

### Deck tracker

- It appears when a game starts and fades out a few seconds after the game ends.
- Drag it by its header, resize it with the grip at the bottom-left, hide or show it with **⌥⌘T** (also in the menu-bar menu). It remembers where you put it.
- Hover a card to see the full card. Clicks anywhere else go through to the game.
- If it does not show over Hearthstone in fullscreen, switch Hearthstone to **Windowed** mode (Options › Graphics) and maximise the window.

## Your data

Everything is stored in `~/Library/Application Support/TavernDashboard`: the database (`hearthstone.db`), backups, card data and card art. The app takes a backup before every database update. Card data and art are the only things downloaded from the internet.

## Development

```bash
npm run dev:all       # dashboard at http://localhost:3000 + log watcher
npm run app:dev       # the same inside the Electron app (menu bar, overlay)
npm run typecheck && npm run lint && npm run test
```

Only one log watcher runs at a time; a second one waits for the first to stop. To try the tracker without the game, replay a recorded log into a test folder and use a separate data folder:

```bash
npx tsx scripts/replay-log.ts tests/fixtures/power-logs/Hearthstone_2026_11_13_22_32_43/Power.log /tmp/hs-replay --speed 4
TAVERN_DATA_DIR=/tmp/hs-data npm run db:migrate    # an empty test database (copy cards/ into it too)
HS_LOG_DIR=/tmp/hs-replay TAVERN_DATA_DIR=/tmp/hs-data TAVERN_LOCK_FILE=/tmp/hs-data/watcher.lock npm run app:dev
```

The plan and status are in `docs/ROADMAP.md`.
