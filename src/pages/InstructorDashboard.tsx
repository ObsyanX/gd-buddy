import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import CreateMockDriveModal from '@/components/instructor/CreateMockDriveModal';
import {
  CohortPerformanceHeatmap,
  type StudentMetricRow,
} from '@/components/instructor/CohortPerformanceHeatmap';

import {
  Users,
  Plus,
  ClipboardCopy,
  UserPlus,
  BarChart3,
  Trash2,
  Play,
  RefreshCw,
  Target,
  TrendingUp,
  Activity,
  CalendarClock,
  ChevronRight,
  Loader2,
  Trophy,
  ClipboardCheck,
  X,
} from 'lucide-react';

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

interface MemberSession {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string;
}

interface MemberMetrics {
  session_id: string;
  fluency_score: number | null;
  content_score: number | null;
  structure_score: number | null;
  voice_score: number | null;
  filler_count: number | null;
  total_words: number | null;
  words_per_min: number | null;
}

const InstructorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] =
    useState<Cohort | null>(null);

  const [members, setMembers] = useState<CohortMember[]>([]);
  const [heatmapData, setHeatmapData] =
    useState<StudentMetricRow[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showMockDrive, setShowMockDrive] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingCohort, setDeletingCohort] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD COHORTS
   * ---------------------------------------------------------
   */

  const loadCohorts = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) {
        setCohorts([]);
        return;
      }

      const cohortsWithCounts = await Promise.all(
        data.map(async (cohort) => {
          const { count } = await supabase
            .from('cohort_members')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('cohort_id', cohort.id);

          return {
            ...cohort,
            member_count: count || 0,
          };
        })
      );

      setCohorts(cohortsWithCounts);

      /*
       * Keep currently selected cohort synchronized.
       */
      if (selectedCohort) {
        const refreshed = cohortsWithCounts.find(
          (c) => c.id === selectedCohort.id
        );

        if (refreshed) {
          setSelectedCohort(refreshed);
        }
      }
    } catch (error: any) {
      console.error('Error loading cohorts:', error);

      toast({
        title: 'Unable to load cohorts',
        description:
          error?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedCohort, toast]);

  useEffect(() => {
    if (user) {
      loadCohorts();
    }
  }, [user]);

  /*
   * ---------------------------------------------------------
   * CREATE COHORT
   * ---------------------------------------------------------
   */

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from('cohorts')
        .insert({
          name: newName.trim(),
          description: newDesc.trim() || null,
          instructor_id: user.id,
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Cohort created!',
        description: `${newName.trim()} is ready for candidates.`,
      });

      setShowCreate(false);
      setNewName('');
      setNewDesc('');

      await loadCohorts();
    } catch (error: any) {
      toast({
        title: 'Failed to create cohort',
        description:
          error?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD COHORT MEMBERS + REAL METRICS
   * ---------------------------------------------------------
   */

  const loadMembers = useCallback(
    async (cohort: Cohort) => {
      setSelectedCohort(cohort);
      setLoadingMembers(true);

      try {
        const { data: memberRows, error: memberError } =
          await supabase
            .from('cohort_members')
            .select('user_id, joined_at')
            .eq('cohort_id', cohort.id);

        if (memberError) {
          throw memberError;
        }

        if (!memberRows || memberRows.length === 0) {
          setMembers([]);
          setHeatmapData([]);
          return;
        }

        const userIds = memberRows.map(
          (member) => member.user_id
        );

        /*
         * Fetch profiles in one query.
         */
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(
          (profiles || []).map((profile) => [
            profile.id,
            profile,
          ])
        );

        /*
         * Fetch completed sessions for all cohort members
         * in one query.
         */
        const { data: sessions, error: sessionError } =
          await supabase
            .from('gd_sessions')
            .select(
              'id, user_id, status, created_at'
            )
            .in('user_id', userIds)
            .eq('status', 'completed');

        if (sessionError) {
          throw sessionError;
        }

        const memberSessions: MemberSession[] =
          sessions || [];

        const sessionIds = memberSessions.map(
          (session) => session.id
        );

        /*
         * Fetch metrics for all sessions in one query.
         */
        let metrics: MemberMetrics[] = [];

        if (sessionIds.length > 0) {
          const { data: metricRows, error: metricsError } =
            await supabase
              .from('gd_metrics')
              .select(
                `
                  session_id,
                  fluency_score,
                  content_score,
                  structure_score,
                  voice_score,
                  filler_count,
                  total_words,
                  words_per_min
                `
              )
              .in('session_id', sessionIds);

          if (metricsError) {
            throw metricsError;
          }

          metrics = metricRows || [];
        }

        const metricsBySession = new Map(
          metrics.map((metric) => [
            metric.session_id,
            metric,
          ])
        );

        /*
         * Group sessions by user.
         */
        const sessionsByUser = new Map<
          string,
          MemberSession[]
        >();

        for (const session of memberSessions) {
          const existing =
            sessionsByUser.get(session.user_id) || [];

          existing.push(session);
          sessionsByUser.set(
            session.user_id,
            existing
          );
        }

        /*
         * Group metrics by user.
         */
        const metricsByUser = new Map<
          string,
          MemberMetrics[]
        >();

        for (const session of memberSessions) {
          const metric = metricsBySession.get(
            session.id
          );

          if (!metric) continue;

          const existing =
            metricsByUser.get(session.user_id) || [];

          existing.push(metric);
          metricsByUser.set(
            session.user_id,
            existing
          );
        }

        /*
         * Build member cards.
         */
        const enrichedMembers: CohortMember[] =
          memberRows.map((member) => {
            const userSessions =
              sessionsByUser.get(member.user_id) || [];

            const userMetrics =
              metricsByUser.get(member.user_id) || [];

            const validScores = userMetrics
              .map((metric) => {
                const scores = [
                  metric.fluency_score,
                  metric.content_score,
                  metric.structure_score,
                  metric.voice_score,
                ].filter(
                  (score): score is number =>
                    typeof score === 'number'
                );

                if (scores.length === 0) {
                  return null;
                }

                return (
                  scores.reduce(
                    (sum, score) => sum + score,
                    0
                  ) / scores.length
                );
              })
              .filter(
                (score): score is number =>
                  typeof score === 'number'
              );

            const avgScore =
              validScores.length > 0
                ? Math.round(
                    validScores.reduce(
                      (sum, score) => sum + score,
                      0
                    ) / validScores.length
                  )
                : undefined;

            return {
              user_id: member.user_id,
              joined_at: member.joined_at,
              profile:
                profileMap.get(member.user_id) || undefined,
              session_count: userSessions.length,
              avg_score: avgScore,
            };
          });

        setMembers(enrichedMembers);

        /*
         * -----------------------------------------------------
         * BUILD HEATMAP DATA
         * -----------------------------------------------------
         *
         * These values come from actual gd_metrics.
         *
         * conclusionScore:
         * GD Buddy currently does not expose a dedicated
         * conclusion_score column in gd_metrics. We therefore
         * use structure_score as the closest existing
         * structural measure rather than inventing a score.
         *
         * fillerWordDensity:
         * filler_count / estimated speaking minutes.
         * When WPM is available:
         *
         *   minutes = total_words / words_per_min
         *
         * Otherwise the density remains 0 rather than inventing
         * a duration.
         */

        const heatmapRows: StudentMetricRow[] =
          memberRows.map((member) => {
            const userMetrics =
              metricsByUser.get(member.user_id) || [];

            const validMetrics = userMetrics.filter(
              (metric) =>
                metric.fluency_score != null ||
                metric.content_score != null ||
                metric.structure_score != null ||
                metric.voice_score != null
            );

            const averageMetric = (
              selector: (
                metric: MemberMetrics
              ) => number | null
            ) => {
              const values = validMetrics
                .map(selector)
                .filter(
                  (value): value is number =>
                    typeof value === 'number'
                );

              if (!values.length) return 0;

              return Math.round(
                values.reduce(
                  (sum, value) => sum + value,
                  0
                ) / values.length
              );
            };

            let totalFillers = 0;
            let totalSpeakingMinutes = 0;

            for (const metric of validMetrics) {
              const fillers =
                metric.filler_count || 0;

              const words =
                metric.total_words || 0;

              const wpm =
                metric.words_per_min || 0;

              totalFillers += fillers;

              if (words > 0 && wpm > 0) {
                totalSpeakingMinutes += words / wpm;
              }
            }

            const fillerDensity =
              totalSpeakingMinutes > 0
                ? Number(
                    (
                      totalFillers /
                      totalSpeakingMinutes
                    ).toFixed(2)
                  )
                : 0;

            return {
              userId: member.user_id,

              name:
                member.profile?.display_name ||
                'Anonymous',

              sessionsCompleted:
                validMetrics.length,

              contentScore: averageMetric(
                (metric) =>
                  metric.content_score
              ),

              fluencyScore: averageMetric(
                (metric) =>
                  metric.fluency_score
              ),

              structureScore: averageMetric(
                (metric) =>
                  metric.structure_score
              ),

              fillerWordDensity:
                fillerDensity,

              /*
               * There is currently no dedicated conclusion_score
               * in gd_metrics.
               *
               * Structure is used as the available structural
               * proxy. The heatmap should eventually receive
               * a real conclusion metric once that is persisted.
               */
              conclusionScore: averageMetric(
                (metric) =>
                  metric.structure_score
              ),
            };
          });

        setHeatmapData(heatmapRows);
      } catch (error: any) {
        console.error(
          'Error loading cohort analytics:',
          error
        );

        toast({
          title: 'Analytics could not be loaded',
          description:
            error?.message ||
            'Please try again.',
          variant: 'destructive',
        });

        setMembers([]);
        setHeatmapData([]);
      } finally {
        setLoadingMembers(false);
      }
    },
    [toast]
  );

  /*
   * ---------------------------------------------------------
   * DELETE COHORT
   * ---------------------------------------------------------
   */

  const handleDelete = async (cohortId: string) => {
    const confirmed = window.confirm(
      'Delete this cohort? This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeletingCohort(true);

    try {
      const { error } = await supabase
        .from('cohorts')
        .delete()
        .eq('id', cohortId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Cohort deleted',
      });

      setSelectedCohort(null);
      setMembers([]);
      setHeatmapData([]);

      await loadCohorts();
    } catch (error: any) {
      toast({
        title: 'Failed to delete cohort',
        description:
          error?.message ||
          'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCohort(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INVITE CODE
   * ---------------------------------------------------------
   */

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);

      toast({
        title: 'Invite code copied!',
        description: code,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description:
          'Please copy the invite code manually.',
        variant: 'destructive',
      });
    }
  };

  /*
   * ---------------------------------------------------------
   * DASHBOARD KPIs
   * ---------------------------------------------------------
   */

  const totalMembers = useMemo(
    () =>
      cohorts.reduce(
        (sum, cohort) =>
          sum + (cohort.member_count || 0),
        0
      ),
    [cohorts]
  );

  const totalSessions = useMemo(
    () =>
      members.reduce(
        (sum, member) =>
          sum + (member.session_count || 0),
        0
      ),
    [members]
  );

  const cohortAverage = useMemo(() => {
    const scores = members
      .map((member) => member.avg_score)
      .filter(
        (score): score is number =>
          typeof score === 'number'
      );

    if (!scores.length) return null;

    return Math.round(
      scores.reduce(
        (sum, score) => sum + score,
        0
      ) / scores.length
    );
  }, [members]);

  const activeLearners = useMemo(
    () =>
      members.filter(
        (member) =>
          (member.session_count || 0) > 0
      ).length,
    [members]
  );

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          LOADING INSTRUCTOR DASHBOARD...
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-background">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="border-b-4 border-border">
        <div className="container mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px]"
                >
                  INSTRUCTOR
                </Badge>

                <Badge
                  variant="secondary"
                  className="font-mono text-[10px]"
                >
                  GD BUDDY
                </Badge>
              </div>

              <h1 className="text-2xl md:text-3xl font-black mt-2">
                INSTRUCTOR DASHBOARD
              </h1>

              <p className="text-sm text-muted-foreground font-mono mt-1">
                Manage cohorts, run placement drives, and
                benchmark candidate performance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={loadCohorts}
                className="gap-2 border-2"
              >
                <RefreshCw className="w-4 h-4" />
                REFRESH
              </Button>

              <Button
                onClick={() => setShowCreate(true)}
                className="gap-2 border-2 border-border"
              >
                <Plus className="w-4 h-4" />
                NEW COHORT
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =====================================================
            GLOBAL KPI STRIP
            ===================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 border-2 border-border">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-primary" />

              <span className="text-[9px] font-mono text-muted-foreground">
                COHORTS
              </span>
            </div>

            <p className="text-3xl font-black mt-3">
              {cohorts.length}
            </p>

            <p className="text-xs text-muted-foreground">
              Training batches
            </p>
          </Card>

          <Card className="p-4 border-2 border-border">
            <div className="flex items-center justify-between">
              <UserPlus className="w-5 h-5 text-primary" />

              <span className="text-[9px] font-mono text-muted-foreground">
                LEARNERS
              </span>
            </div>

            <p className="text-3xl font-black mt-3">
              {selectedCohort
                ? members.length
                : totalMembers}
            </p>

            <p className="text-xs text-muted-foreground">
              {selectedCohort
                ? 'Selected cohort'
                : 'Across all cohorts'}
            </p>
          </Card>

          <Card className="p-4 border-2 border-border">
            <div className="flex items-center justify-between">
              <Activity className="w-5 h-5 text-primary" />

              <span className="text-[9px] font-mono text-muted-foreground">
                SESSIONS
              </span>
            </div>

            <p className="text-3xl font-black mt-3">
              {selectedCohort
                ? totalSessions
                : '—'}
            </p>

            <p className="text-xs text-muted-foreground">
              Completed GD sessions
            </p>
          </Card>

          <Card className="p-4 border-2 border-border">
            <div className="flex items-center justify-between">
              <Target className="w-5 h-5 text-primary" />

              <span className="text-[9px] font-mono text-muted-foreground">
                AVG SCORE
              </span>
            </div>

            <p className="text-3xl font-black mt-3">
              {cohortAverage !== null
                ? `${cohortAverage}%`
                : '—'}
            </p>

            <p className="text-xs text-muted-foreground">
              Selected cohort
            </p>
          </Card>
        </div>

        {/* =====================================================
            MAIN GRID
            ===================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* ===================================================
              COHORT LIST
              =================================================== */}

          <aside className="xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  YOUR COHORTS
                </h2>

                <p className="text-xs text-muted-foreground font-mono">
                  Select a cohort to inspect performance.
                </p>
              </div>

              <Badge
                variant="secondary"
                className="font-mono"
              >
                {cohorts.length}
              </Badge>
            </div>

            {cohorts.length === 0 ? (
              <Card className="p-8 border-2 border-border text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />

                <p className="font-semibold">
                  No cohorts yet
                </p>

                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Create your first cohort to start managing
                  candidates.
                </p>

                <Button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Cohort
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {cohorts.map((cohort) => {
                  const isSelected =
                    selectedCohort?.id === cohort.id;

                  return (
                    <Card
                      key={cohort.id}
                      className={`p-4 border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() =>
                        loadMembers(cohort)
                      }
                    >
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold truncate">
                              {cohort.name}
                            </h3>

                            {!cohort.is_active && (
                              <Badge
                                variant="outline"
                                className="text-[9px]"
                              >
                                INACTIVE
                              </Badge>
                            )}
                          </div>

                          {cohort.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {cohort.description}
                            </p>
                          )}
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected
                              ? 'rotate-90 text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          {cohort.member_count || 0}{' '}
                          members
                        </Badge>

                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="font-mono text-[9px]"
                          >
                            {cohort.invite_code}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              copyInviteCode(
                                cohort.invite_code
                              );
                            }}
                          >
                            <ClipboardCopy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ===================================================
              SELECTED COHORT
              =================================================== */}

          <section className="xl:col-span-8">
            {!selectedCohort ? (
              <Card className="p-12 border-2 border-border text-center min-h-[420px] flex flex-col items-center justify-center">
                <BarChart3 className="w-14 h-14 mb-4 text-muted-foreground" />

                <p className="text-xl font-bold">
                  Select a cohort
                </p>

                <p className="text-sm text-muted-foreground font-mono max-w-md mt-2">
                  View members, real GD metrics, placement
                  performance, and launch automated mock
                  drives.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Cohort header */}
                <Card className="p-5 border-2 border-border">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[9px]"
                        >
                          SELECTED COHORT
                        </Badge>

                        <Badge
                          variant={
                            selectedCohort.is_active
                              ? 'default'
                              : 'outline'
                          }
                          className="text-[9px]"
                        >
                          {selectedCohort.is_active
                            ? 'ACTIVE'
                            : 'INACTIVE'}
                        </Badge>
                      </div>

                      <h2 className="text-2xl font-black mt-2">
                        {selectedCohort.name}
                      </h2>

                      {selectedCohort.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedCohort.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          loadMembers(selectedCohort)
                        }
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={loadingMembers}
                      >
                        {loadingMembers ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        REFRESH DATA
                      </Button>

                      <Button
                        onClick={() =>
                          setShowMockDrive(true)
                        }
                        size="sm"
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        CREATE MOCK DRIVE
                      </Button>

                      <Button
                        onClick={() =>
                          handleDelete(
                            selectedCohort.id
                          )
                        }
                        variant="destructive"
                        size="sm"
                        disabled={deletingCohort}
                        className="gap-2"
                      >
                        {deletingCohort ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        DELETE
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* =================================================
                    COHORT PERFORMANCE SUMMARY
                    ================================================= */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-4 border-2 border-border">
                    <p className="text-[9px] uppercase font-mono text-muted-foreground">
                      MEMBERS
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {members.length}
                    </p>
                  </Card>

                  <Card className="p-4 border-2 border-border">
                    <p className="text-[9px] uppercase font-mono text-muted-foreground">
                      ACTIVE LEARNERS
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {activeLearners}
                    </p>
                  </Card>

                  <Card className="p-4 border-2 border-border">
                    <p className="text-[9px] uppercase font-mono text-muted-foreground">
                      SESSIONS
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {totalSessions}
                    </p>
                  </Card>

                  <Card className="p-4 border-2 border-border">
                    <p className="text-[9px] uppercase font-mono text-muted-foreground">
                      PLACEMENT AVG
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {cohortAverage !== null
                        ? `${cohortAverage}%`
                        : '—'}
                    </p>
                  </Card>
                </div>

                {/* =================================================
                    QUICK ACTIONS
                    ================================================= */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="p-4 border-2 border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Play className="w-4 h-4 text-primary" />
                      </div>

                      <div>
                        <p className="font-bold text-sm">
                          Mock Placement Drive
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          Launch a 6-seat AI-moderated
                          placement GD.
                        </p>

                        <Button
                          variant="link"
                          className="px-0 h-auto mt-2 text-xs"
                          onClick={() =>
                            setShowMockDrive(true)
                          }
                        >
                          Create drive →
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-2 border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Trophy className="w-4 h-4 text-primary" />
                      </div>

                      <div>
                        <p className="font-bold text-sm">
                          Placement Benchmark
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          Compare candidate performance
                          across communication dimensions.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-2 border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <ClipboardCheck className="w-4 h-4 text-primary" />
                      </div>

                      <div>
                        <p className="font-bold text-sm">
                          Invite Candidates
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          Share this cohort's invite
                          code with candidates.
                        </p>

                        <Button
                          variant="link"
                          className="px-0 h-auto mt-2 text-xs font-mono"
                          onClick={() =>
                            copyInviteCode(
                              selectedCohort.invite_code
                            )
                          }
                        >
                          {selectedCohort.invite_code} →
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* =================================================
                    PERFORMANCE HEATMAP
                    ================================================= */}

                {loadingMembers ? (
                  <Card className="p-12 border-2 border-border flex items-center justify-center">
                    <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      ANALYZING COHORT PERFORMANCE...
                    </div>
                  </Card>
                ) : (
                  <CohortPerformanceHeatmap
                    cohortName={selectedCohort.name}
                    data={heatmapData}
                  />
                )}

                {/* =================================================
                    CANDIDATE LIST
                    ================================================= */}

                <Card className="p-5 border-2 border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black">
                        CANDIDATE ROSTER
                      </h3>

                      <p className="text-xs text-muted-foreground font-mono">
                        Individual participation and performance
                      </p>
                    </div>

                    <Badge
                      variant="secondary"
                      className="font-mono"
                    >
                      {members.length}
                    </Badge>
                  </div>

                  {members.length === 0 ? (
                    <div className="py-10 text-center">
                      <UserPlus className="w-9 h-9 mx-auto mb-3 text-muted-foreground" />

                      <p className="font-semibold">
                        No candidates yet
                      </p>

                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Share invite code{' '}
                        <strong>
                          {selectedCohort.invite_code}
                        </strong>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <Card
                          key={member.user_id}
                          className="p-3 border border-border"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {member.profile
                                ?.avatar_url ? (
                                <img
                                  src={
                                    member.profile
                                      .avatar_url
                                  }
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="font-bold truncate">
                                  {member.profile
                                    ?.display_name ||
                                    'Anonymous'}
                                </p>

                                <p className="text-[10px] text-muted-foreground font-mono">
                                  Joined{' '}
                                  {new Date(
                                    member.joined_at
                                  ).toLocaleDateString(
                                    'en-IN'
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5 text-center">
                              <div>
                                <p className="font-black text-lg">
                                  {member.session_count ||
                                    0}
                                </p>

                                <p className="text-[9px] uppercase text-muted-foreground font-mono">
                                  Sessions
                                </p>
                              </div>

                              <div>
                                <p className="font-black text-lg">
                                  {member.avg_score != null
                                    ? `${member.avg_score}%`
                                    : '—'}
                                </p>

                                <p className="text-[9px] uppercase text-muted-foreground font-mono">
                                  Avg Score
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =======================================================
          CREATE COHORT DIALOG
          ======================================================= */}

      <Dialog
        open={showCreate}
        onOpenChange={setShowCreate}
      >
        <DialogContent className="border-4 border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              CREATE NEW COHORT
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cohortName">
                Cohort Name
              </Label>

              <Input
                id="cohortName"
                value={newName}
                onChange={(event) =>
                  setNewName(event.target.value)
                }
                placeholder="e.g., MBA Batch 2026"
                className="border-2"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cohortDesc">
                Description
              </Label>

              <Textarea
                id="cohortDesc"
                value={newDesc}
                onChange={(event) =>
                  setNewDesc(event.target.value)
                }
                placeholder="Brief description of this cohort"
                className="border-2 min-h-[100px]"
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
                setNewDesc('');
              }}
            >
              CANCEL
            </Button>

            <Button
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              CREATE COHORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =======================================================
          MOCK DRIVE MODAL
          ======================================================= */}

      {selectedCohort && (
        <CreateMockDriveModal
          isOpen={showMockDrive}
          cohortId={selectedCohort.id}
          cohortName={selectedCohort.name}
          onClose={() => setShowMockDrive(false)}
        />
      )}
    </div>
  );
};

export default InstructorDashboard;
