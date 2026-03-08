import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Mic, Volume2, VolumeX, Square, HelpCircle, Menu, Sparkles } from "lucide-react";

interface SessionHeaderProps {
  session: any;
  messagesCount: number;
  isListening: boolean;
  isCorrecting: boolean;
  autoMicEnabled: boolean;
  autoMicSetting: boolean;
  autoPlayTTS: boolean;
  usingFallbackTTS?: boolean;
  onToggleAutoMic: () => void;
  onToggleTTS: () => void;
  onResetTutorial: () => void;
  onEndSession: () => void;
}

const SessionHeader = ({
  session, messagesCount, isListening, isCorrecting,
  autoMicEnabled, autoMicSetting, autoPlayTTS, usingFallbackTTS,
  onToggleAutoMic, onToggleTTS, onResetTutorial, onEndSession,
}: SessionHeaderProps) => {
  return (
    <header className="border-b-4 border-border p-2 sm:p-4">
      <div className="container mx-auto">
        {/* Mobile Header */}
        <div className="flex items-center justify-between gap-2 md:hidden">
          <div className="flex-1 min-w-0">
            <h1
              className="text-base sm:text-lg font-bold leading-tight line-clamp-2 break-words"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' }}
              title={session.topic}
            >
              {session.topic}
            </h1>
            <div className="flex gap-1 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{session.topic_category}</Badge>
              <Badge variant="outline" className="border text-[10px]">{messagesCount} turns</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isListening && (
              <Badge variant="outline" className="border animate-pulse bg-destructive/20 text-[10px] px-1.5">🎤</Badge>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 h-8 w-8 p-0">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>Session Controls</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    variant="outline" size="sm"
                    onClick={onToggleAutoMic}
                    className={`border-2 justify-start ${autoMicEnabled && autoMicSetting ? 'bg-accent/20' : ''}`}
                    disabled={!autoMicSetting}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Auto-mic {autoMicEnabled && autoMicSetting ? 'ON' : 'OFF'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={onToggleTTS} className="border-2 justify-start">
                    {autoPlayTTS ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                    TTS {autoPlayTTS ? 'ON' : 'OFF'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onResetTutorial} className="justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Show Tutorial
                  </Button>
                  {session.is_multiplayer && session.room_code && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Room Code</p>
                      <p className="font-mono font-bold">🔑 {session.room_code}</p>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-2">
                    <Button variant="destructive" onClick={onEndSession} className="w-full border-4 border-border">
                      <Square className="w-4 h-4 mr-2" />
                      END SESSION
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">{session.topic}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{session.topic_category}</Badge>
              <Badge variant="outline" className="border-2">{messagesCount} turns</Badge>
              {isListening && (
                <Badge variant="outline" className="border-2 animate-pulse bg-destructive/20">🎤 Listening...</Badge>
              )}
              {isCorrecting && (
                <Badge variant="outline" className="border-2 animate-pulse bg-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Correcting...
                </Badge>
              )}
              <Button
                variant="outline" size="sm"
                onClick={onToggleAutoMic}
                className={`border-2 text-xs ${autoMicEnabled && autoMicSetting ? 'bg-accent/20' : ''}`}
                disabled={!autoMicSetting}
                title={autoMicSetting ? "Toggle auto-mic after first message" : "Enable auto-mic in Settings"}
              >
                <Mic className="w-3 h-3 mr-1" />
                Auto-mic {autoMicEnabled && autoMicSetting ? 'ON' : 'OFF'}
              </Button>
              {session.is_multiplayer && (
                <>
                  <Badge variant="default" className="border-2">Multiplayer</Badge>
                  {session.room_code && (
                    <Badge variant="outline" className="border-2 font-mono">
                      🔑 Room: {session.room_code}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onResetTutorial} title="Show Tutorial">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onToggleTTS} className="border-2">
              {autoPlayTTS ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              TTS {autoPlayTTS ? 'ON' : 'OFF'}
            </Button>
            <Button variant="destructive" onClick={onEndSession} className="border-4 border-border">
              <Square className="w-4 h-4 mr-2" />
              END SESSION
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SessionHeader;
