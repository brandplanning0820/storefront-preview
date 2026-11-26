import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve(process.argv[2] || 'dist');
const target = path.resolve(process.argv[3] || 'index.html');
const assetDirectory = path.join(source, 'assets');
const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const dataUrls = Object.fromEntries(fs.readdirSync(assetDirectory).map((name) => {
  const type = mimeTypes[path.extname(name)];
  if (!type) throw new Error('Unknown asset type: ' + name);
  const bytes = fs.readFileSync(path.join(assetDirectory, name));
  if (!bytes.length) throw new Error('Empty asset: ' + name);
  return [name, 'data:' + type + ';base64,' + bytes.toString('base64')];
}));

const inlineAssets = (text) => text.replace(/assets\/([-\w.]+\.(?:jpe?g|png|svg|webp|woff2|mp4))/gi, (_, name) => {
  if (!dataUrls[name]) throw new Error('Asset not found: ' + name);
  return dataUrls[name];
});

let html = inlineAssets(fs.readFileSync(path.join(source, 'index.html'), 'utf8').replace(/\r\n/g, '\n'));
const css = inlineAssets(fs.readFileSync(path.join(source, 'styles.css'), 'utf8'));
const catalog = fs.readFileSync(path.join(source, 'catalog.js'), 'utf8');
const script = fs.readFileSync(path.join(source, 'app.js'), 'utf8');
const runtimeImages = Object.fromEntries(Object.entries(dataUrls).filter(([name]) => (
  catalog.includes('"' + name + '"') || script.includes("'" + name + "'")
)));
const combinedScript = 'const PACKAGED_IMAGES = ' + JSON.stringify(runtimeImages) + ';\n' + catalog + '\n' + script;
html = html.replace(/  <link rel="stylesheet" href="styles\.css(?:\?[^"\n]*)?">/, () => '  <style>\n' + css + '\n  </style>');
html = html.replace(/^  <script src="(?:catalog|app)\.js(?:\?[^"\n]*)?" defer><\/script>\n/gm, '');
html = html.replace('</body>', () => '<script>\n' + combinedScript.replaceAll('</script', '<\\/script') + '\n</script>\n</body>');

fs.writeFileSync(target, html);
console.log('Standalone HTML written with ' + Object.keys(runtimeImages).length + ' runtime image assets.');

