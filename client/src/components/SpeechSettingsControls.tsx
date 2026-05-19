import type { SpeechSpeed, SpeechTone, SpeechVoiceOption } from "@/hooks/useSpeechSettings";

interface SpeechSettingsControlsProps {
  speed: SpeechSpeed;
  onSpeedChange: (speed: SpeechSpeed) => void;
  tone: SpeechTone;
  onToneChange: (tone: SpeechTone) => void;
  voiceURI: string;
  onVoiceChange: (voiceURI: string) => void;
  voices: SpeechVoiceOption[];
}

const SPEED_OPTIONS: Array<{ value: SpeechSpeed; label: string }> = [
  { value: "slow", label: "느리게" },
  { value: "normal", label: "보통" },
  { value: "fast", label: "빠르게" },
];

const TONE_OPTIONS: Array<{ value: SpeechTone; label: string }> = [
  { value: "low", label: "낮게" },
  { value: "normal", label: "보통" },
  { value: "bright", label: "높게" },
];

export function SpeechSettingsControls({
  speed,
  onSpeedChange,
  tone,
  onToneChange,
  voiceURI,
  onVoiceChange,
  voices,
}: SpeechSettingsControlsProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-slate-300 text-sm font-semibold mb-3">음성 속도</p>
        <div className="grid grid-cols-3 gap-2">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSpeedChange(option.value)}
              className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                speed === option.value ? "bg-purple-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-slate-300 text-sm font-semibold mb-3">목소리 톤</p>
        <div className="grid grid-cols-3 gap-2">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onToneChange(option.value)}
              className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                tone === option.value ? "bg-purple-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-300 text-sm font-semibold mb-3 block" htmlFor="speech-voice">
          음성 선택
        </label>
        <select
          id="speech-voice"
          value={voiceURI}
          onChange={(event) => onVoiceChange(event.target.value)}
          className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-slate-600 focus:ring-2 focus:ring-purple-500"
        >
          <option value="">자동 선택</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.label} · {voice.description}
            </option>
          ))}
        </select>
        <p className="text-slate-400 text-xs mt-2">한글과 영어의 대표 남성·여성 목소리만 간단히 보여줍니다.</p>
      </div>
    </div>
  );
}
