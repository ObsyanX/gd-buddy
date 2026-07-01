import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva(
  "relative overflow-hidden bg-muted/60",
  {
    variants: {
      shape: {
        rect: "rounded-md",
        pill: "rounded-full",
        circle: "rounded-full aspect-square",
        text: "rounded h-3",
      },
      shimmer: {
        true: "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent before:animate-[shimmer_1.8s_ease-in-out_infinite]",
        false: "animate-pulse",
      },
    },
    defaultVariants: { shape: "rect", shimmer: true },
  },
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, shape, shimmer, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(skeletonVariants({ shape, shimmer }), className)}
      {...props}
    />
  );
}

export { Skeleton, skeletonVariants };
