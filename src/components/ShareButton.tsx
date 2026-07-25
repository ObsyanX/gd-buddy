import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageSquare,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  buildTargetUrl,
  copyToClipboard,
  tryNativeShare,
  type ShareContent,
  type ShareTarget,
} from "@/lib/share";

interface ShareButtonProps {
  content: ShareContent;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

// Inline WhatsApp glyph — lucide doesn't ship one.
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .17 5.32.17 11.87c0 2.09.55 4.13 1.6 5.93L0 24l6.35-1.66a11.9 11.9 0 0 0 5.7 1.45h.01c6.55 0 11.88-5.33 11.88-11.87 0-3.17-1.24-6.15-3.42-8.44ZM12.06 21.5h-.01a9.6 9.6 0 0 1-4.9-1.34l-.35-.21-3.77.99 1-3.67-.23-.38a9.6 9.6 0 0 1-1.47-5.02c0-5.31 4.32-9.63 9.64-9.63 2.57 0 4.99 1 6.81 2.82a9.55 9.55 0 0 1 2.82 6.82c0 5.32-4.32 9.63-9.63 9.63Zm5.28-7.21c-.29-.15-1.71-.85-1.98-.94-.27-.1-.46-.15-.66.14-.19.29-.75.94-.92 1.13-.17.19-.34.22-.63.07-.29-.14-1.22-.45-2.32-1.43-.86-.77-1.44-1.71-1.61-2-.17-.29-.02-.44.13-.59.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5l-.56-.01c-.19 0-.5.07-.77.36s-1.02 1-1.02 2.44 1.05 2.83 1.19 3.03c.14.19 2.06 3.14 5 4.4.7.3 1.25.48 1.67.62.7.22 1.34.19 1.85.12.56-.09 1.71-.7 1.96-1.37.24-.68.24-1.26.17-1.37-.07-.11-.26-.19-.55-.34Z" />
  </svg>
);

const TARGETS: {
  id: ShareTarget;
  label: string;
  color: string;
  icon: (p: { className?: string }) => ReactNode;
}[] = [
  { id: "whatsapp", label: "WhatsApp", color: "text-[#25D366]", icon: ({ className }) => <WhatsAppIcon className={className} /> },
  { id: "facebook", label: "Facebook", color: "text-[#1877F2]", icon: ({ className }) => <Facebook className={className} /> },
  { id: "twitter", label: "X / Twitter", color: "text-foreground", icon: ({ className }) => <Twitter className={className} /> },
  { id: "linkedin", label: "LinkedIn", color: "text-[#0A66C2]", icon: ({ className }) => <Linkedin className={className} /> },
  { id: "telegram", label: "Telegram", color: "text-[#229ED9]", icon: ({ className }) => <Send className={className} /> },
  { id: "sms", label: "SMS", color: "text-foreground", icon: ({ className }) => <MessageSquare className={className} /> },
  { id: "email", label: "Email", color: "text-foreground", icon: ({ className }) => <Mail className={className} /> },
];

export function ShareButton({
  content,
  label = "Share",
  variant = "outline",
  size = "sm",
  className,
  icon,
  fullWidth,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    const used = await tryNativeShare(content);
    if (!used) setOpen(true);
  };

  const openTarget = (t: ShareTarget) => {
    const href = buildTargetUrl(t, content);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(content.url);
    if (ok) {
      setCopied(true);
      toast({ title: "Link copied", description: "Paste it anywhere to share." });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`${fullWidth ? "w-full " : ""}border-2 ${className ?? ""}`}
      >
        {icon ?? <Share2 className="w-4 h-4 mr-2" />}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription className="line-clamp-2">{content.text}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 py-2">
            {TARGETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTarget(t.id)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 border-border hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-[72px]"
                aria-label={`Share via ${t.label}`}
              >
                <t.icon className={`w-6 h-6 ${t.color}`} />
                <span className="text-[11px] font-medium text-center leading-tight">
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Input readOnly value={content.url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" size="icon" variant="outline" onClick={handleCopy} className="shrink-0 border-2" aria-label="Copy link">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShareButton;
