import { useCallback, useEffect, useMemo, useState } from "react";

export type SpeechSpeed = "slow" | "normal" | "fast";
export type SpeechTone = "low" | "normal" | "bright";

const STORAGE_KEY = "edu-app-speech-settings";

const SPEED_RATE: Record<SpeechSpeed, number> = {
  slow: 0.65,
  normal: 0.85,
  fast: 1.1,
};

const TONE_PITCH: Record<SpeechTone, number> = {
  low: 0.75,
  normal: 1,
  bright: 1.25,
};

interface StoredSpeechSettings {
  speed?: SpeechSpeed;
  tone?: SpeechTone;
  voiceURI?: string;
}

const isSpeechSpeed = (value: unknown): value is SpeechSpeed =>
  value === "slow" || value === "normal" || value === "fast";

const isSpeechTone = (value: unknown): value is SpeechTone =>
  value === "low" || value === "normal" || value === "bright";

const readSettings = (): Required<StoredSpeechSettings> => {
  if (typeof window === "undefined") {
    return { speed: "normal", tone: "normal", voiceURI: "" };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as StoredSpeechSettings;
    return {
      speed: isSpeechSpeed(parsed.speed) ? parsed.speed : "normal",
      tone: isSpeechTone(parsed.tone) ? parsed.tone : "normal",
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : "",
    };
  } catch {
    return { speed: "normal", tone: "normal", voiceURI: "" };
  }
};

export function useSpeechSettings() {
  const [speed, setSpeed] = useState<SpeechSpeed>(() => readSettings().speed);
  const [tone, setTone] = useState<SpeechTone>(() => readSettings().tone);
  const [voiceURI, setVoiceURI] = useState<string>(() => readSettings().voiceURI);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed, tone, voiceURI }));
  }, [speed, tone, voiceURI]);

  const availableVoices = useMemo(
    () => voices.filter((voice) => voice.lang.startsWith("ko") || voice.lang.startsWith("en")),
    [voices],
  );

  const createUtterance = useCallback(
    (text: string, lang: "ko-KR" | "en-US") => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = SPEED_RATE[speed];
      utterance.pitch = TONE_PITCH[tone];

      const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
      const matchingVoice =
        selectedVoice && selectedVoice.lang.startsWith(lang.slice(0, 2))
          ? selectedVoice
          : voices.find((voice) => voice.lang === lang) ?? voices.find((voice) => voice.lang.startsWith(lang.slice(0, 2)));

      if (matchingVoice) utterance.voice = matchingVoice;
      return utterance;
    },
    [speed, tone, voiceURI, voices],
  );

  return {
    speed,
    setSpeed,
    tone,
    setTone,
    voiceURI,
    setVoiceURI,
    voices: availableVoices,
    createUtterance,
  };
}
