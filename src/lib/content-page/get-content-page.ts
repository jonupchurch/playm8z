import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, type ContentBlock } from "@/db/schema";

export type ContentPageRow = {
  id: string;
  slug: string;
  title: string;
  blocks: ContentBlock[];
  status: "published" | "draft";
  updatedAt: Date;
};

export async function getContentPageBySlug(slug: string): Promise<ContentPageRow | null> {
  const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blocks: row.blocks,
    status: row.status === "published" ? "published" : "draft",
    updatedAt: row.updatedAt,
  };
}
