import { marked } from "marked";

// research.md #1: `body` is plain markdown (Admin News/020's own
// decision, specifically so this feature could render it simply) --
// `marked` renders it to HTML, no custom parser, no rich-document
// block structure. `body` is moderator-authored (role-gated at write
// time, same trust boundary as Content Page's own `blocks`), so no
// separate sanitizer is layered on top.
export function ArticleBody({ body }: { body: string }) {
  const html = marked.parse(body, { async: false }) as string;

  return (
    <div
      className="article-body max-w-none text-[16px] leading-[1.8] text-text-muted [&_a]:text-accent [&_blockquote]:my-7 [&_blockquote]:border-l-3 [&_blockquote]:border-accent [&_blockquote]:pl-5 [&_blockquote]:text-[19px] [&_blockquote]:text-text [&_blockquote]:italic [&_h2]:mt-8.5 [&_h2]:mb-3.5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-text [&_li]:mb-2 [&_p]:mb-5 [&_strong]:text-text [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
