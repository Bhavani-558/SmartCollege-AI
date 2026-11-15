import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_SPEECH_LANGUAGE = "en-IN";

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as WindowWithSpeechRecognition;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function mapSpeechErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Please enable microphone access in your browser settings and try again.";
    case "audio-capture":
      return "No microphone was detected. Please connect or check your microphone and try again.";
    case "no-speech":
      return "No speech was detected. Please speak clearly into your microphone and try again.";
    case "network":
      return "Speech recognition network error. Please check your connection or type your question.";
    default:
      return "Voice recognition could not be completed. Please try again or type your question.";
  }
}

export interface UseVoiceRecognitionOptions {
  language?: string;
  onTranscriptChange: (nextText: string) => void;
}

export interface UseVoiceRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  voiceError: string | null;
  language: string;
  startListening: (currentInputText: string) => void;
  stopListening: () => void;
  cancelListening: () => void;
  clearVoiceError: () => void;
}

export function useVoiceRecognition({
  language = DEFAULT_SPEECH_LANGUAGE,
  onTranscriptChange,
}: UseVoiceRecognitionOptions): UseVoiceRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");
  const cancelledRef = useRef<boolean>(false);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  onTranscriptChangeRef.current = onTranscriptChange;

  const isSupported = getSpeechRecognitionConstructor() !== null;

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup abort failures.
      }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(
    (currentInputText: string) => {
      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        setVoiceError(
          "Voice input is not supported in this browser. Please use Chrome or Edge, or type your question below.",
        );
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore prior instance stop error.
        }
        recognitionRef.current = null;
      }

      cancelledRef.current = false;
      baseTextRef.current = currentInputText.trim();
      setVoiceError(null);

      try {
        const recognition = new RecognitionCtor();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          if (cancelledRef.current) return;

          const parts: string[] = [];
          for (let i = 0; i < event.results.length; i += 1) {
            const result = event.results[i];
            const transcript = result?.[0]?.transcript?.trim();
            if (transcript) {
              parts.push(transcript);
            }
          }

          const spokenText = parts.join(" ").replace(/\s+/g, " ").trim();
          const combined = baseTextRef.current
            ? spokenText
              ? `${baseTextRef.current} ${spokenText}`
              : baseTextRef.current
            : spokenText;

          onTranscriptChangeRef.current(combined);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          if (cancelledRef.current && event.error === "aborted") {
            return;
          }
          setVoiceError(mapSpeechErrorMessage(event.error));
          setIsListening(false);
          recognitionRef.current = null;
        };

        recognition.onend = () => {
          if (cancelledRef.current) {
            onTranscriptChangeRef.current(baseTextRef.current);
          }
          setIsListening(false);
          recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setIsListening(false);
        setVoiceError(
          "Unable to start microphone recording. Please check microphone permissions and try again.",
        );
      }
    },
    [language],
  );

  const stopListening = useCallback(() => {
    cancelledRef.current = false;
    setIsListening(false);
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (active) {
      try {
        active.stop();
      } catch {
        // Ignore stop errors if recognition already ended.
      }
    }
  }, []);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    setIsListening(false);
    setVoiceError(null);
    onTranscriptChangeRef.current(baseTextRef.current);
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (active) {
      try {
        active.abort();
      } catch {
        // Ignore abort errors.
      }
    }
  }, []);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  return {
    isSupported,
    isListening,
    voiceError,
    language,
    startListening,
    stopListening,
    cancelListening,
    clearVoiceError,
  };
}

