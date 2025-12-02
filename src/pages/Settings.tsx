import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2, Keyboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male)' },
  { value: 'fable', label: 'Fable (British Male)' },
  { value: 'onyx', label: 'Onyx (Deep Male)' },
  { value: 'nova', label: 'Nova (Female)' },
  { value: 'shimmer', label: 'Shimmer (Soft Female)' },
];

export interface VoiceSettings {
  voice: string;
  speed: number;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [voice, setVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1.0);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings) as VoiceSettings;
      setVoice(parsed.voice);
      setSpeed(parsed.speed);
    }
  }, []);

  const handleSave = () => {
    const settings: VoiceSettings = { voice, speed };
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    
    toast({
      title: "Settings saved",
      description: "Your voice preferences have been updated",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">SETTINGS</h1>
        </div>
      </header>

      <main className="container mx-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Voice Settings */}
          <Card className="p-6 border-4 border-border space-y-6">
            <div className="flex items-center gap-2">
              <Volume2 className="w-6 h-6" />
              <h2 className="text-2xl font-bold">VOICE PREFERENCES</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice">TTS Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger id="voice" className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the voice for AI text-to-speech responses
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed">Speech Speed: {speed.toFixed(2)}x</Label>
                <Slider
                  id="speed"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[speed]}
                  onValueChange={([value]) => setSpeed(value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x (Slow)</span>
                  <span>1.0x (Normal)</span>
                  <span>2.0x (Fast)</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full border-4 border-border"
              size="lg"
            >
              SAVE PREFERENCES
            </Button>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="p-6 border-4 border-border space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-6 h-6" />
              <h2 className="text-2xl font-bold">KEYBOARD SHORTCUTS</h2>
            </div>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center p-3 border-2 border-border">
                <span className="text-muted-foreground">Toggle Microphone</span>
                <kbd className="px-3 py-1 bg-muted border-2 border-border font-bold">
                  Ctrl + M
                </kbd>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-border">
                <span className="text-muted-foreground">Send Message</span>
                <kbd className="px-3 py-1 bg-muted border-2 border-border font-bold">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-border">
                <span className="text-muted-foreground">Stop TTS Playback</span>
                <kbd className="px-3 py-1 bg-muted border-2 border-border font-bold">
                  Escape
                </kbd>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
