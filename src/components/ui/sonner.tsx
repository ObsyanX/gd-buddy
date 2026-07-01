import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      offset={16}
      gap={10}
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: [
            "group toast pointer-events-auto",
            "glass-3 elev-copper !border-hidden",
            "group-[.toaster]:text-foreground",
            "rounded-xl p-4",
          ].join(" "),
          title: "font-medium text-sm text-foreground",
          description: "group-[.toast]:text-muted-foreground text-[13px]",
          actionButton:
            "group-[.toast]:bg-gradient-copper group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:h-8",
          cancelButton:
            "group-[.toast]:bg-muted/40 group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
          closeButton:
            "group-[.toast]:bg-background/60 group-[.toast]:border group-[.toast]:border-border/60 group-[.toast]:text-foreground",
          success: "group-[.toaster]:text-emerald-400 [&_[data-icon]]:text-emerald-400",
          error: "group-[.toaster]:text-destructive [&_[data-icon]]:text-destructive",
          warning: "group-[.toaster]:text-amber-400 [&_[data-icon]]:text-amber-400",
          info: "group-[.toaster]:text-primary [&_[data-icon]]:text-primary",
          loader: "group-[.toast]:text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
