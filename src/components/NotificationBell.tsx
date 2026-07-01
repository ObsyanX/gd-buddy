import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type N = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: string;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<N[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setItems((data as N[]) || []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    load();
  };

  const openItem = async (n: N) => {
    if (!n.is_read) await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    if (n.link) navigate(n.link);
    load();
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-2" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-xs" variant="destructive">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-2 border-border">
        <div className="p-3 border-b-2 border-border flex items-center justify-between">
          <h3 className="font-bold">NOTIFICATIONS</h3>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark all
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={`w-full text-left p-3 border-b border-border hover:bg-accent transition ${
                !n.is_read ? 'bg-accent/40' : ''
              }`}
            >
              <div className="flex justify-between gap-2">
                <p className="font-bold text-sm">{n.title}</p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
