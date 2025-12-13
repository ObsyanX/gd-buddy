import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';
import { useToast } from '@/hooks/use-toast';
import { invokeWithAuth } from '@/lib/supabase-auth';

let whisperPipeline: any = null;
let pipelineLoading = false;

export const useBrowserWhisper = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(!!whisperPipeline);
  const { toast } = useToast();

  const loadModel = useCallback(async () => {
    if (whisperPipeline || pipelineLoading) return whisperPipeline;

    pipelineLoading = true;
    setIsModelLoading(true);

    try {
      // Use multilingual Whisper model for better language support
      console.log('Loading multilingual Whisper model in browser...');
      whisperPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-small',
        { device: 'webgpu' }
      );
      setModelLoaded(true);
      console.log('Whisper model loaded successfully with WebGPU');
      return whisperPipeline;
    } catch (error) {
      console.error('WebGPU not available, falling back to CPU...');
      try {
        whisperPipeline = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-small'
        );
        setModelLoaded(true);
        console.log('Whisper model loaded on CPU');
        return whisperPipeline;
      } catch (cpuError) {
        console.error('Failed to load Whisper model:', cpuError);
        toast({
          title: "Model load failed",
          description: "Could not load speech recognition model",
          variant: "destructive",
        });
        return null;
      }
    } finally {
      pipelineLoading = false;
      setIsModelLoading(false);
    }
  }, [toast]);

  // AI correction for transcription
  const correctTranscription = useCallback(async (rawText: string, context?: string): Promise<string> => {
    if (!rawText || rawText.trim().length === 0) return rawText;

    try {
      const { data, error } = await invokeWithAuth('transcription-correction', {
        body: { rawTranscription: rawText, context }
      });

      if (error) {
        console.error('Transcription correction error:', error);
        return rawText; // Return original on error
      }

      return data?.correctedText || rawText;
    } catch (err) {
      console.error('Failed to correct transcription:', err);
      return rawText;
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob, context?: string): Promise<string | null> => {
    setIsTranscribing(true);

    try {
      const model = await loadModel();
      if (!model) {
        throw new Error('Model not loaded');
      }

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Create audio context to decode the audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get audio data as float32 array
      const audioData = audioBuffer.getChannelData(0);

      console.log('Transcribing audio with multilingual support...');
      const result = await model(audioData, {
        language: 'en', // Primary language but model handles code-switching
        task: 'transcribe',
      });
      
      const rawText = result.text || '';
      console.log('Raw transcription:', rawText);

      // Apply AI correction for better accuracy
      const correctedText = await correctTranscription(rawText, context);
      console.log('Corrected transcription:', correctedText);

      return correctedText || null;
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [loadModel, correctTranscription, toast]);

  const transcribeFromUrl = useCallback(async (audioUrl: string, context?: string): Promise<string | null> => {
    setIsTranscribing(true);

    try {
      const model = await loadModel();
      if (!model) {
        throw new Error('Model not loaded');
      }

      // Fetch the audio blob
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      
      // Convert to array buffer and decode
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      console.log('Transcribing audio from URL with multilingual support...');
      const result = await model(audioData, {
        language: 'en',
        task: 'transcribe',
      });
      
      const rawText = result.text || '';
      console.log('Raw transcription:', rawText);

      // Apply AI correction
      const correctedText = await correctTranscription(rawText, context);
      console.log('Corrected transcription:', correctedText);

      return correctedText || null;
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [loadModel, correctTranscription, toast]);

  return {
    isTranscribing,
    isModelLoading,
    modelLoaded,
    loadModel,
    transcribeAudio,
    transcribeFromUrl,
  };
};
