// AI Article Recommender — recommends articles based on category/tag overlap
// with the user's recent likes/views. Falls back to trending articles.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { logEdgeError } from '../_shared/log-edge-error.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('ai-recommend-articles: missing env', { hasUrl: !!SUPABASE_URL, hasKey: !!SERVICE_KEY });
    return json({ items: [], strategy: 'fallback', error: 'server_misconfigured' }, 200);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const userScoped = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 6, 1), 24);
    const article_id: string | undefined = body?.article_id;

    if (article_id) {
      const { data, error } = await admin.rpc('related_articles', { _article_id: article_id, _limit: limit });
      if (error) {
        console.error('related_articles rpc failed', error);
        // Fall through to trending
      } else {
        return json({ items: data ?? [], strategy: 'related' });
      }
    }

    let userId: string | null = null;
    if (authHeader) {
      const { data: u } = await userScoped.auth.getUser();
      userId = u?.user?.id ?? null;
    }

    let categoryIds: string[] = [];
    if (userId) {
      const { data: likes } = await admin.from('article_likes').select('article_id').eq('user_id', userId).limit(20);
      const ids = (likes ?? []).map((l: { article_id: string }) => l.article_id).filter(Boolean);
      if (ids.length) {
        const { data: arts } = await admin.from('articles').select('category_id').in('id', ids);
        categoryIds = [...new Set(((arts ?? []).map((a: { category_id: string | null }) => a.category_id).filter(Boolean)) as string[])];
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
    if (error) {
      console.error('articles query failed', error);
      await logEdgeError(error, { function_name: 'ai-recommend-articles', status: 500, path: 'articles.select', extra: { strategy: 'fallback' } });
      return json({ items: [], strategy: 'fallback', error: serializeError(error) }, 200);
    }

    return json({ items: data ?? [], strategy: categoryIds.length ? 'personalized' : 'trending' });
  } catch (e) {
    console.error('ai-recommend-articles crashed', e);
    await logEdgeError(e, { function_name: 'ai-recommend-articles', status: 500 });
    return json({ items: [], strategy: 'fallback', error: serializeError(e) }, 200);
  }
});
