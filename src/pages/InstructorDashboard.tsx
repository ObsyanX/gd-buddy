import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, ClipboardCopy, UserPlus, BarChart3, Trash2 } from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

interface CohortMember {
  user_id: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  session_count?: number;
  avg_score?: number;
}

const InstructorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadCohorts();
  }, [user]);

  const loadCohorts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cohorts')
      .select('*')
      .eq('instructor_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      // Get member counts
      const cohortsWithCounts = await Promise.all(
        data.map(async (c) => {
          const { count } = await supabase
            .from('cohort_members')
            .select('*', { count: 'exact', head: true })
            .eq('cohort_id', c.id);
          return { ...c, member_count: count || 0 };
        })
      );
      setCohorts(cohortsWithCounts);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('cohorts').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      instructor_id: user!.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cohort created!' });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      loadCohorts();
    }
  };

  const loadMembers = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    const { data } = await supabase
      .from('cohort_members')
      .select('user_id, joined_at')
      .eq('cohort_id', cohort.id);

    if (data) {
      // Enrich with profiles and session stats
      const enriched = await Promise.all(
        data.map(async (m) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', m.user_id)
            .single();

          const { count: sessionCount } = await supabase
            .from('gd_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', m.user_id)
            .eq('status', 'completed');

          const { data: metrics } = await supabase
            .from('gd_metrics')
            .select('content_score, fluency_score, structure_score')
            .in('session_id', 
              (await supabase.from('gd_sessions').select('id').eq('user_id', m.user_id)).data?.map(s => s.id) || []
            );

          const scores = metrics?.filter(m => m.content_score != null) || [];
          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + ((s.content_score || 0) + (s.fluency_score || 0) + (s.structure_score || 0)) / 3, 0) / scores.length)
            : undefined;

          return {
            ...m,
            profile: profile || undefined,
            session_count: sessionCount || 0,
            avg_score: avgScore,
          };
        })
      );
      setMembers(enriched);
    }
  };

  const handleDelete = async (cohortId: string) => {
    const { error } = await supabase.from('cohorts').delete().eq('id', cohortId);
    if (!error) {
      toast({ title: 'Cohort deleted' });
      setSelectedCohort(null);
      loadCohorts();
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Invite code copied!' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl font-mono">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">INSTRUCTOR DASHBOARD</h1>
          <Button onClick={() => setShowCreate(true)} className="border-4 border-border">
            <Plus className="w-4 h-4 mr-2" /> NEW COHORT
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cohorts List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5" /> YOUR COHORTS
            </h2>
            {cohorts.length === 0 ? (
              <Card className="p-6 border-4 border-border text-center">
                <p className="text-muted-foreground font-mono">No cohorts yet. Create one to get started!</p>
              </Card>
            ) : (
              cohorts.map((cohort) => (
                <Card
                  key={cohort.id}
                  className={`p-4 border-4 cursor-pointer transition-all ${
                    selectedCohort?.id === cohort.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => loadMembers(cohort)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{cohort.name}</h3>
                      {cohort.description && (
                        <p className="text-sm text-muted-foreground mt-1">{cohort.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {cohort.member_count} members
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      Code: {cohort.invite_code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); copyInviteCode(cohort.invite_code); }}
                    >
                      <ClipboardCopy className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Cohort Details & Members */}
          <div className="lg:col-span-2">
            {selectedCohort ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{selectedCohort.name} — MEMBERS</h2>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(selectedCohort.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> DELETE
                  </Button>
                </div>

                {/* Batch Analytics Summary */}
                <Card className="p-4 border-4 border-border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{members.length}</p>
                      <p className="text-xs text-muted-foreground font-mono">TOTAL MEMBERS</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {members.reduce((sum, m) => sum + (m.session_count || 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">TOTAL SESSIONS</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {members.filter(m => m.avg_score).length > 0
                          ? Math.round(members.reduce((sum, m) => sum + (m.avg_score || 0), 0) / members.filter(m => m.avg_score).length)
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">AVG SCORE</p>
                    </div>
                  </div>
                </Card>

                {/* Member List */}
                {members.length === 0 ? (
                  <Card className="p-6 border-4 border-border text-center">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground font-mono">
                      No members yet. Share invite code: <strong>{selectedCohort.invite_code}</strong>
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <Card key={member.user_id} className="p-4 border-2 border-border">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold">{member.profile?.display_name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div>
                              <p className="font-bold text-lg">{member.session_count || 0}</p>
                              <p className="text-xs text-muted-foreground">Sessions</p>
                            </div>
                            <div>
                              <p className="font-bold text-lg">{member.avg_score ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">Avg Score</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-12 border-4 border-border text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground font-mono">
                  Select a cohort to view members and analytics
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Create Cohort Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-4 border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">CREATE NEW COHORT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cohortName">Cohort Name</Label>
              <Input
                id="cohortName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., MBA Batch 2025"
                className="border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cohortDesc">Description (optional)</Label>
              <Textarea
                id="cohortDesc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of this cohort"
                className="border-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>CREATE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorDashboard;
