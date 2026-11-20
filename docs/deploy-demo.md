# Deploying the web demo (Vercel, free Hobby plan)

The demo is the normal dashboard built with `NEXT_PUBLIC_DEMO=1`: read-only, a generated dataset held in memory, no watcher, no Electron. `vercel.json` already sets the build command (`npm run build:demo`) and the flag.

- **Card data** is downloaded from HearthstoneJSON during the build (`scripts/demo-prepare.ts` into `.demo-data/`, never committed).
- **Card art** is fetched from HearthstoneJSON's image host the first time a card is shown and cached in the server's temp folder (`/tmp`, the only writable place on Vercel). No Blizzard image is stored in the repo.
- **Writes** are refused by `src/proxy.ts` (403, read-only demo).

## Steps (the user, once)

1. vercel.com › sign in with GitHub › Add New Project › import `tavern-dashboard`.
2. Leave the settings as they are (`vercel.json` supplies them) › Deploy.
3. Put the resulting URL into the README's "Try the demo" link.

Local check of the same build: `npm run build:demo && NEXT_PUBLIC_DEMO=1 npm run start`.
