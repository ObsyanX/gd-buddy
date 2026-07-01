import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Star, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, sessions: 0, feedback: 0, avgRating: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [profRes, sessRes, fbRes, errRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('gd_sessions').select('id, topic, status, created_at, is_multiplayer, user_id').order('created_at', { ascending: false }).limit(200),
        supabase.from('user_feedback').select('*, gd_sessions(topic), profiles!user_feedback_user_id_fkey(display_name)').order('created_at', { ascending: false }).limit(200),
        supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      setUsers(profRes.data || []);
      setSessions(sessRes.data || []);
      setFeedback(fbRes.data || []);
      setErrors(errRes.data || []);
      const avg =
        (fbRes.data || []).reduce((s: number, f: any) => s + (f.stars || 0), 0) /
        Math.max(1, (fbRes.data || []).length);
      setStats({
        users: profRes.data?.length || 0,
        sessions: sessRes.data?.length || 0,
        feedback: fbRes.data?.length || 0,
        avgRating: Math.round(avg * 10) / 10,
      });
    })();
  }, [isAdmin]);

  const deleteError = async (id: string) => {
    await supabase.from('error_logs').delete().eq('id', id);
    setErrors((prev) => prev.filter((e) => e.id !== id));
    toast({ title: 'Log deleted' });
  };

  if (loading) return <div className="p-8">Checking admin access…</div>;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-4xl font-bold">ADMIN DASHBOARD</h1>
          <Badge variant="destructive">RESTRICTED ACCESS</Badge>
        </div>
      </header>

      <main className="container mx-auto p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-4 border-border">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <div>
                <p className="text-xs text-muted-foreground">USERS</p>
                <p className="text-2xl font-bold">{stats.users}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-4 border-border">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6" />
              <div>
                <p className="text-xs text-muted-foreground">SESSIONS</p>
                <p className="text-2xl font-bold">{stats.sessions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-4 border-border">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6" />
              <div>
                <p className="text-xs text-muted-foreground">FEEDBACK</p>
                <p className="text-2xl font-bold">{stats.feedback}</p>
                <p className="text-xs">avg {stats.avgRating || 0}★</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-4 border-border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="text-xs text-muted-foreground">ERRORS</p>
                <p className="text-2xl font-bold">{errors.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b-2 border-border">
                  <tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">XP</th><th className="p-2">Joined</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border">
                      <td className="p-2">{u.display_name}</td>
                      <td className="p-2 font-mono text-xs">{u.email || '—'}</td>
                      <td className="p-2">{u.xp || 0}</td>
                      <td className="p-2 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b-2 border-border">
                  <tr><th className="p-2">Topic</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Date</th></tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-border">
                      <td className="p-2 truncate max-w-xs">{s.topic}</td>
                      <td className="p-2">{s.is_multiplayer ? 'Multi' : 'Solo'}</td>
                      <td className="p-2"><Badge variant="outline">{s.status}</Badge></td>
                      <td className="p-2 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto space-y-3">
              {feedback.map((f) => (
                <div key={f.id} className="border-2 border-border p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <p className="font-bold">{f.profiles?.display_name || 'User'} — {f.stars}★</p>
                    <span className="text-xs">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Topic: {f.gd_sessions?.topic || '—'}</p>
                  {f.comments && <p className="text-sm">{f.comments}</p>}
                  <div className="flex gap-3 mt-1 text-xs">
                    <span>Quality: {f.quality_rating || '—'}★</span>
                    <span>AI: {f.ai_accuracy_rating || '—'}★</span>
                    <span>NPS: {f.nps ?? '—'}</span>
                  </div>
                </div>
              ))}
              {feedback.length === 0 && <p className="text-center text-muted-foreground">No feedback yet.</p>}
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto space-y-2">
              {errors.map((e) => (
                <div key={e.id} className="border-2 border-border p-3 rounded flex justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{e.error_message || e.message || 'Error'}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.context || e.error_source || ''}</p>
                    <p className="text-xs">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteError(e.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {errors.length === 0 && <p className="text-center text-muted-foreground">No errors logged.</p>}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
