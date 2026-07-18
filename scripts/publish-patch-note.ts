// Publishes a "Patch Notes" news post from a JSON file into DATABASE_URL.
// This is the standing workflow step: whenever the CHANGELOG gets a
// user-facing entry, a matching player-facing Patch Notes post is published
// to production so players see what changed. Posts show the fixed
// "playm8z team" byline (the article header's own; no per-post author record).
//
// Usage:
//   npx tsx scripts/publish-patch-note.ts ./note.json
//   PATCH_NOTE_FILE=./note.json DATABASE_URL=<url> npx tsx scripts/publish-patch-note.ts
//
// note.json shape:
//   { "title": "...", "excerpt": "...", "body": "markdown...", "tags": ["a","b"] }
//
// Idempotent: if a post with the derived slug already exists, it is skipped
// (so a local dry-run followed by the real prod run never double-posts, and an
// accidental re-run is safe).
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fine if DATABASE_URL is provided another way
  }
}

const CATEGORY = "Patch Notes"; // one of NEWS_CATEGORIES (src/lib/validations/news.ts)

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}

function readTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type Note = { title: string; excerpt: string; body: string; tags?: string[] };

function loadNote(): Note {
  const path = process.env.PATCH_NOTE_FILE ?? process.argv[2];
  if (!path) throw new Error("Provide a note JSON path (argv[2] or PATCH_NOTE_FILE).");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Note;
  if (!parsed.title?.trim()) throw new Error("note.title is required.");
  if (!parsed.excerpt?.trim()) throw new Error("note.excerpt is required.");
  if (!parsed.body?.trim()) throw new Error("note.body is required.");
  return parsed;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const note = loadNote();

  const { db } = await import("../src/db");
  const { newsPosts } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  // Unique slug (collision-suffix, matching save-news-post.ts).
  const base = slugify(note.title);
  let slug = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ id: newsPosts.id, slug: newsPosts.slug })
      .from(newsPosts)
      .where(eq(newsPosts.slug, slug))
      .limit(1);
    if (!existing) break;
    // Idempotency: an exact base-slug match means this note was already posted.
    if (slug === base) {
      console.log(`Already published (slug "${base}" exists) — skipping.`);
      process.exit(0);
    }
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const [row] = await db
    .insert(newsPosts)
    .values({
      title: note.title.trim(),
      excerpt: note.excerpt.trim(),
      body: note.body,
      category: CATEGORY,
      status: "published",
      slug,
      tags: note.tags ?? [],
      readTimeMinutes: readTime(note.body),
      publishedAt: new Date(),
    })
    .returning({ id: newsPosts.id, slug: newsPosts.slug });

  console.log(`Published Patch Notes post: /news/${row.slug} (id ${row.id})`);
  process.exit(0);
}

main();

export {};
