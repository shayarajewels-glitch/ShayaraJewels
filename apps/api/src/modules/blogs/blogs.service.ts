import { Types } from 'mongoose';
import { slugify, type AdminBlogDto, type BlogDto, type BlogInput, type ProductType } from '@shayara/shared';
import { notifyCatalogueChanged } from '../../lib/storefront-cache';
import { BlogModel, MediaAssetModel, type Blog } from '../../models';
import { notFound } from '../../utils/errors';
import { assertAllowedMediaUrl, releaseMedia } from '../uploads/media.service';

function toAdminBlogDto(b: Blog): AdminBlogDto {
  return {
    id: b._id.toString(),
    slug: b.slug,
    title: b.title,
    category: b.category ?? null,
    content: b.content,
    image: { url: b.image.url, key: b.image.key ?? null, alt: b.image.alt },
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function toBlogDto(b: Blog): BlogDto {
  const { image, ...rest } = toAdminBlogDto(b);
  return { ...rest, image: { url: image.url, alt: image.alt } };
}

/** Newest first. `general` means posts without a category. */
export async function listBlogs(category: ProductType | 'general' | undefined, limit: number): Promise<BlogDto[]> {
  const filter = category === undefined ? {} : { category: category === 'general' ? null : category };
  const docs = await BlogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean<Blog[]>();
  return docs.map(toBlogDto);
}

export async function getBlogBySlug(slug: string): Promise<BlogDto> {
  const doc = await BlogModel.findOne({ slug }).lean<Blog>();
  if (!doc) throw notFound('Post not found');
  return toBlogDto(doc);
}

export async function listBlogSlugs() {
  return BlogModel.find().select('slug updatedAt').sort({ updatedAt: -1 }).limit(5_000).lean<Pick<Blog, 'slug' | 'updatedAt'>[]>();
}

export async function adminListBlogs(): Promise<AdminBlogDto[]> {
  return (await BlogModel.find().sort({ createdAt: -1 }).lean<Blog[]>()).map(toAdminBlogDto);
}

export async function adminGetBlog(id: string): Promise<AdminBlogDto> {
  const doc = await BlogModel.findById(id).lean<Blog>();
  if (!doc) throw notFound('Post not found');
  return toAdminBlogDto(doc);
}

/** "festive-styling", then "festive-styling-2" and so on if taken. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'post';
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await BlogModel.exists({ slug }))) return slug;
  }
}

function toDoc(input: BlogInput) {
  assertAllowedMediaUrl(input.image.url, 'image.url', { anyHost: !input.image.key });
  return { ...input, image: { url: input.image.url, key: input.image.key ?? null, alt: input.image.alt || input.title } };
}

/** Uploaded pictures are kept out of the orphan-media cleanup. */
async function keepImage(key: string | null) {
  if (key) await MediaAssetModel.updateMany({ key, status: 'pending' }, { status: 'attached' });
}

export async function adminCreateBlog(input: BlogInput): Promise<AdminBlogDto> {
  const blog = await BlogModel.create({ ...toDoc(input), slug: await uniqueSlug(input.title) });
  await keepImage(blog.image.key);
  notifyCatalogueChanged();
  return toAdminBlogDto(blog.toObject());
}

export async function adminUpdateBlog(id: string, input: BlogInput): Promise<AdminBlogDto> {
  const blog = await BlogModel.findById(id);
  if (!blog) throw notFound('Post not found');
  const oldKey = blog.image.key ?? null;
  blog.set(toDoc(input));
  await blog.save();
  const newKey = blog.image.key ?? null;
  await keepImage(newKey);
  if (oldKey && oldKey !== newKey) await releaseMedia([oldKey]);
  notifyCatalogueChanged();
  return toAdminBlogDto(blog.toObject());
}

export async function adminDeleteBlog(id: string): Promise<void> {
  const blog = await BlogModel.findByIdAndDelete(new Types.ObjectId(id)).lean<Blog>();
  if (!blog) throw notFound('Post not found');
  if (blog.image.key) await releaseMedia([blog.image.key]);
  notifyCatalogueChanged();
}
