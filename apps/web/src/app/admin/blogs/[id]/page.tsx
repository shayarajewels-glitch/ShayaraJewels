import { EditBlog } from '@/components/admin/edit-blog';

export const metadata = { title: 'Edit post' };

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditBlog id={id} />;
}
