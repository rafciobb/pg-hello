// Kopiuje biblioteki przeglądarkowe i fonty z node_modules do vendor/ i fonts/.
// Uruchamiaj tylko przy aktualizacji tych bibliotek:  npm install && npm run assets
// (wynik jest w repozytorium – do wgrania na hosting Node.js nie jest potrzebny)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);

// 1. Biblioteki JS
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
fs.copyFileSync(nm('jszip/dist/jszip.min.js'), path.join(root, 'vendor/jszip.min.js'));
fs.copyFileSync(nm('mp4-muxer/build/mp4-muxer.js'), path.join(root, 'vendor/mp4-muxer.js'));

// 2. Fonty – tylko potrzebne grubości, podzbiory latin + latin-ext (polskie znaki), format woff2
const FONTS = { 'dm-sans': [400, 500, 700, 800], montserrat: [400, 500, 600, 800, 900], 'space-mono': [400, 700] };
const out = path.join(root, 'fonts');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'files'), { recursive: true });
let css = '/* Wygenerowane przez dev/build-assets.mjs z pakietów @fontsource (licencja SIL OFL 1.1) */\n';
for (const [family, weights] of Object.entries(FONTS)) {
  for (const w of weights) {
    const src = fs.readFileSync(nm('@fontsource', family, `${w}.css`), 'utf8');
    for (const block of src.match(/\/\*[^*]*\*\/\s*@font-face\s*{[^}]*}/g) ?? []) {
      if (!/-(latin|latin-ext)-\d+-normal \*\//.test(block)) continue;
      const file = block.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
      fs.copyFileSync(nm('@fontsource', family, 'files', file), path.join(out, 'files', file));
      css += block
        .replace(/src:[^;]+;/, `src: url(/fonts/files/${file}) format('woff2');`)
        + '\n';
    }
  }
}
fs.writeFileSync(path.join(out, 'fonts.css'), css);
console.log('Gotowe: vendor/, fonts/');
