import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/news",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/actions/save-news-post", () => ({ saveNewsPost: vi.fn() }));
vi.mock("@/lib/actions/delete-news-post", () => ({ deleteNewsPostPermanently: vi.fn() }));
vi.mock("@/lib/actions/generate-news-draft", () => ({ generateNewsDraft: vi.fn() }));
vi.mock("@/lib/actions/improve-draft-text", () => ({ improveDraftText: vi.fn() }));
vi.mock("@/lib/actions/upload-news-cover-image", () => ({ uploadNewsCoverImage: vi.fn() }));

const { deleteNewsPostPermanently } = await import("@/lib/actions/delete-news-post");
const { NewsPostEditor } = await import("./news-post-editor");
const mockDelete = deleteNewsPostPermanently as unknown as ReturnType<typeof vi.fn>;

type EditorPost = Parameters<typeof NewsPostEditor>[0]["post"];

const post = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Hello world",
  excerpt: "An excerpt",
  body: "Body",
  category: "Announcement",
  cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
  tags: [],
  status: "published",
  featured: false,
  publishedAt: new Date(),
  readTimeMinutes: 1,
  slug: "hello-world",
} as unknown as EditorPost;

describe("NewsPostEditor delete controls (041)", () => {
  beforeEach(() => mockDelete.mockClear());

  it("labels the soft-remove button 'Unpublish', not 'Delete'", () => {
    render(<NewsPostEditor post={post} isAdmin isOwner={false} />);
    expect(screen.getByRole("button", { name: "Unpublish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows 'Delete permanently' only to the owner", () => {
    const { rerender } = render(<NewsPostEditor post={post} isAdmin isOwner={false} />);
    expect(screen.queryByRole("button", { name: "Delete permanently" })).not.toBeInTheDocument();

    rerender(<NewsPostEditor post={post} isAdmin isOwner />);
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeInTheDocument();
  });

  it("shows no delete controls for a new (unsaved) post", () => {
    render(<NewsPostEditor post={null} isAdmin isOwner />);
    expect(screen.queryByRole("button", { name: "Unpublish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete permanently" })).not.toBeInTheDocument();
  });

  it("requires a two-step confirm before permanently deleting", async () => {
    mockDelete.mockResolvedValueOnce({ success: true });
    render(<NewsPostEditor post={post} isAdmin isOwner />);

    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    // A single click only reveals the confirm — it must not delete yet.
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm permanent delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm permanent delete" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith({ postId: post!.id }));
  });

  it("cancel backs out without deleting", () => {
    render(<NewsPostEditor post={post} isAdmin isOwner />);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeInTheDocument();
  });
});
