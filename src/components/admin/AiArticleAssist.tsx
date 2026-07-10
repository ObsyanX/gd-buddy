import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  title: string;
  body: string;
  onDraft: (md: string) => void;
  onImprove: (md: string) => void;
  onSeo: (seo: { seo_title?: string; seo_description?: string; tags?: string[] }) => void;
}

export default function AiArticleAssist({ title, body, onDraft, onImprove, onSeo }: Props) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const call = async (action: 'outline' | 'draft' | 'improve' | 'seo') => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-article-assistant", {
        body: {
          action,
          topic: topic || title,
          title,
          body,
        },
      });
      if (error) throw error;
      const result = (data as { result: unknown })?.result;
      if (action === 'seo' && result && typeof result === 'object') {
        onSeo(result as Record<string, string>);
        toast({ title: "SEO metadata generated" });
      } else if (action === 'improve') {
        onImprove(String(result ?? ''));
        toast({ title: "Article rewritten" });
      } else {
        onDraft(String(result ?? ''));
        toast({ title: action === 'outline' ? "Outline inserted" : "Draft generated" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI failed";
      toast({ title: "AI error", description: msg, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">AI Assist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (or uses title)"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => call('outline')} disabled={!!loading}>
            {loading === 'outline' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Outline'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => call('draft')} disabled={!!loading}>
            {loading === 'draft' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Full draft'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => call('improve')} disabled={!!loading || !body}>
            {loading === 'improve' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Improve'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => call('seo')} disabled={!!loading || !body}>
            {loading === 'seo' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'SEO meta'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Generated content replaces the body. Always review before publishing.</p>
      </CardContent>
    </Card>
  );
}
