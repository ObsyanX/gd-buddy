import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2, Keyboard, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VOICE_OPTIONS = [
  { value: 'sarah', label: 'Sarah', description: 'Clear female voice' },
  { value: 'aria', label: 'Aria', description: 'Expressive female' },
  { value: 'laura', label: 'Laura', description: 'Warm female' },
  { value: 'charlotte', label: 'Charlotte', description: 'British female' },
  { value: 'alice', label: 'Alice', description: 'Confident female' },
  { value: 'matilda', label: 'Matilda', description: 'Warm storyteller' },
  { value: 'jessica', label: 'Jessica', description: 'Friendly female' },
  { value: 'lily', label: 'Lily', description: 'Young female' },
  { value: 'roger', label: 'Roger', description: 'Professional male' },
  { value: 'george', label: 'George', description: 'Deep British male' },
  { value: 'charlie', label: 'Charlie', description: 'Casual male' },
  { value: 'callum', label: 'Callum', description: 'Scottish male' },
  { value: 'liam', label: 'Liam', description: 'Young male' },
  { value: 'will', label: 'Will', description: 'Friendly male' },
  { value: 'eric', label: 'Eric', description: 'Soft male' },
  { value: 'chris', label: 'Chris', description: 'Casual male' },
  { value: 'brian', label: 'Brian', description: 'Deep narrative' },
  { value: 'daniel', label: 'Daniel', description: 'Authoritative male' },
  { value: 'bill', label: 'Bill', description: 'Mature male' },
];

export interface VoiceSettings {
  voice: string;
  speed: number;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [voice, setVoice] = useState('sarah');
  const [speed, setSpeed] = useState(1.0);
  const [isTesting, setIsTesting] = useState(false);

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

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: "Hello! This is a test of the selected voice. How does it sound?",
          voice: voice 
        }
      });

      if (error) throw error;

      // Play the audio
      const byteCharacters = atob(data.audioContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;
      audio.onended = () => {
        setIsTesting(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsTesting(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error: any) {
      console.error('Error testing voice:', error);
      toast({
        title: "Test failed",
        description: error.message || "Could not play test audio",
        variant: "destructive",
      });
      setIsTesting(false);
    }
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
                <Label htmlFor="voice">TTS Voice (ElevenLabs)</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger id="voice" className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{option.label}</span>
                          <span className="text-xs text-muted-foreground">- {option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the voice for AI text-to-speech responses
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed">Speech Speed: {speed.toFixed(1)}x</Label>
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestVoice}
                disabled={isTesting}
                className="border-2"
              >
                <Play className="w-4 h-4 mr-2" />
                {isTesting ? 'PLAYING...' : 'TEST VOICE'}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 border-4 border-border"
                size="lg"
              >
                SAVE PREFERENCES
              </Button>
            </div>
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
