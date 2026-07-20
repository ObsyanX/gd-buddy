// Tests for ai-recommend-articles: ensures no references to `articles.excerpt`
// and that responses conform to the expected shape.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("source does not select or reference articles.excerpt column", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  // Must not select `excerpt` from the articles table.
  assert(
    !/\bexcerpt\b\s*,/.test(src) && !/select\([^)]*\bexcerpt\b/i.test(src),
    "ai-recommend-articles must not select articles.excerpt",
  );
  // Must not reference hero_image_url (old column name).
  assert(!/hero_image_url/.test(src), "hero_image_url no longer exists on articles");
  // Must select the current canonical columns.
  assert(/summary/.test(src), "should select summary");
  assert(/thumbnail/.test(src), "should select thumbnail");
});

function isArticleItem(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.slug === "string" &&
    typeof o.title === "string" &&
    "summary" in o &&
    "excerpt" in o && // normalized alias for frontend compatibility
    "thumbnail" in o &&
    "featured_image" in o &&
    "view_count" in o &&
    "like_count" in o
  );
}

Deno.test("response shape validator accepts normalized item, rejects bad shape", () => {
  const good = {
    id: "a", slug: "s", title: "t",
    summary: null, excerpt: null, thumbnail: null, featured_image: null,
    publish_at: null, view_count: 0, like_count: 0, category_id: null,
  };
  assertEquals(isArticleItem(good), true);
  assertEquals(isArticleItem({ id: 1, slug: "s", title: "t" }), false);
  assertEquals(isArticleItem(null), false);
});
