import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeedbackHistory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_feedback')
        .select('*, gd_sessions(topic)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setItems(data || []);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold text-center">MY FEEDBACK</h1>
        </div>
      </header>
      <main className="container mx-auto p-8 max-w-3xl space-y-4">
        {items.length === 0 && <p className="text-center text-muted-foreground">No feedback submitted yet.</p>}
        {items.map((f) => (
          <Card key={f.id} className="p-4 border-4 border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold">{f.gd_sessions?.topic || 'Session'}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {new Date(f.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-4 h-4 ${n <= f.stars ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                ))}
              </div>
            </div>
            {f.comments && <p className="text-sm text-muted-foreground">{f.comments}</p>}
            {f.session_id && (
              <Link to={`/home/session/${f.session_id}/report`} className="text-xs underline">
                View session report →
              </Link>
            )}
          </Card>
        ))}
      </main>
    </div>
  );
};

export default FeedbackHistory;
