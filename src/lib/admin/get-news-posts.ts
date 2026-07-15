import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";

export type AdminNewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  cover: string | null;
  status: string;
  featured: boolean;
  tags: string[];
  publishedAt: Date;
};

// research.md #6: an admin CMS's own post list is bounded by how much
// content editors actually produce -- nowhere near Browse's/Forum
// index's unbounded scale -- so this fetches every post unconditionally;
// the All/Published/Drafts/Scheduled filter is applied client-side in
// news-post-list.tsx (Home's own "fetch all, filter" precedent, not
// Browse's searchParams-paginated one).
export async function getNewsPosts(): Promise<AdminNewsPost[]> {
  return db
    .select({
      id: newsPosts.id,
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      body: newsPosts.body,
      category: newsPosts.category,
      cover: newsPosts.cover,
      status: newsPosts.status,
      featured: newsPosts.featured,
      tags: newsPosts.tags,
      publishedAt: newsPosts.publishedAt,
    })
    .from(newsPosts)
    .orderBy(desc(newsPosts.publishedAt));
}
