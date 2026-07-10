// AI Article Recommender — recommends articles based on category/tag overlap
// with the user's recent likes/views. Falls back to trending articles.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    });
    const { limit = 6, article_id } = (await req.json().catch(() => ({}))) as { limit?: number; article_id?: string };
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // If article_id given → use built-in related_articles RPC
    if (article_id) {
      const { data, error } = await admin.rpc('related_articles', { _article_id: article_id, _limit: limit });
      if (error) throw error;
      return new Response(JSON.stringify({ items: data ?? [], strategy: 'related' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userId: string | null = null;
    if (authHeader) {
      const { data: u } = await supabase.auth.getUser();
      userId = u?.user?.id ?? null;
    }

    // Personalized: fetch user's liked article categories
    let categoryIds: string[] = [];
    if (userId) {
      const { data: likes } = await admin
        .from('article_likes')
        .select('article_id')
        .eq('user_id', userId)
        .limit(20);
      const ids = (likes ?? []).map((l: { article_id: string }) => l.article_id);
      if (ids.length) {
        const { data: arts } = await admin.from('articles').select('category_id').in('id', ids);
        categoryIds = [...new Set((arts ?? []).map((a: { category_id: string | null }) => a.category_id).filter(Boolean) as string[])];
      }
    }

    let query = admin
      .from('articles')
      .select('id, slug, title, excerpt, hero_image_url, publish_at, view_count, like_count, category_id')
      .eq('status', 'published')
      .lte('publish_at', new Date().toISOString())
      .order('view_count', { ascending: false })
      .limit(limit);
    if (categoryIds.length) query = query.in('category_id', categoryIds);

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({
      items: data ?? [],
      strategy: categoryIds.length ? 'personalized' : 'trending',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
