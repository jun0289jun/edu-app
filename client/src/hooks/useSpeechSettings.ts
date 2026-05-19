import { useCallback, useEffect, useMemo, useState } from "react";

export type SpeechSpeed = "slow" | "normal" | "fast";
export type SpeechTone = "low" | "normal" | "bright";

export interface SpeechVoiceOption {
  voiceURI: string;
  label: string;
  description: string;
}

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

const LANGUAGE_LABELS = {
  ko: "한글",
  en: "영어",
} as const;

const GENDER_LABELS = {
  female: "여성",
  male: "남성",
  unknown: "대표",
} as const;

const FEMALE_KEYWORDS = [
  "female",
  "woman",
  "zira",
  "samantha",
  "susan",
  "karen",
  "moira",
  "tessa",
  "victoria",
  "yuna",
  "sunhi",
  "heami",
  "seoyeon",
  "미진",
  "서연",
  "여성",
];

const MALE_KEYWORDS = [
  "male",
  "man",
  "david",
  "mark",
  "alex",
  "daniel",
  "fred",
  "george",
  "hojun",
  "minjun",
  "민준",
  "호준",
  "남성",
];

const PREFERRED_VOICE_KEYWORDS = ["google", "microsoft", "apple", "siri", "natural", "neural", "premium", "online", "enhanced"];

interface StoredSpeechSettings {
  speed?: SpeechSpeed;
  tone?: SpeechTone;
  voiceURI?: string;
}

type SupportedLanguage = keyof typeof LANGUAGE_LABELS;
type VoiceGender = keyof typeof GENDER_LABELS;

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

const getSupportedLanguage = (voice: SpeechSynthesisVoice): SupportedLanguage | null => {
  const lang = voice.lang.toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("en")) return "en";
  return null;
};

const inferVoiceGender = (voice: SpeechSynthesisVoice): VoiceGender => {
  const text = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (FEMALE_KEYWORDS.some((keyword) => text.includes(keyword))) return "female";
  if (MALE_KEYWORDS.some((keyword) => text.includes(keyword))) return "male";
  return "unknown";
};

const scoreVoice = (voice: SpeechSynthesisVoice, language: SupportedLanguage): number => {
  const text = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 0;
  if (voice.lang.toLowerCase() === (language === "ko" ? "ko-kr" : "en-us")) score += 8;
  if (voice.default) score += 4;
  if (voice.localService) score += 2;
  PREFERRED_VOICE_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) score += 3;
  });
  return score;
};

const createVoiceOption = (voice: SpeechSynthesisVoice, language: SupportedLanguage, gender: VoiceGender, index?: number): SpeechVoiceOption => {
  const genderLabel = gender === "unknown" && index ? `${GENDER_LABELS[gender]} ${index}` : GENDER_LABELS[gender];
  return {
    voiceURI: voice.voiceURI,
    label: `${LANGUAGE_LABELS[language]} ${genderLabel}`,
    description: `${voice.name} (${voice.lang})`,
  };
};

const pickRepresentativeVoiceOptions = (voices: SpeechSynthesisVoice[]): SpeechVoiceOption[] => {
  const supportedVoices = voices.filter((voice) => getSupportedLanguage(voice));
  const selected = new Map<string, SpeechVoiceOption>();

  (["ko", "en"] as SupportedLanguage[]).forEach((language) => {
    (["female", "male"] as VoiceGender[]).forEach((gender) => {
      const candidates = supportedVoices
        .filter((voice) => getSupportedLanguage(voice) === language && inferVoiceGender(voice) === gender)
        .sort((a, b) => scoreVoice(b, language) - scoreVoice(a, language) || a.name.localeCompare(b.name));

      if (candidates[0]) {
        selected.set(candidates[0].voiceURI, createVoiceOption(candidates[0], language, gender));
      }
    });

    const languageSelectedCount = Array.from(selected.values()).filter((option) => option.label.startsWith(LANGUAGE_LABELS[language])).length;
    const fallbackCount = Math.max(0, 2 - languageSelectedCount);
    const fallbackVoices = supportedVoices
      .filter((voice) => getSupportedLanguage(voice) === language && !selected.has(voice.voiceURI))
      .sort((a, b) => scoreVoice(b, language) - scoreVoice(a, language) || a.name.localeCompare(b.name))
      .slice(0, fallbackCount);

    fallbackVoices.forEach((voice, index) => {
      selected.set(voice.voiceURI, createVoiceOption(voice, language, "unknown", index + 1));
    });
  });

  return Array.from(selected.values());
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

  const availableVoices = useMemo(() => pickRepresentativeVoiceOptions(voices), [voices]);

  useEffect(() => {
    if (!voiceURI) return;
    if (availableVoices.some((voice) => voice.voiceURI === voiceURI)) return;
    setVoiceURI("");
  }, [availableVoices, voiceURI]);

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
