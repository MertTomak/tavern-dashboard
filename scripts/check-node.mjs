// Plain ESM with no dependencies, so it runs even on an old Node version.
const REQUIRED_MAJOR = 22;
const major = Number(process.versions.node.split(".")[0]);

if (major < REQUIRED_MAJOR) {
  console.error(`
❌ Your Node version is too old: v${process.versions.node}
   This app needs Node ${REQUIRED_MAJOR} or newer.

What to do (pick one):
  1) Put Homebrew's Node first for this terminal session:
       export PATH="/opt/homebrew/bin:$PATH"
     Then run the command again.
  2) If you use nvm:
       nvm install ${REQUIRED_MAJOR} && nvm use ${REQUIRED_MAJOR}
  3) If you have no Node ${REQUIRED_MAJOR}+ at all:
       brew install node

For a permanent fix, add the PATH line above to your ~/.zshrc.
`);
  process.exit(1);
}
