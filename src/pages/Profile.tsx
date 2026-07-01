import { useState, useEffect } from 'react';
import { ProfileSkeleton } from '@/components/SkeletonLoaders';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User, Trophy, Zap, MessageSquareHeart, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const XP_PER_LEVEL = 500;

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  const loadAll = async () => {
    if (!user) return;
    try {
      const [profRes, achRes, allAchRes, sessRes, fbRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id).order('earned_at', { ascending: false }),
        supabase.from('achievements').select('*').order('xp_reward'),
        supabase.from('gd_sessions').select('id, topic, status, created_at, is_multiplayer').or(`user_id.eq.${user.id},host_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(10),
        supabase.from('user_feedback').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      const p = profRes.data;
      if (p) {
        setDisplayName(p.display_name || '');
        setBio(p.bio || '');
        setAvatarUrl(p.avatar_url || '');
        setXp(p.xp || 0);
        setLevel(p.level || 1);
      }
      setAchievements(achRes.data || []);
      setAllAchievements(allAchRes.data || []);
      setSessions(sessRes.data || []);
      setFeedbackCount(fbRes.count || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large (max 5MB)', variant: 'destructive' }); return; }
    if (!['image/jpeg','image/png','image/gif','image/webp'].includes(file.type)) { toast({ title: 'Invalid image type', variant: 'destructive' }); return; }
    setUploading(true);
    const ext = file.type.split('/')[1];
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(publicUrl);
    setUploading(false);
    toast({ title: 'Avatar uploaded' });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, display_name: displayName, bio, avatar_url: avatarUrl, updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated' });
  };

  if (loading) return <ProfileSkeleton />;

  const xpProgress = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const earnedIds = new Set(achievements.map((a) => a.achievement_id));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold text-center">MY PROFILE</h1>
        </div>
      </header>

      <main className="container mx-auto p-8 max-w-4xl space-y-6">
        {/* Identity */}
        <Card className="p-8 border-4 border-border">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-32 h-32 border-4 border-border">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback><User className="w-16 h-16" /></AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-card hover:bg-accent text-sm">
                  <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Change'}
                </div>
                <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
              </Label>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="border-2" />
              </div>
              <div>
                <Label htmlFor="dn">Display Name</Label>
                <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="border-2" />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 300))} className="border-2 min-h-20" placeholder="A short intro…" />
              </div>
              <Button onClick={handleSave} className="border-4 border-border">SAVE PROFILE</Button>
            </div>
          </div>
        </Card>

        {/* XP & Level */}
        <Card className="p-6 border-4 border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">LEVEL {level}</h2>
            </div>
            <span className="font-mono">{xp} XP</span>
          </div>
          <Progress value={xpProgress} className="h-3 border-2 border-border" />
          <p className="text-xs text-muted-foreground text-right">
            {XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to level {level + 1}
          </p>
        </Card>

        {/* Achievements */}
        <Card className="p-6 border-4 border-border space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            <h2 className="text-xl font-bold">BADGES ({achievements.length}/{allAchievements.length})</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allAchievements.map((a) => {
              const earned = earnedIds.has(a.id);
              return (
                <div key={a.id} className={`p-3 border-2 border-border rounded text-center ${earned ? '' : 'opacity-40'}`}>
                  <div className="text-3xl">{a.icon || '🏆'}</div>
                  <p className="font-bold text-sm mt-1">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <Badge variant={earned ? 'default' : 'secondary'} className="mt-1 text-xs">
                    {earned ? 'EARNED' : `+${a.xp_reward} XP`}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent sessions */}
        <Card className="p-6 border-4 border-border space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6" />
            <h2 className="text-xl font-bold">RECENT SESSIONS</h2>
          </div>
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link key={s.id} to={`/home/session/${s.id}/report`} className="block p-3 border-2 border-border rounded hover:bg-accent">
                <div className="flex justify-between items-center">
                  <span className="font-bold truncate">{s.topic}</span>
                  <Badge variant="outline" className="ml-2">{s.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </Card>

        {/* Feedback */}
        <Card className="p-6 border-4 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="w-6 h-6" />
              <h2 className="text-xl font-bold">MY FEEDBACK</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{feedbackCount} submitted</span>
              <Link to="/home/feedback"><Button size="sm" variant="outline" className="border-2">VIEW ALL</Button></Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
