/**
 * Speech Recognition Hook for Cultivate
 *
 * Uses Web Speech API for voice-to-text conversion.
 * Enables farmers to speak their queries instead of typing (especially useful on mobile).
 *
 * Browser Support:
 * - Chrome/Edge: ✅ Supported (SpeechRecognition)
 * - Safari iOS: ✅ Supported (webkitSpeechRecognition)
 * - Firefox: ❌ Not supported (as of 2026)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
 */

import { useState, useEffect, useRef } from "react";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// Browser compatibility: Check for SpeechRecognition API
const SpeechRecognition =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

export interface UseSpeechRecognitionOptions {
  lang?: string; // Language code (default: "en-US")
  continuous?: boolean; // Keep recording until manually stopped (default: false)
  interimResults?: boolean; // Return partial results while speaking (default: true)
  onTranscript?: (transcript: string, isFinal: boolean) => void; // Callback for each result
  onEnd?: () => void; // Callback when recording stops
}

export interface UseSpeechRecognitionReturn {
  transcript: string; // Current transcript text
  isListening: boolean; // Whether currently recording
  isSupported: boolean; // Whether browser supports Speech Recognition
  error: string | null; // Error message if any
  startListening: () => void; // Start recording
  stopListening: () => void; // Stop recording
  resetTranscript: () => void; // Clear transcript
}

/**
 * Hook for speech-to-text conversion using Web Speech API
 *
 * @example
 * ```tsx
 * const { transcript, isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
 *   lang: "en-US",
 *   onTranscript: (text, isFinal) => {
 *     if (isFinal) {
 *       setMessage(text); // Set final transcript as message
 *     }
 *   }
 * });
 *
 * return (
 *   <button onClick={isListening ? stopListening : startListening}>
 *     {isListening ? "Stop" : "Start"} Recording
 *   </button>
 * );
 * ```
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = "en-US",
    continuous = false,
    interimResults = true,
    onTranscript,
    onEnd,
  } = options;

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isSupported = SpeechRecognition !== null;

  useEffect(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    // Initialize recognition instance
    const recognition = new SpeechRecognition() as ISpeechRecognition;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Loop through results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPiece = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptPiece + " ";
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Update transcript state
      const newTranscript = (finalTranscript || interimTranscript).trim();
      setTranscript(newTranscript);

      // Call callback if provided
      if (onTranscript && newTranscript) {
        const isFinal = finalTranscript.length > 0;
        onTranscript(newTranscript, isFinal);
      }
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      let errorMessage = "An error occurred";

      switch (event.error) {
        case "not-allowed":
          errorMessage = "Microphone permission denied. Please allow microphone access.";
          break;
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your device.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      setError(errorMessage);
      setIsListening(false);
    };

    // Handle end of recognition
    recognition.onend = () => {
      setIsListening(false);
      if (onEnd) {
        onEnd();
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, lang, continuous, interimResults, onTranscript, onEnd]);

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) {
      setError("Speech recognition not available");
      return;
    }

    try {
      setError(null);
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Failed to start recording. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    setTranscript("");
    setError(null);
  };

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
