import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = 'https://gonk.tools/wiki';
const NORMALISE = value => String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const parseJson = value => JSON.parse(value.replace(/^\uFEFF/, ''));
const LOCAL_ALIASES = new Map([
  ['LO', 'L0'],
  ['MONOWALKER', 'MONOWLKR'],
  ['OPTISTRIKE', 'OPTISTRK'],
]);
const VARIANTS = ['default', 'gold', 'diamond', 'rainbow', 'beskar', 'galactic'];
const variantLabel = variant => variant[0].toUpperCase() + variant.slice(1);

function arrayLiteral(source, marker) {
  const open = source.indexOf(marker) + marker.length - 1;
  if (open < marker.length - 1) throw new Error(`Could not find ${marker}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '`' || character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    else if (character === ']' && --depth === 0) return source.slice(open, index + 1);
  }
  throw new Error(`Could not find the end of ${marker}`);
}

const html = await (await fetch(SOURCE)).text();
const asset = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (!asset) throw new Error('Could not locate the Gonk Tools data bundle.');
const bundle = await (await fetch(new URL(asset, SOURCE))).text();
const sourceDroids = Function(`"use strict"; return (${arrayLiteral(bundle, 'Jr=[')});`)();
const galacticDroids = sourceDroids.filter(droid => droid.craftable && droid.variants?.galactic && droid.portraits?.galactic);

const droidsPath = path.join(ROOT, 'data', 'droids.json');
const manifestPath = path.join(ROOT, 'data', 'image-manifest.json');
const droids = parseJson(await readFile(droidsPath, 'utf8'));
const manifest = parseJson(await readFile(manifestPath, 'utf8'));
const sourceByName = new Map(galacticDroids.map(droid => [NORMALISE(droid.name), droid]));
const imageDirectories = {
  galactic: path.join(ROOT, 'assets', 'droids', 'galactic'),
  beskar: path.join(ROOT, 'assets', 'droids', 'beskar'),
  mythic: path.join(ROOT, 'assets', 'droids', 'mythic'),
  monoWalker: path.join(ROOT, 'assets', 'droids', 'mono-walker'),
};
await Promise.all(Object.values(imageDirectories).map(directory => mkdir(directory, { recursive: true })));

async function downloadPortrait(sourceDroid, variant, directory) {
  const portrait = sourceDroid.portraits?.[variant];
  if (!portrait) throw new Error(`${sourceDroid.name} is missing its ${variant} portrait.`);
  const imageUrl = new URL(portrait, SOURCE);
  const fileName = path.basename(imageUrl.pathname);
  const relativeDirectory = path.relative(ROOT, directory).replaceAll('\\', '/');
  const relativePath = `${relativeDirectory}/${fileName}`;
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Could not download ${imageUrl}: ${response.status}`);
  await writeFile(path.join(directory, fileName), Buffer.from(await response.arrayBuffer()));
  const quality = variant === 'default' ? '' : ` (${variantLabel(variant)})`;
  manifest[`${sourceDroid.name}${quality} - Droid - Droid Tycoon.png`] = relativePath;
}

let updated = 0;
let downloaded = 0;
for (const droid of droids.filter(droid => droid.rarity !== 'ICONIC')) {
  const localName = NORMALISE(droid.name);
  const sourceName = LOCAL_ALIASES.get(localName) || localName;
  const sourceDroid = sourceByName.get(sourceName);
  if (!sourceDroid) continue;

  for (const variantName of ['DEFAULT', 'GOLD', 'DIAMOND', 'RAINBOW', 'BESKAR']) {
    const sourceVariant = sourceDroid.variants[variantName.toLowerCase()];
    if (droid.variants[variantName] && sourceVariant?.craftingSeconds) {
      droid.variants[variantName].craftingSeconds = sourceVariant.craftingSeconds;
    }
  }

  const variant = sourceDroid.variants.galactic;
  droid.variants.GALACTIC = {
    cost: variant.blueprintCost,
    income: variant.productionPerSecond,
    craftingSeconds: variant.craftingSeconds,
  };

  await downloadPortrait(sourceDroid, 'galactic', imageDirectories.galactic);
  await downloadPortrait(sourceDroid, 'beskar', imageDirectories.beskar);
  downloaded += 2;

  if (droid.rarity === 'MYTHIC') {
    for (const quality of VARIANTS.filter(quality => !['beskar', 'galactic'].includes(quality))) {
      await downloadPortrait(sourceDroid, quality, imageDirectories.mythic);
      downloaded += 1;
    }
  }

  if (droid.name === 'MONO-WALKER') {
    for (const quality of VARIANTS.filter(quality => !['beskar', 'galactic'].includes(quality))) {
      await downloadPortrait(sourceDroid, quality, imageDirectories.monoWalker);
      downloaded += 1;
    }
  }
  updated += 1;
}

await writeFile(droidsPath, `${JSON.stringify(droids, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated ${updated} Galactic droids from ${SOURCE}.`);
console.log(`Source contains ${galacticDroids.length} craftable Galactic records.`);
console.log(`Downloaded ${downloaded} requested portraits (including refreshed Galactic portraits).`);
