// Plain ESM with no dependencies, so it runs even on an old Node version.
const REQUIRED_MAJOR = 22;
const major = Number(process.versions.node.split(".")[0]);

if (major < REQUIRED_MAJOR) {
  console.error(`
❌ Node sürümün çok eski: v${process.versions.node}
   Bu uygulama Node ${REQUIRED_MAJOR} veya daha yenisini ister.

Ne yapmalısın (birini seç):
  1) Bu terminal oturumu için Homebrew'daki Node'u öne al:
       export PATH="/opt/homebrew/bin:$PATH"
     Sonra tekrar dene.
  2) nvm kullanıyorsan:
       nvm install ${REQUIRED_MAJOR} && nvm use ${REQUIRED_MAJOR}
  3) Hiç Node ${REQUIRED_MAJOR}+ yoksa:
       brew install node

Kalıcı çözüm için yukarıdaki PATH satırını ~/.zshrc dosyana ekle.
`);
  process.exit(1);
}
