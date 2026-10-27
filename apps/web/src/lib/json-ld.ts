/** Serialises structured data for a <script type="application/ld+json"> without allowing `</script>` breakouts. */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
