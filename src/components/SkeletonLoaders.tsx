import { Skeleton } from "@/components/ui/skeleton";

/** Full-page skeleton used as Suspense fallback for lazy routes */
export const PageSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
    {/* Page title */}
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />

    {/* Card grid */}
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

/** Dashboard-style skeleton with stats + chart */
export const DashboardSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
    <Skeleton className="h-8 w-40" />
    {/* Stat cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-2 border-border p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    {/* Chart placeholder */}
    <div className="border-2 border-border p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

/** Profile/Settings skeleton */
export const FormSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 max-w-2xl space-y-6 animate-in fade-in duration-300">
    <Skeleton className="h-8 w-36" />
    <div className="border-2 border-border p-6 space-y-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32 mt-2" />
    </div>
  </div>
);

/** Session/Practice skeleton */
export const SessionSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-4 animate-in fade-in duration-300">
    <Skeleton className="h-8 w-56" />
    <div className="border-2 border-border p-4 space-y-3">
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
