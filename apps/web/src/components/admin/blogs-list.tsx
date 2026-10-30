'use client';

import { ExternalLink, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { AdminBlogDto } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { blogCategory } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { AdminPageHeader, TableWrap, useAdminResource } from './admin-ui';
import { ConfirmDialog } from './confirm-dialog';

export function BlogsList() {
  const { data, error, loading, reload } = useAdminResource<{ items: AdminBlogDto[] }>('/admin/blogs');

  const remove = async (b: AdminBlogDto) => {
    try {
      await api(`/admin/blogs/${b.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Blogs"
        description="Every post appears on the Blogs page (footer → Help → Blogs), newest first."
        actions={
          <Button asChild>
            <Link href="/admin/blogs/new">
              <Plus /> New post
            </Link>
          </Button>
        }
      />
      {error && <Alert variant="error" title="Could not load posts">{error}</Alert>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<Newspaper />} title="No posts yet">
          Write styling tips, care guides or stories behind your pieces.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <TableWrap label="Blog posts">
          <thead>
            <tr>
              <th>Picture</th>
              <th>Title</th>
              <th>Category</th>
              <th>Published</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => (
              <tr key={b.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail of any uploaded URL */}
                  <img src={b.image.url} alt="" className="h-12 w-20 rounded object-cover ring-1 ring-border" />
                </td>
                <td>
                  <Link href={`/admin/blogs/${b.id}`} className="font-medium hover:text-rose-deep hover:underline">
                    {b.title}
                  </Link>
                </td>
                <td className="text-xs">{blogCategory(b.category)?.name ?? '—'}</td>
                <td className="text-xs text-charcoal-soft">{formatDate(b.createdAt)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label={`View ${b.title} in the store`}>
                      <Link href={`/blog/${b.slug}`} target="_blank">
                        <ExternalLink />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" aria-label={`Edit ${b.title}`}>
                      <Link href={`/admin/blogs/${b.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Delete ${b.title}`}>
                          <Trash2 />
                        </Button>
                      }
                      title="Delete this post?"
                      description={`“${b.title}” will be removed from the store. This cannot be undone.`}
                      confirmLabel="Delete post"
                      destructive
                      onConfirm={() => remove(b)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
