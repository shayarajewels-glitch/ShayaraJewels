/**
 * Search-focused copy for category pages: the <title>, meta description, a
 * short intro shown under the listing, and common questions. Keep claims
 * honest — finishes are tones over base metals, never solid gold or silver.
 */
export interface CategorySeo {
  title: string;
  description: string;
  intro: string[];
  faqs: { q: string; a: string }[];
}

const SHIPPING_FAQ = {
  q: 'How much is delivery, and can I pay cash on delivery?',
  a: 'Delivery is free on orders above ₹999 and ₹79 below that, anywhere in India. Orders are dispatched in 1–2 business days and usually arrive in 3–7. You can pay by UPI, card or netbanking, or choose cash on delivery.',
};

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  rings: {
    title: 'Artificial Rings for Women Online – Gold, Silver & Rose Gold Tone',
    description:
      'Shop artificial and fashion rings for women: stackable bands, CZ solitaire and halo rings, cocktail and evil eye rings in gold, silver and rose gold tones. Free shipping over ₹999.',
    intro: [
      'From slim stacking bands to statement cocktail rings, Shayara rings are designed for everyday wear and celebrations alike. Choose cubic zirconia solitaire and halo styles for sparkle, signet and dome rings for a bolder look, or adjustable open rings that fit most fingers.',
      'Every ring is a fashion piece in a gold, silver or rose gold tone finish over brass or stainless steel, and each product page lists the base metal so you know exactly what you are buying.',
    ],
    faqs: [
      { q: 'How do I find my ring size?', a: 'Most of our rings come in sizes 6, 7 and 8, and several are adjustable. If you are between sizes, choose the larger size or an adjustable style.' },
      { q: 'Will a gold-tone ring tarnish?', a: 'Plated finishes last longest when kept dry. Take rings off before washing hands, swimming or applying lotion, and store them in the pouch provided. Stainless steel styles are the most tarnish-resistant.' },
      SHIPPING_FAQ,
    ],
  },
  necklaces: {
    title: 'Artificial Necklaces Online – Chains, Chokers & Kundan-Style Sets',
    description:
      'Shop artificial necklaces for women: layering chains, pearl chokers, tennis necklaces and kundan-style and temple coin necklaces for weddings. Gold, silver and rose gold tones.',
    intro: [
      'Build your everyday layers with paperclip, snake and herringbone chains, or dress up with pearl strands, cubic zirconia tennis necklaces and lariats. For weddings and festive occasions, our kundan-style chokers and temple-style coin necklaces bring traditional design at an accessible price.',
      'All necklaces are fashion jewellery in gold, silver or rose gold tone finishes, with lengths and extenders listed on each product page.',
    ],
    faqs: [
      { q: 'Which necklace length should I choose?', a: 'Chokers sit at 35–40 cm, close to the collarbone. Most of our chains are 45 cm with an extender, which suits crew and V-necklines and layers well with a choker.' },
      { q: 'Are the kundan-style necklaces real kundan?', a: 'No. They are kundan-inspired fashion jewellery made with glass stones on a gold-tone brass base — the look of traditional jewellery without the precious-metal price.' },
      SHIPPING_FAQ,
    ],
  },
  pendants: {
    title: 'Pendants for Women Online – Evil Eye, Heart, Moon & Om Pendants',
    description:
      'Shop pendant necklaces for women: evil eye, heart lockets, crescent moon, Om, butterfly and pearl pendants on fine chains, in gold, silver and rose gold tones.',
    intro: [
      'A pendant is the easiest way to wear something meaningful every day. Choose a nazar evil eye or Om pendant, a heart locket or butterfly for a gift, or celestial moon, star and sun designs that layer beautifully.',
      'Every pendant comes on a fine chain, finished in a gold, silver or rose gold tone over brass, with the details listed on each product page.',
    ],
    faqs: [
      { q: 'Does the pendant come with a chain?', a: 'Yes. Every pendant is sold on a matching fine chain, usually 45 cm long.' },
      { q: 'Are pendants a good gift?', a: 'Pendants are among our most popular gifts — heart lockets, evil eye and initial-style pieces suit birthdays, Rakhi and anniversaries, and most are under ₹999.' },
      SHIPPING_FAQ,
    ],
  },
  bracelets: {
    title: 'Bracelets & Bangles for Women Online – Kangan, Kada, Tennis & Charm',
    description:
      'Shop artificial bracelets and bangles: kangan bangle sets, kada, cuffs, tennis, charm, evil eye and pearl bracelets in gold, silver and rose gold tones. Free shipping over ₹999.',
    intro: [
      'Stack dainty charm and infinity bracelets for everyday wear, add sparkle with a cubic zirconia tennis bracelet, or go traditional with kangan bangle sets, a bold kada or a hathphool hand chain for mehendi and weddings.',
      'Our bracelets and bangles are fashion jewellery in gold, silver and rose gold tones over brass or stainless steel. Bangle sizes are listed where they apply.',
    ],
    faqs: [
      { q: 'What bangle size should I buy?', a: 'Indian bangle sizes such as 2.4, 2.6 and 2.8 refer to the inner diameter in inches. If your current bangles slip over your hand comfortably, choose the same size; most adults wear 2.4 to 2.6.' },
      { q: 'Are chain bracelets adjustable?', a: 'Most of our chain and charm bracelets adjust up to about 19 cm, and beaded styles are on stretch cord.' },
      SHIPPING_FAQ,
    ],
  },
  anklets: {
    title: 'Anklets & Payal Online – Silver, Gold Tone & Bridal Payals',
    description:
      'Shop anklets and payals for women: ghungroo payals, bridal kundan-style payals, evil eye, pearl, shell and fine chain anklets in silver, gold and rose gold tones.',
    intro: [
      'From the soft chime of a traditional ghungroo payal to a barely-there chain for the beach, our anklets cover festive days and summer holidays alike. Choose bridal kundan-style payals for weddings, or charm anklets with stars, hearts, shells and evil eyes for everyday.',
      'Anklets are sold singly unless the product says pair, and most adjust from 22 to 27 cm. All are fashion jewellery in silver, gold or rose gold tone finishes.',
    ],
    faqs: [
      { q: 'Are anklets sold as a pair?', a: 'Most of our anklets are sold singly. Payals described as a pair, such as the ghungroo and bridal payals, include both.' },
      { q: 'What size anklet do I need?', a: 'Most anklets adjust from 22 to 27 cm, which fits the majority of ankles. Measure just above the ankle bone and add 1–2 cm for a relaxed fit.' },
      SHIPPING_FAQ,
    ],
  },
};
