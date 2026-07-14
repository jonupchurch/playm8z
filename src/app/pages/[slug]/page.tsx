import { notFound } from "next/navigation";
import { getContentPageBySlug } from "@/lib/content-page/get-content-page";
import { requireRole } from "@/lib/auth/require-role";
import { BlockRenderer } from "@/components/content-page/block-renderer";
import { PageEditor } from "@/components/content-page/page-editor";

// FR-003/research.md #4: reuses require-role.ts for the draft-
// visibility decision too, wrapped so a moderator-or-higher rejection
// (unauthenticated or below-moderator) converts into the same
// notFound() a genuinely missing slug gets -- never leaking that an
// unpublished page exists via a distinct 401/403.
async function canEditPage(): Promise<boolean> {
  try {
    await requireRole("moderator");
    return true;
  } catch {
    return false;
  }
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getContentPageBySlug(slug);
  const canEdit = await canEditPage();

  if (!page || (page.status === "draft" && !canEdit)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-190 px-8 py-12">
        {canEdit ? (
          <PageEditor
            slug={page.slug}
            initialTitle={page.title}
            initialBlocks={page.blocks}
            initialStatus={page.status}
            updatedAt={page.updatedAt.toISOString()}
          />
        ) : (
          <>
            <h1 className="mb-3 text-4xl leading-tight font-bold tracking-tight text-text">{page.title}</h1>
            <p className="mb-9 font-mono text-xs text-text-dim">
              Last updated{" "}
              {page.updatedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
            <BlockRenderer blocks={page.blocks} />
          </>
        )}
      </div>
    </main>
  );
}
