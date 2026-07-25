// Cross-platform share helpers.
// Tries the native Web Share API first (opens the OS share sheet on mobile),
// otherwise callers can render a fallback UI that opens each target URL.

export type ShareTarget =
  | "whatsapp"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "telegram"
  | "email"
  | "sms"
  | "copy";

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

export function buildTargetUrl(target: ShareTarget, c: ShareContent): string {
  const url = encodeURIComponent(c.url);
  const text = encodeURIComponent(c.text);
  const title = encodeURIComponent(c.title);
  const combined = encodeURIComponent(`${c.text} ${c.url}`);
  switch (target) {
    case "whatsapp":
      return `https://wa.me/?text=${combined}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "telegram":
      return `https://t.me/share/url?url=${url}&text=${text}`;
    case "email":
      return `mailto:?subject=${title}&body=${combined}`;
    case "sms":
      return `sms:?&body=${combined}`;
    case "copy":
      return c.url;
  }
}

export async function tryNativeShare(c: ShareContent): Promise<boolean> {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;
  try {
    await (navigator as Navigator & { share: (d: ShareContent) => Promise<void> }).share({
      title: c.title,
      text: c.text,
      url: c.url,
    });
    return true;
  } catch {
    // User cancelled or share failed — caller can fall back to custom sheet.
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
