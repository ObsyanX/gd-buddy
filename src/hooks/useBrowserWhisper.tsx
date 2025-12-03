import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';
import { useToast } from '@/hooks/use-toast';

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
      console.log('Loading Whisper model in browser...');
      whisperPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { device: 'webgpu' }
      );
      setModelLoaded(true);
      console.log('Whisper model loaded successfully');
      return whisperPipeline;
    } catch (error) {
      console.error('WebGPU not available, falling back to CPU...');
      try {
        whisperPipeline = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en'
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

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
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

      console.log('Transcribing audio...');
      const result = await model(audioData);
      console.log('Transcription result:', result);

      return result.text || null;
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
  }, [loadModel, toast]);

  const transcribeFromUrl = useCallback(async (audioUrl: string): Promise<string | null> => {
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

      console.log('Transcribing audio from URL...');
      const result = await model(audioData);
      console.log('Transcription result:', result);

      return result.text || null;
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
  }, [loadModel, toast]);

  return {
    isTranscribing,
    isModelLoading,
    modelLoaded,
    loadModel,
    transcribeAudio,
    transcribeFromUrl,
  };
};
