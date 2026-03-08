import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Star, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RankingEntry {
  id: string;
  user_id: string;
  elo_rating: number;
  tier: string;
  wins: number;
  losses: number;
  total_matches: number;
  best_rating: number;
  display_name?: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: any; minRating: number }> = {
  bronze: { label: 'Bronze', color: 'text-orange-600', icon: Medal, minRating: 0 },
  silver: { label: 'Silver', color: 'text-muted-foreground', icon: Medal, minRating: 1200 },
  gold: { label: 'Gold', color: 'text-yellow-500', icon: Trophy, minRating: 1500 },
  platinum: { label: 'Platinum', color: 'text-cyan-400', icon: Crown, minRating: 1800 },
  diamond: { label: 'Diamond', color: 'text-blue-400', icon: Star, minRating: 2100 },
};

export function getTierForRating(rating: number): string {
  if (rating >= 2100) return 'diamond';
  if (rating >= 1800) return 'platinum';
  if (rating >= 1500) return 'gold';
  if (rating >= 1200) return 'silver';
  return 'bronze';
}

export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  won: boolean,
  kFactor: number = 32
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = won ? 1 : 0;
  return Math.round(kFactor * (actual - expected));
}

export async function ensureRankingExists(userId: string) {
  const { data } = await (supabase as any)
    .from('user_rankings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    await (supabase as any)
      .from('user_rankings')
      .insert({ user_id: userId });
  }
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch top 20 rankings
      const { data: rankingsData, error } = await (supabase as any)
        .from('user_rankings')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch display names for these users
      const userIds = (rankingsData || []).map((r: any) => r.user_id);
      let profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map(p => [p.id, p.display_name || 'Anonymous'])
          );
        }
      }

      const enriched: RankingEntry[] = (rankingsData || []).map((r: any) => ({
        ...r,
        display_name: profilesMap[r.user_id] || 'Anonymous',
      }));

      setRankings(enriched);

      // Find current user's rank
      if (user) {
        const idx = enriched.findIndex(r => r.user_id === user.id);
        setUserRank(idx >= 0 ? idx + 1 : null);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading leaderboard...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5" />
          LEADERBOARD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {rankings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No rankings yet. Complete multiplayer sessions to appear here!
          </p>
        ) : (
          <>
            {rankings.map((entry, idx) => {
              const tier = TIER_CONFIG[entry.tier] || TIER_CONFIG.bronze;
              const TierIcon = tier.icon;
              const isCurrentUser = user?.id === entry.user_id;
              const rank = idx + 1;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30'
                  }`}
                >
                  <span className={`w-6 text-center font-bold text-sm ${
                    rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-muted-foreground' : rank === 3 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                  </span>
                  <div className="w-6 h-6 rounded border border-border flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {isCurrentUser ? 'You' : entry.display_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <TierIcon className={`w-3 h-3 ${tier.color}`} />
                      <span className={`text-[10px] font-bold ${tier.color}`}>{tier.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm tabular-nums">{entry.elo_rating}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.wins}W / {entry.losses}L
                    </p>
                  </div>
                </div>
              );
            })}

            {userRank && userRank > 20 && (
              <div className="pt-2 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Your rank: <span className="font-bold">#{userRank}</span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
