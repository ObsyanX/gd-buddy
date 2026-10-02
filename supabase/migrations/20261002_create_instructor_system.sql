-- ============================================================
-- GD Buddy - Instructor / Cohort / Mock Drive System
-- ============================================================

-- ------------------------------------------------------------
-- 1. COHORTS
-- ------------------------------------------------------------

create table if not exists public.instructor_cohorts (
  id uuid primary key default gen_random_uuid(),

  instructor_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,
  description text,

  status text not null default 'active'
    check (status in ('active', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. COHORT MEMBERS
-- ------------------------------------------------------------

create table if not exists public.instructor_cohort_members (
  id uuid primary key default gen_random_uuid(),

  cohort_id uuid not null
    references public.instructor_cohorts(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  joined_at timestamptz not null default now(),

  -- A student can only belong to a cohort once.
  unique (cohort_id, user_id)
);


-- ------------------------------------------------------------
-- 3. MOCK DRIVES
-- ------------------------------------------------------------

create table if not exists public.mock_drives (
  id uuid primary key default gen_random_uuid(),

  cohort_id uuid not null
    references public.instructor_cohorts(id)
    on delete cascade,

  instructor_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,
  topic text not null,

  description text,

  track text default 'general'
    check (
      track in (
        'consulting',
        'it_services',
        'bschool',
        'tech_startup',
        'general'
      )
    ),

  scheduled_at timestamptz,

  duration_minutes integer not null default 15
    check (duration_minutes > 0 and duration_minutes <= 180),

  max_participants integer
    check (
      max_participants is null
      or max_participants > 0
    ),

  status text not null default 'scheduled'
    check (
      status in (
        'draft',
        'scheduled',
        'live',
        'completed',
        'cancelled'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------

create index if not exists idx_instructor_cohorts_instructor
  on public.instructor_cohorts(instructor_id);

create index if not exists idx_cohort_members_cohort
  on public.instructor_cohort_members(cohort_id);

create index if not exists idx_cohort_members_user
  on public.instructor_cohort_members(user_id);

create index if not exists idx_mock_drives_cohort
  on public.mock_drives(cohort_id);

create index if not exists idx_mock_drives_instructor
  on public.mock_drives(instructor_id);

create index if not exists idx_mock_drives_scheduled
  on public.mock_drives(scheduled_at);


-- ------------------------------------------------------------
-- 5. UPDATED_AT TRIGGER
-- ------------------------------------------------------------

create or replace function public.update_instructor_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists instructor_cohorts_updated_at
on public.instructor_cohorts;

create trigger instructor_cohorts_updated_at
before update on public.instructor_cohorts
for each row
execute function public.update_instructor_updated_at();


drop trigger if exists mock_drives_updated_at
on public.mock_drives;

create trigger mock_drives_updated_at
before update on public.mock_drives
for each row
execute function public.update_instructor_updated_at();


-- ------------------------------------------------------------
-- 6. ENABLE RLS
-- ------------------------------------------------------------

alter table public.instructor_cohorts enable row level security;
alter table public.instructor_cohort_members enable row level security;
alter table public.mock_drives enable row level security;


-- ============================================================
-- 7. COHORT POLICIES
-- ============================================================

-- Instructor can see cohorts they own.
create policy "instructors can view own cohorts"
on public.instructor_cohorts
for select
to authenticated
using (
  instructor_id = auth.uid()
);


-- Students can see cohorts they belong to.
create policy "members can view their cohorts"
on public.instructor_cohorts
for select
to authenticated
using (
  exists (
    select 1
    from public.instructor_cohort_members m
    where m.cohort_id = instructor_cohorts.id
      and m.user_id = auth.uid()
  )
);


-- Instructor can create their own cohort.
create policy "instructors can create cohorts"
on public.instructor_cohorts
for insert
to authenticated
with check (
  instructor_id = auth.uid()
);


-- Instructor can update their own cohort.
create policy "instructors can update own cohorts"
on public.instructor_cohorts
for update
to authenticated
using (
  instructor_id = auth.uid()
)
with check (
  instructor_id = auth.uid()
);


-- Instructor can delete their own cohort.
create policy "instructors can delete own cohorts"
on public.instructor_cohorts
for delete
to authenticated
using (
  instructor_id = auth.uid()
);


-- ============================================================
-- 8. COHORT MEMBER POLICIES
-- ============================================================

-- Instructor can see members of their cohorts.
create policy "instructors can view cohort members"
on public.instructor_cohort_members
for select
to authenticated
using (
  exists (
    select 1
    from public.instructor_cohorts c
    where c.id = instructor_cohort_members.cohort_id
      and c.instructor_id = auth.uid()
  )
);


-- Student can see their own membership.
create policy "members can view own membership"
on public.instructor_cohort_members
for select
to authenticated
using (
  user_id = auth.uid()
);


-- Instructor can add students to their cohort.
create policy "instructors can add cohort members"
on public.instructor_cohort_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.instructor_cohorts c
    where c.id = instructor_cohort_members.cohort_id
      and c.instructor_id = auth.uid()
  )
);


-- Instructor can remove students from their cohort.
create policy "instructors can remove cohort members"
on public.instructor_cohort_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.instructor_cohorts c
    where c.id = instructor_cohort_members.cohort_id
      and c.instructor_id = auth.uid()
  )
);


-- ============================================================
-- 9. MOCK DRIVE POLICIES
-- ============================================================

-- Instructor can view drives they created.
create policy "instructors can view own mock drives"
on public.mock_drives
for select
to authenticated
using (
  instructor_id = auth.uid()
);


-- Students can view mock drives belonging to their cohort.
create policy "members can view cohort mock drives"
on public.mock_drives
for select
to authenticated
using (
  exists (
    select 1
    from public.instructor_cohort_members m
    where m.cohort_id = mock_drives.cohort_id
      and m.user_id = auth.uid()
  )
);


-- Instructor can create drives for their own cohort.
create policy "instructors can create mock drives"
on public.mock_drives
for insert
to authenticated
with check (
  instructor_id = auth.uid()
  and exists (
    select 1
    from public.instructor_cohorts c
    where c.id = mock_drives.cohort_id
      and c.instructor_id = auth.uid()
  )
);


-- Instructor can update their own drives.
create policy "instructors can update own mock drives"
on public.mock_drives
for update
to authenticated
using (
  instructor_id = auth.uid()
)
with check (
  instructor_id = auth.uid()
  and exists (
    select 1
    from public.instructor_cohorts c
    where c.id = mock_drives.cohort_id
      and c.instructor_id = auth.uid()
  )
);


-- Instructor can delete their own drives.
create policy "instructors can delete own mock drives"
on public.mock_drives
for delete
to authenticated
using (
  instructor_id = auth.uid()
);


-- ============================================================
-- 10. HELPFUL COMMENTS
-- ============================================================

comment on table public.instructor_cohorts is
'Instructor-created GD Buddy student cohorts/classes.';

comment on table public.instructor_cohort_members is
'Maps authenticated GD Buddy users to instructor cohorts.';

comment on table public.mock_drives is
'Scheduled instructor-led GD mock drives for a cohort.';

comment on column public.mock_drives.track is
'Placement simulation track: consulting, IT services, B-school, tech startup, or general.';
