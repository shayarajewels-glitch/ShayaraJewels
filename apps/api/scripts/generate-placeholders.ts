/**
 * Generates the original SVG placeholder illustrations for the sample
 * catalogue into apps/web/public/images/products. These are simple
 * vector drawings made for this project (no third-party imagery), to be
 * replaced by real product photography.
 *
 *   npx tsx scripts/generate-placeholders.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Finish } from '@shayara/shared';
import { SEED_PRODUCTS, type SeedProduct } from './catalogue-data';

const OUT = resolve(import.meta.dirname, '../../web/public/images/products');

const METAL: Record<Finish, { base: string; light: string; dark: string }> = {
  gold: { base: '#C9A45C', light: '#EBD5A0', dark: '#9C7A36' },
  silver: { base: '#B9BEC4', light: '#E8EBEE', dark: '#878D94' },
  'rose-gold': { base: '#C98F7E', light: '#EFC9BC', dark: '#9E6556' },
};

const BACKDROPS = [
  ['#FBF7F1', '#F1E7DA'],
  ['#F8F1EC', '#EBDDD3'],
];

function defs(f: Finish, variant: number) {
  const m = METAL[f];
  const [a, b] = BACKDROPS[variant % 2]!;
  return `<defs>
  <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.light}"/><stop offset=".45" stop-color="${m.base}"/><stop offset="1" stop-color="${m.dark}"/></linearGradient>
  <radialGradient id="gem" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#F3F1F8"/><stop offset="1" stop-color="#C9C6D6"/></radialGradient>
  <radialGradient id="pearl" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F4ECE2"/><stop offset="1" stop-color="#D9CBB8"/></radialGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#5A4632" flood-opacity=".16"/></filter>
</defs>`;
}

const chainArc = (cx: number, cy: number, rx: number, ry: number, links: number, size = 7, start = 0.08, end = 0.92) =>
  Array.from({ length: links }, (_, i) => {
    const t = Math.PI * (start + ((end - start) * i) / (links - 1));
    const x = cx - rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${size}" ry="${(size * 0.62).toFixed(1)}" fill="none" stroke="url(#metal)" stroke-width="2.6" transform="rotate(${((t * 180) / Math.PI - 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');

function motif(p: SeedProduct, variant: number): string {
  const zoom = variant === 1 ? 'transform="translate(400 400) scale(1.35) translate(-400 -400)"' : '';
  let body = '';
  switch (p.motif) {
    case 'band':
      body = `<ellipse cx="400" cy="420" rx="150" ry="150" fill="none" stroke="url(#metal)" stroke-width="30"/><ellipse cx="400" cy="420" rx="150" ry="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-dasharray="120 820"/>`;
      break;
    case 'solitaire':
      body = `<ellipse cx="400" cy="450" rx="140" ry="140" fill="none" stroke="url(#metal)" stroke-width="18"/><path d="M370 318 L400 270 L430 318 Z" fill="url(#metal)"/><polygon points="400,215 445,262 400,320 355,262" fill="url(#gem)" stroke="#B7B3C8" stroke-width="2"/><polygon points="400,215 420,262 400,320 380,262" fill="#fff" fill-opacity=".45"/>`;
      break;
    case 'stack':
      body = [360, 420, 480]
        .map((y, i) => `<ellipse cx="400" cy="${y}" rx="150" ry="58" fill="none" stroke="url(#metal)" stroke-width="${[10, 14, 10][i]}" ${i === 1 ? 'stroke-dasharray="6 5"' : ''}/>`)
        .join('');
      break;
    case 'chain':
      body = chainArc(400, 230, 220, 300, 30, 10);
      break;
    case 'layered':
      body = chainArc(400, 200, 220, 230, 26, 8) + chainArc(400, 200, 250, 330, 30, 9);
      break;
    case 'choker':
      body = Array.from({ length: 17 }, (_, i) => {
        const t = Math.PI * (0.12 + (0.76 * i) / 16);
        return `<circle cx="${(400 - 230 * Math.cos(t)).toFixed(1)}" cy="${(230 + 220 * Math.sin(t)).toFixed(1)}" r="17" fill="url(#pearl)" stroke="#D8C9B4" stroke-width="1.5"/>`;
      }).join('') + chainArc(400, 230, 230, 220, 20, 5);
      break;
    case 'tennis':
      body = Array.from({ length: 22 }, (_, i) => {
        const t = Math.PI * (0.1 + (0.8 * i) / 21);
        const x = 400 - 230 * Math.cos(t);
        const y = 220 + 260 * Math.sin(t);
        return `<rect x="${(x - 13).toFixed(1)}" y="${(y - 13).toFixed(1)}" width="26" height="26" rx="5" fill="url(#metal)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="url(#gem)"/>`;
      }).join('');
      break;
    case 'moon':
      body = chainArc(400, 120, 200, 330, 26, 6) + `<path d="M400 470 a70 70 0 1 0 60 105 a55 55 0 1 1 -60 -105 z" fill="url(#metal)"/><circle cx="400" cy="458" r="10" fill="none" stroke="url(#metal)" stroke-width="5"/>`;
      break;
    case 'heart':
      body = chainArc(400, 120, 200, 330, 26, 6) + `<path d="M400 600 C320 540 300 500 320 470 C340 440 380 445 400 480 C420 445 460 440 480 470 C500 500 480 540 400 600 Z" fill="url(#metal)"/><path d="M400 585 C335 535 320 505 336 482" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="5"/><circle cx="400" cy="455" r="10" fill="none" stroke="url(#metal)" stroke-width="5"/>`;
      break;
    case 'coin':
      body = chainArc(400, 120, 200, 330, 26, 6) + `<circle cx="400" cy="530" r="72" fill="url(#metal)"/><circle cx="400" cy="530" r="56" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><path d="M370 530 h60 M400 500 v60" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><circle cx="400" cy="450" r="10" fill="none" stroke="url(#metal)" stroke-width="5"/>`;
      break;
    case 'drop':
      body = chainArc(400, 120, 200, 330, 26, 6) + `<path d="M400 465 C440 520 450 545 450 565 a50 50 0 0 1 -100 0 C350 545 360 520 400 465 Z" fill="url(#metal)"/><path d="M400 480 C430 525 438 548 438 565 a38 38 0 0 1 -76 0 C362 548 370 525 400 480 Z" fill="url(#gem)"/>`;
      break;
    case 'beads':
      body = Array.from({ length: 26 }, (_, i) => {
        const t = (2 * Math.PI * i) / 26;
        return `<circle cx="${(400 + 190 * Math.cos(t)).toFixed(1)}" cy="${(410 + 120 * Math.sin(t)).toFixed(1)}" r="${i % 3 === 0 ? 17 : 13}" fill="${p.sku.startsWith('ANK') ? 'url(#pearl)' : 'url(#metal)'}"/>`;
      }).join('');
      break;
    case 'charms':
      body =
        Array.from({ length: 34 }, (_, i) => {
          const t = (2 * Math.PI * i) / 34;
          const x = 400 + 200 * Math.cos(t);
          const y = 390 + 120 * Math.sin(t);
          return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="5.5" fill="none" stroke="url(#metal)" stroke-width="2.6" transform="rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        }).join('') +
        [0.25, 0.5, 0.75]
          .map((f) => {
            const t = Math.PI * f;
            const x = 400 + 200 * Math.cos(t);
            const y = 390 + 120 * Math.sin(t);
            return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 34).toFixed(1)}" stroke="url(#metal)" stroke-width="3"/><circle cx="${x.toFixed(1)}" cy="${(y + 50).toFixed(1)}" r="16" fill="url(#metal)"/>`;
          })
          .join('');
      break;
    case 'cuff':
      body = `<path d="M250 470 A160 120 0 1 1 550 470" fill="none" stroke="url(#metal)" stroke-width="34" stroke-linecap="round"/><path d="M262 440 A150 110 0 0 1 400 310" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>`;
      break;
  }
  return `<g filter="url(#shadow)" ${zoom}>${body}</g>`;
}

function svg(p: SeedProduct, variant: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${p.name} illustration">
${defs(p.finish, variant)}
<rect width="800" height="800" fill="url(#bg)"/>
<ellipse cx="400" cy="700" rx="230" ry="20" fill="#5A4632" fill-opacity=".05"/>
${motif(p, variant)}
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const p of SEED_PRODUCTS) {
  for (const n of [1, 2] as const) writeFileSync(resolve(OUT, `${p.sku.toLowerCase()}-${n}.svg`), svg(p, n - 1));
}
console.log(`Wrote ${SEED_PRODUCTS.length * 2} placeholder images to ${OUT}`);
