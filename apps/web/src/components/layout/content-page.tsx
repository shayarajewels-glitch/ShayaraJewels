import { PageHeading } from './page-heading';

/** Layout for policy and information pages. */
export function ContentPage({ title, eyebrow, updated, children }: { title: string; eyebrow?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-10">
      <PageHeading eyebrow={eyebrow} title={title} crumbs={[{ href: '/', label: 'Home' }, { label: title }]} />
      {updated && <p className="-mt-6 mb-8 text-xs text-charcoal-soft">Last updated: {updated}</p>}
      <div className="prose-shayara">{children}</div>
    </div>
  );
}
