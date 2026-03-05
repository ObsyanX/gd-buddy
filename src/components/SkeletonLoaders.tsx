import { Skeleton } from "@/components/ui/skeleton";

/** Home page skeleton — hero title, 3 feature cards, CTA buttons, how-it-works, resources */
export const HomeSkeleton = () => (
  <div className="flex-1 container mx-auto py-12 px-6">
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-96 mx-auto" />
        <Skeleton className="h-6 w-80 mx-auto" />
      </div>
      {/* 3 feature cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border-4 border-border space-y-3">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      {/* CTA buttons */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-16 w-52" />
        <Skeleton className="h-16 w-52" />
      </div>
      {/* How it works */}
      <div className="border-4 border-border p-8 space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** Dashboard skeleton — welcome bar, 4 stat cards, 3 action cards, tabs */
export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col">
    {/* Header */}
    <div className="border-b-4 border-border p-6">
      <div className="container mx-auto flex items-center justify-center">
        <Skeleton className="h-8 w-64" />
      </div>
    </div>
    <main className="flex-1 container mx-auto py-8 px-6 space-y-8">
      {/* 4 stat cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border-4 border-border space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      {/* 3 action cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border-4 border-border space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-6" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      {/* Tabs placeholder */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-6 border-4 border-border space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

/** Profile page skeleton — header, avatar, form fields, save button */
export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b-4 border-border p-4">
      <div className="container mx-auto">
        <Skeleton className="h-10 w-48 mx-auto" />
      </div>
    </header>
    <main className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto p-8 border-4 border-border space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-3 w-40" />
        </div>
        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </main>
  </div>
);

/** Settings page skeleton — header, voice card, mic card, save, shortcuts */
export const SettingsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b-4 border-border p-4">
      <div className="container mx-auto">
        <Skeleton className="h-10 w-36 mx-auto" />
      </div>
    </header>
    <main className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Voice card */}
        <div className="p-6 border-4 border-border space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-7 w-52" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        {/* Mic card */}
        <div className="p-6 border-4 border-border space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-7 w-56" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        {/* Shortcuts */}
        <div className="p-6 border-4 border-border space-y-4">
          <Skeleton className="h-7 w-52" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 border-2 border-border">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  </div>
);

/** Drills page skeleton — title, 8 drill cards grid */
export const DrillsSkeleton = () => (
  <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
    <div className="container mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <div>
          <Skeleton className="h-9 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 sm:p-4 lg:p-5 border-2 sm:border-3 lg:border-4 border-border space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Practice / Topic selection skeleton */
export const PracticeSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-6">
    <div className="container mx-auto max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-9 w-56 mx-auto" />
        <Skeleton className="h-5 w-80 mx-auto" />
      </div>
      {/* Category tabs */}
      <Skeleton className="h-10 w-full max-w-lg mx-auto" />
      {/* Topic cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border-2 border-border space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Session skeleton */
export const SessionSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-4">
    <Skeleton className="h-8 w-56" />
    <div className="border-4 border-border p-4 space-y-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-10 w-28" />
    </div>
  </div>
);

/** Generic page skeleton fallback */
export const PageSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-2 border-border p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-28 mt-2" />
        </div>
      ))}
    </div>
  </div>
);
