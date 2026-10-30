import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-ui';
import { BlogForm } from '@/components/admin/blog-form';

export const metadata = { title: 'New post' };

export default function NewBlogPage() {
  return (
    <div>
      <Link href="/admin/blogs" className="text-xs text-rose-deep hover:underline">
        ← All posts
      </Link>
      <AdminPageHeader title="New post" description="Add a title, pick where it shows, write the post and add one picture." />
      <BlogForm />
    </div>
  );
}
