import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, Volume2, Keyboard, Play, Check, RotateCcw } from "lucide-react";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to GD-Buddy!",
    description: "Let's quickly learn the key features to help you ace your group discussions.",
    icon: null,
    content: (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          This quick tutorial will show you how to use voice input, practice mode, and keyboard shortcuts.
        </p>
      </div>
    ),
  },
  {
    title: "Voice Input",
    description: "Use your voice to participate naturally in discussions.",
    icon: <Mic className="w-8 h-8" />,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 border-2 border-border rounded">
          <Mic className="w-6 h-6" />
          <div>
            <p className="font-bold">Quick Record</p>
            <p className="text-sm text-muted-foreground">
              Click the mic button for instant voice-to-text. Your speech is transcribed and ready to send.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 border-2 border-border rounded bg-muted/50">
          <Badge className="px-2 py-1 font-mono">Ctrl+M</Badge>
          <p className="text-sm">Keyboard shortcut to start recording</p>
        </div>
      </div>
    ),
  },
  {
    title: "Practice Mode",
    description: "Record, review, and perfect your responses before sending.",
    icon: <Play className="w-8 h-8" />,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 border-2 border-border rounded">
            <Mic className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">1. RECORD</p>
          </div>
          <div className="p-3 border-2 border-border rounded">
            <Play className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">2. REVIEW</p>
          </div>
          <div className="p-3 border-2 border-border rounded">
            <Check className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">3. ACCEPT</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Practice mode lets you listen to your recording and re-record if needed. 
          See your real-time <strong>Words Per Minute</strong> as you speak!
        </p>
        <div className="flex items-center gap-4 p-4 border-2 border-border rounded bg-muted/50">
          <RotateCcw className="w-5 h-5" />
          <p className="text-sm">All practice recordings are saved in session history for later review</p>
        </div>
      </div>
    ),
  },
  {
    title: "Keyboard Shortcuts",
    description: "Speed up your workflow with these handy shortcuts.",
    icon: <Keyboard className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border-2 border-border rounded">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span className="text-sm">Start Practice Recording</span>
          </div>
          <Badge variant="outline" className="font-mono">Ctrl+M</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border-2 border-border rounded">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="text-sm">Send Message</span>
          </div>
          <Badge variant="outline" className="font-mono">Ctrl+Enter</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border-2 border-border rounded">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">Stop Audio Playback</span>
          </div>
          <Badge variant="outline" className="font-mono">Esc</Badge>
        </div>
      </div>
    ),
  },
  {
    title: "You're Ready!",
    description: "Start practicing and improve your GD skills.",
    icon: <Check className="w-8 h-8" />,
    content: (
      <div className="text-center space-y-4">
        <div className="p-6 border-4 border-primary rounded bg-primary/10">
          <p className="font-bold text-lg">Quick Tips:</p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• Speak clearly for better transcription</li>
            <li>• Use practice mode to review before sending</li>
            <li>• Watch your WPM for optimal pacing (120-150 ideal)</li>
            <li>• Check your session history to track progress</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('gd-buddy-onboarding-complete', 'true');
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="border-4 border-border max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {step.icon && (
              <div className="p-2 border-2 border-border rounded">
                {step.icon}
              </div>
            )}
            <div>
              <DialogTitle className="text-xl font-bold">{step.title}</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {step.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {step.content}
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2 py-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrev} className="border-2">
                Previous
              </Button>
            )}
            <Button onClick={handleNext} className="border-4 border-border">
              {currentStep === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const useOnboardingTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('gd-buddy-onboarding-complete');
    if (!completed) {
      setShowTutorial(true);
    }
  }, []);

  const resetTutorial = () => {
    localStorage.removeItem('gd-buddy-onboarding-complete');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    setShowTutorial,
    resetTutorial,
  };
};
