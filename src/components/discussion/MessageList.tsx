import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Volume2, Bot, User, ArrowDown } from "lucide-react";

interface MessageListProps {
  messages: any[];
  currentUserId: string | null;
  isSpeaking: boolean;
  currentSpeaker: string | null;
}

const NEAR_BOTTOM_THRESHOLD = 80; // px

const MessageList = ({ messages, currentUserId, isSpeaking, currentSpeaker }: MessageListProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [unread, setUnread] = useState(0);

  // Resolve the Radix ScrollArea viewport once
  const getViewport = useCallback(() => {
    if (!viewportRef.current && rootRef.current) {
      viewportRef.current = rootRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLDivElement | null;
    }
    return viewportRef.current;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const vp = getViewport();
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    isNearBottomRef.current = true;
    setShowJump(false);
    setUnread(0);
  }, [getViewport]);

  // Track scroll position within viewport only (never touches window)
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    const onScroll = () => {
      const distanceFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      const near = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
      isNearBottomRef.current = near;
      if (near) {
        setShowJump(false);
        setUnread(0);
      }
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => vp.removeEventListener("scroll", onScroll);
  }, [getViewport]);

  // On new messages: auto-scroll only when near bottom, else surface the jump button
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    if (isNearBottomRef.current) {
      // Scoped scroll — never uses scrollIntoView, so the page/window never moves
      vp.scrollTop = vp.scrollHeight;
    } else {
      setShowJump(true);
      setUnread((n) => n + 1);
    }
  }, [messages, getViewport]);

  return (
    <Card className="relative border-2 sm:border-3 lg:border-4 border-border h-[50dvh] min-h-[50dvh] flex-none sm:h-auto sm:flex-1 sm:min-h-0 overflow-hidden flex flex-col">
      <div ref={rootRef} className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="chat-scroll-panel flex-1 min-h-0">
          <div className="space-y-2 sm:space-y-3 lg:space-y-4 p-2 sm:p-3 lg:p-4 pr-3 sm:pr-4 lg:pr-5">
            {messages.map((message, index) => {
              const messageParticipant = message.gd_participants;
              const isFromCurrentUser = messageParticipant?.is_user &&
                messageParticipant?.real_user_id &&
                currentUserId &&
                messageParticipant.real_user_id === currentUserId;
              const isCurrentlySpeaking = isSpeaking && currentSpeaker === messageParticipant?.persona_name;
              const isAI = !messageParticipant?.is_user;
              const isOtherHuman = messageParticipant?.is_user && !isFromCurrentUser;

              return (
                <div
                  key={index}
                  className={`flex gap-1.5 sm:gap-2 lg:gap-3 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isFromCurrentUser && (
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 rounded border sm:border-2 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1 ${isCurrentlySpeaking ? 'border-primary bg-primary/20 animate-pulse' : 'border-border'}`}>
                      {isCurrentlySpeaking ? (
                        <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-primary animate-pulse" />
                      ) : isAI ? (
                        <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                      ) : (
                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                      )}
                    </div>
                  )}
                  <div className={`max-w-[88%] sm:max-w-[85%] lg:max-w-[80%] space-y-0.5 sm:space-y-1 ${isFromCurrentUser ? 'text-right' : ''}`}>
                    <p className={`text-[9px] sm:text-[10px] lg:text-xs font-bold ${isCurrentlySpeaking ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isFromCurrentUser ? 'You' : messageParticipant?.persona_name}
                      {isOtherHuman && <span className="ml-1 text-muted-foreground">(Player)</span>}
                      {isCurrentlySpeaking && <span className="ml-1 sm:ml-2 animate-pulse">🔊</span>}
                    </p>
                    <div className={`p-1.5 sm:p-2 lg:p-4 border sm:border-2 rounded-sm sm:rounded ${isFromCurrentUser ? 'bg-primary text-primary-foreground border-primary' : isCurrentlySpeaking ? 'bg-primary/10 border-primary' : 'bg-card border-border'}`}>
                      <p className="text-[11px] sm:text-xs lg:text-sm leading-relaxed">{message.text}</p>
                      {isAI && message.citation && (
                        <p className="mt-1.5 text-[10px] sm:text-[11px] italic text-muted-foreground border-l-2 border-primary/40 pl-2">
                          📎 {message.citation}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {message.intent && (
                        <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs h-4 sm:h-5">
                          {message.intent}
                        </Badge>
                      )}
                      {isAI && message.lens && (
                        <Badge variant="secondary" className="text-[8px] sm:text-[10px] lg:text-xs h-4 sm:h-5">
                          {message.lens}
                        </Badge>
                      )}
                      {isAI && message.novelty_note && (
                        <Badge
                          variant="outline"
                          className="text-[8px] sm:text-[10px] lg:text-xs h-4 sm:h-5 border-green-500/60 text-green-700 dark:text-green-400 bg-green-500/10"
                          title="Fresh angle introduced in this reply"
                        >
                          ✨ Fresh · {message.novelty_note}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isFromCurrentUser && (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 rounded border sm:border-2 border-border flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Jump to latest — only when user has scrolled up and new messages arrived */}
      {showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 sm:bottom-3 flex justify-center z-10">
          <Button
            size="sm"
            onClick={() => scrollToBottom(true)}
            className="pointer-events-auto h-8 sm:h-9 px-3 sm:px-4 rounded-full shadow-lg border border-primary/40 bg-primary text-primary-foreground gap-1.5 text-[11px] sm:text-xs animate-in fade-in slide-in-from-bottom-2"
            aria-label="Jump to latest message"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            {unread > 0 ? `${unread} new` : "Jump to latest"}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MessageList;
