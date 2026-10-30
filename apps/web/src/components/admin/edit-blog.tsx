'use client';

import Link from 'next/link';
import type { AdminBlogDto } from '@shayara/shared';
import { Alert, Skeleton } from '@/components/ui/misc';
import { AdminPageHeader, useAdminResource } from './admin-ui';
import { BlogForm } from './blog-form';

export function EditBlog({ id }: { id: string }) {
  const { data, error, loading } = useAdminResource<AdminBlogDto>(`/admin/blogs/${id}`);
  return (
    <div>
      <Link href="/admin/blogs" className="text-xs text-rose-deep hover:underline">
        ← All posts
      </Link>
      {error && (
        <Alert variant="error" title="Could not load this post" className="mt-4">
          {error}
        </Alert>
      )}
      {loading && !data && <Skeleton className="mt-4 h-96" />}
      {data && (
        <>
          <AdminPageHeader title="Edit post" description={data.title} />
          {/* Remount when the post changes so the form picks up fresh values. */}
          <BlogForm key={data.id} blog={data} />
        </>
      )}
    </div>
  );
}
