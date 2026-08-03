/** Shared helpers for inviting users to the GD Buddy feedback form. */
export const FEEDBACK_FORM_PATH = "/home/feedback/new";

export function feedbackFormUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://gdbuddy.lovable.app";
  return `${origin}${FEEDBACK_FORM_PATH}`;
}

/** Opens the admin's mail client with a pre-filled feedback request. */
export function openFeedbackInviteMail(to: string, name?: string | null) {
  const url = feedbackFormUrl();
  const subject = encodeURIComponent("Quick favour: share your GD Buddy feedback");
  const body = encodeURIComponent(
    `Hi ${name || "there"},\n\nThanks for using GD Buddy! We'd love to hear how your practice sessions are going.\n\n` +
      `It takes under a minute: ${url}\n\nYour ratings and comments go straight to our team and shape what we build next.\n\n— The GD Buddy team`,
  );
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}
