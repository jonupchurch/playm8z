# Quickstart: News Article detail

## Prerequisites

- Local dev DB migrated with this feature's schema changes
  (`newsPosts.slug`, `savedNewsPosts`, `likes.targetType` allowing
  `newsPost`) plus `013`'s/`020`'s `NewsPost` and `007`'s Saved tab.
- A moderator session to create/publish a test article via Admin News
  (`020`), a regular authenticated+verified session, and a logged-out
  browser context.
- Seed data: at least one published article (with a real slug), one
  draft, one not-yet-due scheduled post, and at least 3 other
  published articles for the "Keep reading" grid.

## Manual Scenarios

1. **Read a published article, logged out** — visit a published
   article's `/news/{slug}`. Confirm meta/title/author/cover/body/
   tags/related-articles/subscribe-box all render, with a real,
   computed read time (not blank/zero for non-empty content).

2. **Not-found handling** — visit a draft's slug, a not-yet-due
   scheduled post's slug, and a nonexistent slug; confirm all three
   show the same not-found response (`002`), indistinguishable from
   each other.

3. **Reading progress** — scroll through the article; confirm the
   progress bar tracks scroll position accurately from top to bottom.

4. **Newsletter subscribe** — submit an email in the subscribe box;
   confirm it behaves exactly as News feed's (`013`) existing
   subscribe action.

5. **Like** — as an authenticated, verified visitor, select "Like";
   confirm the count increments and the button reflects "liked."
   Reload the page; confirm the state persists. Unlike; confirm it
   reverts.

6. **Save, then find it in Profile** — select "Save"; confirm the
   button shows "Saved." Visit Profile's (`007`) Saved tab; confirm a
   new "Saved articles" section lists this article.

7. **Keep reading** — confirm the grid shows up to 3 other live
   articles, never the current one, and never a placeholder/fake
   card if fewer than 3 exist.

8. **Share buttons** — select each share button; confirm each performs
   a plain client-side action (share-intent link or clipboard copy)
   with no network request.

9. **Unauthenticated/unverified gating** — attempt Like/Save as a
   logged-out visitor; confirm routed to log in. Attempt as an
   unverified session; confirm a verify-your-email message.

10. **Slug generation and stability** — as a moderator, create a new
    article via Admin News (`020`) with a title matching an existing
    slug's base; confirm a numeric suffix is appended. Edit that
    post's title afterward; confirm its slug/URL doesn't change.

## Automated tests

- Unit: `news-article.ts` Zod schemas; `get-news-article.ts`'s
  computed read time and "is live"/"keep reading" logic; `020`'s
  amended `save-news-post.ts` slug-generation (extended, incl. the
  collision-suffix case).
- Integration: `toggle-news-like.ts` and `toggle-saved-news-post.ts`
  (create/delete, unauthenticated/unverified rejection); Profile's
  (`007`) Saved tab amendment (surfaces a `savedNewsPosts` row).
- E2E (`e2e/news-article-detail.spec.ts`): read/not-found/progress-
  bar/subscribe (US1); like/save + Profile Saved-tab surfacing (US2);
  keep-reading/share (US3), with an axe-core scan.
