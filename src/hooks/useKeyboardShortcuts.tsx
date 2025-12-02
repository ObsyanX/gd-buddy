import { useEffect } from 'react';

interface KeyboardShortcuts {
  onMicToggle?: () => void;
  onSendMessage?: () => void;
  onStopTTS?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onMicToggle,
  onSendMessage,
  onStopTTS,
  enabled = true,
}: KeyboardShortcuts) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+M for microphone toggle
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        onMicToggle?.();
      }

      // Ctrl+Enter for send message
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        onSendMessage?.();
      }

      // Escape for stop TTS
      if (event.key === 'Escape') {
        event.preventDefault();
        onStopTTS?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onMicToggle, onSendMessage, onStopTTS, enabled]);
};
