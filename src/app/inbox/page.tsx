// Empty/no-selection state for the chat pane -- shown at `/inbox`
// itself, before any conversation or request is opened.
export default function InboxIndexPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <p className="text-lg font-bold text-text">Select a conversation</p>
        <p className="mt-1.5 text-sm text-text-dim">Pick a conversation from the list, or start a new one.</p>
      </div>
    </div>
  );
}
