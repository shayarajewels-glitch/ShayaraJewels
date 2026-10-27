import type { Finish, ProductType } from '@shayara/shared';

/**
 * Sample catalogue for development and demos. Prices and stock are
 * placeholders to replace with real catalogue data before launch. No
 * ratings, reviews, discounts or certifications are invented: those start
 * empty and come only from real activity.
 */
export interface SeedProduct {
  name: string;
  sku: string;
  type: ProductType;
  finish: Finish;
  baseMaterial: string;
  pricePaise: number;
  stock: number;
  featured?: boolean;
  sizeOptions?: string[];
  description: string;
  keywords: string[];
  /** Drives the placeholder illustration. */
  motif: 'band' | 'solitaire' | 'stack' | 'chain' | 'layered' | 'choker' | 'coin' | 'moon' | 'heart' | 'drop' | 'beads' | 'charms' | 'cuff' | 'tennis';
}

const care =
  'Store in the pouch provided, away from moisture. Put it on after perfume, lotion and hairspray. Remove before swimming, bathing or exercise. Wipe gently with a soft dry cloth after wear.';

export const CARE_INSTRUCTIONS = care;

export const SEED_PRODUCTS: SeedProduct[] = [
  // Rings
  { name: 'Mira Stacking Band', sku: 'RNG-MIRA-G', type: 'ring', finish: 'gold', baseMaterial: 'Brass', pricePaise: 49_900, stock: 40, featured: true, sizeOptions: ['6', '7', '8', 'Adjustable'], motif: 'band', keywords: ['minimal', 'everyday', 'stackable'], description: 'A slim, polished band with a gold-tone finish, made for stacking. Wear one on its own or build a set with the Mira bands in silver and rose gold tones.' },
  { name: 'Mira Stacking Band', sku: 'RNG-MIRA-S', type: 'ring', finish: 'silver', baseMaterial: 'Brass', pricePaise: 49_900, stock: 35, sizeOptions: ['6', '7', '8', 'Adjustable'], motif: 'band', keywords: ['minimal', 'everyday', 'stackable'], description: 'The Mira band in a cool silver-tone finish. Slim and polished for everyday stacking.' },
  { name: 'Noor Solitaire Ring', sku: 'RNG-NOOR-RG', type: 'ring', finish: 'rose-gold', baseMaterial: 'Brass with cubic zirconia', pricePaise: 89_900, stock: 18, featured: true, sizeOptions: ['6', '7', '8'], motif: 'solitaire', keywords: ['solitaire', 'cz', 'engagement style', 'gift'], description: 'A single round cubic zirconia set high on a fine rose-gold-tone band. Solitaire sparkle, without the solitaire price.' },
  { name: 'Tara Trio Ring Set', sku: 'RNG-TARA-G', type: 'ring', finish: 'gold', baseMaterial: 'Brass', pricePaise: 79_900, stock: 22, sizeOptions: ['6', '7', '8'], motif: 'stack', keywords: ['set', 'stack', 'textured'], description: 'Three thin rings — one hammered, one twisted, one plain — in a gold-tone finish. Wear together or apart.' },

  // Necklaces
  { name: 'Aria Layered Necklace', sku: 'NCK-ARIA-G', type: 'necklace', finish: 'gold', baseMaterial: 'Brass', pricePaise: 149_900, stock: 25, featured: true, motif: 'layered', keywords: ['layered', 'double chain', 'party'], description: 'Two fine chains joined at one clasp so they always sit just right: a short satellite chain and a longer paperclip chain, both gold-tone.' },
  { name: 'Ira Paperclip Chain', sku: 'NCK-IRA-S', type: 'necklace', finish: 'silver', baseMaterial: 'Stainless steel', pricePaise: 99_900, stock: 30, motif: 'chain', keywords: ['paperclip', 'chain', 'minimal', 'office'], description: 'A light paperclip-link chain in silver-tone stainless steel. 45 cm with a 5 cm extender.' },
  { name: 'Zoya Pearl Choker', sku: 'NCK-ZOYA-G', type: 'necklace', finish: 'gold', baseMaterial: 'Brass with glass pearls', pricePaise: 129_900, stock: 14, motif: 'choker', keywords: ['pearl', 'choker', 'festive', 'wedding guest'], description: 'Glass pearls spaced along a gold-tone chain, sitting close at the collarbone. Adjustable from 36 to 41 cm.' },
  { name: 'Riya Tennis Necklace', sku: 'NCK-RIYA-S', type: 'necklace', finish: 'silver', baseMaterial: 'Brass with cubic zirconia', pricePaise: 219_900, stock: 8, featured: true, motif: 'tennis', keywords: ['tennis', 'cz', 'statement', 'evening'], description: 'A continuous line of cubic zirconia in a silver-tone setting. Our most-dressed-up piece, for evenings and celebrations.' },

  // Pendants
  { name: 'Chandni Crescent Pendant', sku: 'PND-CHAN-G', type: 'pendant', finish: 'gold', baseMaterial: 'Brass', pricePaise: 69_900, stock: 28, featured: true, motif: 'moon', keywords: ['moon', 'crescent', 'celestial'], description: 'A small crescent moon on a fine gold-tone chain. Celestial, delicate, made for layering.' },
  { name: 'Dil Heart Locket', sku: 'PND-DIL-RG', type: 'pendant', finish: 'rose-gold', baseMaterial: 'Brass', pricePaise: 89_900, stock: 20, motif: 'heart', keywords: ['heart', 'locket', 'gift', 'photo'], description: 'A rose-gold-tone heart locket that opens to hold two tiny photos. A gift that stays close.' },
  { name: 'Sikka Coin Pendant', sku: 'PND-SIKK-G', type: 'pendant', finish: 'gold', baseMaterial: 'Brass', pricePaise: 74_900, stock: 16, motif: 'coin', keywords: ['coin', 'vintage', 'medallion'], description: 'A vintage-inspired coin medallion with a softly worn texture, on a 45 cm gold-tone chain.' },
  { name: 'Bindu Teardrop Pendant', sku: 'PND-BIND-S', type: 'pendant', finish: 'silver', baseMaterial: 'Brass with cubic zirconia', pricePaise: 64_900, stock: 4, motif: 'drop', keywords: ['teardrop', 'cz', 'drop'], description: 'A pear-cut cubic zirconia in a fine silver-tone frame. Small enough for every day.' },

  // Bracelets
  { name: 'Kavya Charm Bracelet', sku: 'BRC-KAVY-G', type: 'bracelet', finish: 'gold', baseMaterial: 'Brass', pricePaise: 89_900, stock: 20, featured: true, motif: 'charms', keywords: ['charm', 'stack', 'gift'], description: 'A fine gold-tone chain with a star, a moon and a heart charm. Adjustable up to 19 cm.' },
  { name: 'Ruhi Bangle Cuff', sku: 'BRC-RUHI-RG', type: 'bracelet', finish: 'rose-gold', baseMaterial: 'Stainless steel', pricePaise: 99_900, stock: 15, motif: 'cuff', keywords: ['cuff', 'bangle', 'open'], description: 'An open cuff with a brushed rose-gold-tone finish. Slips on and gently adjusts to your wrist.' },
  { name: 'Lumi Tennis Bracelet', sku: 'BRC-LUMI-S', type: 'bracelet', finish: 'silver', baseMaterial: 'Brass with cubic zirconia', pricePaise: 159_900, stock: 0, motif: 'tennis', keywords: ['tennis', 'cz', 'sparkle'], description: 'A line of cubic zirconia in a silver-tone setting with a secure box clasp.' },
  { name: 'Saanjh Beaded Bracelet', sku: 'BRC-SAAN-G', type: 'bracelet', finish: 'gold', baseMaterial: 'Brass beads on stretch cord', pricePaise: 54_900, stock: 32, motif: 'beads', keywords: ['beaded', 'stretch', 'boho'], description: 'Small gold-tone beads on durable stretch cord. Stack three for the full look.' },

  // Anklets
  { name: 'Payal Bell Anklet', sku: 'ANK-PAYL-S', type: 'anklet', finish: 'silver', baseMaterial: 'Brass', pricePaise: 59_900, stock: 26, featured: true, motif: 'charms', keywords: ['payal', 'bells', 'ghungroo', 'traditional'], description: 'A modern take on the payal: a fine silver-tone chain with tiny bells that chime softly. Sold as a single anklet.' },
  { name: 'Ziva Double Chain Anklet', sku: 'ANK-ZIVA-G', type: 'anklet', finish: 'gold', baseMaterial: 'Stainless steel', pricePaise: 49_900, stock: 30, motif: 'layered', keywords: ['double', 'layered', 'beach'], description: 'Two fine gold-tone chains on one clasp, one plain and one with tiny discs. Adjustable from 22 to 27 cm.' },
  { name: 'Moti Pearl Anklet', sku: 'ANK-MOTI-RG', type: 'anklet', finish: 'rose-gold', baseMaterial: 'Brass with glass pearls', pricePaise: 54_900, stock: 3, motif: 'beads', keywords: ['pearl', 'dainty', 'summer'], description: 'Small glass pearls spaced along a rose-gold-tone chain. Dainty and summery.' },
];
