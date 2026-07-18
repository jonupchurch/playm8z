import { describe, expect, it } from "vitest";
import { filterAndGroupNotifications, type NotificationItem } from "./filter-notifications";

const now = new Date();
const today = new Date(now);
today.setHours(10, 0, 0, 0);
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(10, 0, 0, 0);

function plain(overrides: Partial<Omit<Extract<NotificationItem, { kind: "notification" }>, "kind">> = {}): NotificationItem {
  return {
    kind: "notification",
    id: crypto.randomUUID(),
    type: "reply",
    actorHandle: "someone",
    actorAvatarColor: null,
    actorAvatarImage: null,
    actorImage: null,
    text: "did something",
    targetRef: "/forum/thread/x",
    unread: true,
    createdAt: today,
    ...overrides,
  };
}

function request(overrides: Partial<Omit<Extract<NotificationItem, { kind: "request" }>, "kind">> = {}): NotificationItem {
  return {
    kind: "request",
    id: crypto.randomUUID(),
    status: "pending",
    actorHandle: "applicant",
    actorAvatarColor: null,
    actorAvatarImage: null,
    actorImage: null,
    context: "Game · Title",
    resolvedText: null,
    targetRef: "/listing/x",
    unread: true,
    createdAt: today,
    ...overrides,
  };
}

describe("filterAndGroupNotifications (unit)", () => {
  it("groups today vs earlier and sorts newest-first within each group", () => {
    const a = plain({ id: "a", createdAt: new Date(today.getTime() - 60_000) });
    const b = plain({ id: "b", createdAt: today });
    const c = plain({ id: "c", createdAt: yesterday });

    const groups = filterAndGroupNotifications([a, c, b], "all");
    expect(groups.map((g) => g.label)).toEqual(["Today", "Earlier"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("filters to unread only", () => {
    const read = plain({ id: "read", unread: false });
    const unread = plain({ id: "unread", unread: true });
    const groups = filterAndGroupNotifications([read, unread], "unread");
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual(["unread"]);
  });

  it("categorizes join/accepted requests and reply/mention as requests/forum", () => {
    const pendingRequest = request({ id: "req" });
    const reply = plain({ id: "reply", type: "reply" });
    const mention = plain({ id: "mention", type: "mention" });
    const system = plain({ id: "system", type: "system" });

    expect(filterAndGroupNotifications([pendingRequest], "requests").flatMap((g) => g.items.map((i) => i.id))).toEqual(
      ["req"],
    );
    expect(
      filterAndGroupNotifications([reply, mention], "forum")
        .flatMap((g) => g.items.map((i) => i.id))
        .sort(),
    ).toEqual(["mention", "reply"]);
    expect(filterAndGroupNotifications([system], "system").flatMap((g) => g.items.map((i) => i.id))).toEqual([
      "system",
    ]);
  });

  it("categorizes a declined notification under the requests filter (040)", () => {
    const declined = plain({ id: "declined", type: "declined", targetRef: "/listing/x" });
    expect(filterAndGroupNotifications([declined], "requests").flatMap((g) => g.items.map((i) => i.id))).toEqual([
      "declined",
    ]);
    // and it does not leak into the forum bucket
    expect(filterAndGroupNotifications([declined], "forum")).toEqual([]);
  });

  it("excludes message-type notifications from every named category filter", () => {
    const message = plain({ id: "msg", type: "message" });
    expect(filterAndGroupNotifications([message], "requests")).toEqual([]);
    expect(filterAndGroupNotifications([message], "forum")).toEqual([]);
    expect(filterAndGroupNotifications([message], "system")).toEqual([]);
    expect(filterAndGroupNotifications([message], "all").flatMap((g) => g.items.map((i) => i.id))).toEqual(["msg"]);
  });

  it("returns no groups when nothing matches (empty state)", () => {
    expect(filterAndGroupNotifications([], "all")).toEqual([]);
    expect(filterAndGroupNotifications([plain({ id: "x", unread: false })], "unread")).toEqual([]);
  });
});
