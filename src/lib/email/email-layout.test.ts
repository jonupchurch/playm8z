import { describe, expect, it } from "vitest";
import { emailButton, emailLayout, emailUrlFallback } from "./email-layout";

const html = emailLayout({ title: "Verify your email for playm8z", contentHtml: "<p>hi</p>" });

// These pin a REAL rendering bug the user caught by forwarding a screenshot
// of a live send: content jammed against the right edge with a wide empty
// gutter on the left. No test renders Gmail, so these assert the markup
// rules that cause it -- the closest thing to a regression test available.
describe("emailLayout", () => {
  describe("direction (the cause of the right-aligned Gmail bug)", () => {
    it("sets lang and dir on <html>", () => {
      expect(html).toContain('<html lang="en" dir="ltr">');
    });

    // The load-bearing one. Clients strip attributes off <html>, so the copy
    // there is the one that gets thrown away -- leaving direction to be
    // inferred, and an inferred RTL right-aligns everything. This duplicate
    // is what actually survives.
    it("ALSO sets lang and dir on the direct child of <body>", () => {
      expect(html).toMatch(/<body[^>]*>\s*(<!--[\s\S]*?-->\s*)?<div lang="en" dir="ltr"/);
    });

    it("pins direction on the content cell too", () => {
      expect(html).toContain('dir="ltr" style="text-align:left');
    });
  });

  describe("centering", () => {
    // margin:0 auto is reliable on the web and not in email. align="center"
    // on a <td> is the bulletproof equivalent, back through Outlook.
    it("centers with a table cell, never with margin auto", () => {
      expect(html).toContain('<td align="center"');
      expect(html).not.toContain("margin:0 auto");
      expect(html).not.toContain("margin: 0 auto");
    });

    it("constrains the content column", () => {
      expect(html).toContain('width="480"');
      expect(html).toContain("max-width:100%");
    });
  });

  describe("accessibility", () => {
    it("marks every layout table presentational", () => {
      const tables = html.match(/<table[^>]*>/g) ?? [];
      expect(tables.length).toBeGreaterThan(0);
      // Without this a screen reader announces "table, row 1 of N" for every
      // layout row and the email becomes unusable.
      for (const table of tables) expect(table).toContain('role="presentation"');
    });

    it("sets a <title> describing this email, not the brand", () => {
      expect(html).toContain("<title>Verify your email for playm8z</title>");
    });

    it("escapes the title", () => {
      const escaped = emailLayout({ title: '<script>"x"', contentHtml: "" });
      expect(escaped).toContain("<title>&lt;script&gt;&quot;x&quot;</title>");
    });

    it("declares a charset and a viewport", () => {
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('name="viewport"');
    });

    it("places the caller's content inside the shell", () => {
      expect(html).toContain("<p>hi</p>");
    });
  });
});

describe("emailButton", () => {
  it("is a real link with real text, not a linked image", () => {
    const button = emailButton("https://www.playm8z.net/login", "Go to the playm8z login page");
    expect(button).toContain('href="https://www.playm8z.net/login"');
    expect(button).toContain("Go to the playm8z login page");
    expect(button).not.toContain("<img");
  });

  it("escapes the href and the label", () => {
    const button = emailButton("https://x.test/?a=1&b=2", '<script>"x"');
    expect(button).toContain("a=1&amp;b=2");
    expect(button).not.toContain("<script>");
  });
});

describe("emailUrlFallback", () => {
  // A bare URL as link text reads as "h-t-t-p-s-colon-slash-slash..." to a
  // screen reader and describes nothing. The button above already carries
  // the described link; most clients auto-link this anyway.
  it("shows the URL as text, NOT as a link", () => {
    const fallback = emailUrlFallback("https://www.playm8z.net/reset-password?token=abc");
    expect(fallback).toContain("https://www.playm8z.net/reset-password?token=abc");
    expect(fallback).not.toContain("<a ");
    expect(fallback).not.toContain("href=");
  });

  it("escapes the URL", () => {
    expect(emailUrlFallback("https://x.test/?a=1&b=2")).toContain("a=1&amp;b=2");
  });
});
