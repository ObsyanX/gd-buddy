import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const JoinCohort = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setJoining(true);

    try {
      // Find cohort by invite code
      const { data: cohort, error: findErr } = await supabase
        .from('cohorts')
        .select('id, name')
        .eq('invite_code', code.trim().toLowerCase())
        .eq('is_active', true)
        .single();

      if (findErr || !cohort) {
        toast({ title: 'Invalid code', description: 'No active cohort found with this invite code.', variant: 'destructive' });
        setJoining(false);
        return;
      }

      // Join
      const { error: joinErr } = await supabase.from('cohort_members').insert({
        cohort_id: cohort.id,
        user_id: user.id,
      });

      if (joinErr) {
        if (joinErr.code === '23505') {
          toast({ title: 'Already joined', description: `You're already a member of ${cohort.name}.` });
        } else {
          toast({ title: 'Error', description: joinErr.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Joined!', description: `You've joined ${cohort.name} successfully.` });
        setCode('');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    }
    setJoining(false);
  };

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        <h3 className="text-lg font-bold">JOIN A COHORT</h3>
      </div>
      <p className="text-sm text-muted-foreground">Enter an invite code from your instructor to join their cohort.</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter invite code"
          className="border-2 font-mono"
        />
        <Button onClick={handleJoin} disabled={joining || !code.trim()}>
          {joining ? 'JOINING...' : 'JOIN'}
        </Button>
      </div>
    </Card>
  );
};

export default JoinCohort;
