import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Volume2, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";

// 유니코드 기준 정확한 자모 배열 (한글 유니코드: 0xAC00 + 초성*588 + 중성*28 + 종성)
const ALL_CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
]; // 19개, index 0~18

const ALL_JUNGSUNG = [
  'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ',
  'ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ',
  'ㅣ',
]; // 21개, index 0~20

const ALL_JONGSUNG = [
  '','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ',
  'ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
]; // 28개, index 0~27

type DifficultyLevel = 'easy' | 'medium' | 'hard';

const DIFFICULTY: Record<DifficultyLevel, {
  label: string;
  desc: string;
  chosungIdx: number[];
  jungsungIdx: number[];
  jongsungIdx: number[];
  defaultShowJong: boolean;
}> = {
  easy: {
    label: '쉬움',
    desc: '기본 자모만',
    // 기본 자음 14개 (쌍자음 제외)
    chosungIdx: [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18],
    // 단모음 10개
    jungsungIdx: [0, 2, 4, 6, 8, 12, 13, 17, 18, 20],
    // 받침 없음
    jongsungIdx: [0],
    defaultShowJong: false,
  },
  medium: {
    label: '보통',
    desc: '확장 자모',
    // 쌍자음 포함 전체 초성
    chosungIdx: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
    // 단모음 + ㅐ·ㅔ
    jungsungIdx: [0, 1, 2, 4, 5, 6, 8, 12, 13, 17, 18, 20],
    // 기본 받침 8개
    jongsungIdx: [0, 1, 4, 7, 8, 16, 17, 19, 21],
    defaultShowJong: true,
  },
  hard: {
    label: '어려움',
    desc: '전체 자모',
    chosungIdx: ALL_CHOSUNG.map((_, i) => i),
    jungsungIdx: ALL_JUNGSUNG.map((_, i) => i),
    jongsungIdx: ALL_JONGSUNG.map((_, i) => i),
    defaultShowJong: true,
  },
};

const combineHangeul = (choIdx: number, jungIdx: number, jongIdx: number): string => {
  if (choIdx < 0 || choIdx > 18 || jungIdx < 0 || jungIdx > 20 || jongIdx < 0 || jongIdx > 27) {
    return '?';
  }
  return String.fromCharCode(0xac00 + choIdx * 588 + jungIdx * 28 + jongIdx);
};

interface DialProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  label: string;
}

const Dial: React.FC<DialProps> = ({ items, selectedIndex, onChange, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const itemHeight = 80;

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCurrentOffset(clientY - startY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const itemsMoved = Math.round(currentOffset / itemHeight);
    const newIndex = Math.max(0, Math.min(items.length - 1, selectedIndex - itemsMoved));
    onChange(newIndex);
    setCurrentOffset(0);
  };

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove as any);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove as any);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove as any);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, selectedIndex, currentOffset]);

  const renderItems = () => {
    const displayItems = [];
    for (let i = -2; i <= 2; i++) {
      const idx = selectedIndex + i;
      if (idx >= 0 && idx < items.length) {
        const isSelected = i === 0;
        const offset = i * itemHeight + currentOffset;
        displayItems.push(
          <div
            key={idx}
            className={`absolute w-full h-20 flex items-center justify-center text-4xl font-bold transition-all duration-100 ${
              isSelected
                ? 'text-white opacity-100 scale-125'
                : 'text-slate-500 opacity-40 scale-75'
            }`}
            style={{ transform: `translateY(${offset}px)` }}
          >
            {items[idx] || '·'}
          </div>
        );
      }
    }
    return displayItems;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-slate-400 text-sm font-semibold">{label}</p>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className="relative w-20 sm:w-24 h-72 sm:h-80 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-slate-700 shadow-lg touch-none select-none"
      >
        <div className="absolute top-1/2 left-0 right-0 h-20 border-t-2 border-b-2 border-blue-500 -translate-y-1/2 pointer-events-none" />
        <div className="relative w-full h-full flex items-center justify-center">
          {renderItems()}
        </div>
      </div>
    </div>
  );
};

export default function HangeulDialPage() {
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [choPos, setChoPos] = useState(0);
  const [jungPos, setJungPos] = useState(0);
  const [jongPos, setJongPos] = useState(0);
  const [showJongsung, setShowJongsung] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const config = DIFFICULTY[difficulty];

  const chosungItems = useMemo(() => config.chosungIdx.map(i => ALL_CHOSUNG[i]), [difficulty]);
  const jungsungItems = useMemo(() => config.jungsungIdx.map(i => ALL_JUNGSUNG[i]), [difficulty]);
  const jongsungItems = useMemo(() => config.jongsungIdx.map(i => ALL_JONGSUNG[i]), [difficulty]);

  // 유니코드 인덱스로 변환하여 정확하게 조합
  const choUniIdx = config.chosungIdx[choPos] ?? 0;
  const jungUniIdx = config.jungsungIdx[jungPos] ?? 0;
  const jongUniIdx = (showJongsung && config.jongsungIdx.length > 1)
    ? (config.jongsungIdx[jongPos] ?? 0)
    : 0;

  const hangeul = combineHangeul(choUniIdx, jungUniIdx, jongUniIdx);

  const handleDifficultyChange = (newDiff: DifficultyLevel) => {
    setDifficulty(newDiff);
    setChoPos(0);
    setJungPos(0);
    setJongPos(0);
    setShowJongsung(DIFFICULTY[newDiff].defaultShowJong);
    setAutoPlay(false);
  };

  const speakHangeul = () => {
    const utterance = new SpeechSynthesisUtterance(hangeul);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setChoPos(prev => {
        const next = (prev + 1) % chosungItems.length;
        const nextChoUni = config.chosungIdx[next] ?? 0;
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(
            combineHangeul(nextChoUni, jungUniIdx, jongUniIdx)
          );
          utterance.lang = 'ko-KR';
          utterance.rate = 0.8;
          speechSynthesis.cancel();
          speechSynthesis.speak(utterance);
        }, 100);
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [autoPlay, jungUniIdx, jongUniIdx, chosungItems.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4 relative">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 text-white">
        <button onClick={() => setLocation("/")} className="text-2xl hover:opacity-70 transition-opacity">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold">한글 배우기</h1>
        <div className="w-8" />
      </div>

      <div className="flex flex-col items-center gap-6 sm:gap-10 flex-1 justify-center w-full max-w-full pt-20">
        {/* 난이도 선택 */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">난이도</p>
          <div className="flex gap-2">
            {(Object.keys(DIFFICULTY) as DifficultyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleDifficultyChange(level)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-75 shadow-md active:scale-95 ${
                  difficulty === level
                    ? 'bg-gradient-to-b from-yellow-400 to-yellow-500 text-slate-900 shadow-yellow-400/40'
                    : 'bg-gradient-to-b from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600'
                }`}
              >
                {DIFFICULTY[level].label}
                <span className="block text-xs font-normal opacity-70">{DIFFICULTY[level].desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 결과 글자 */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-2">조합된 글자</p>
          <div className="text-7xl sm:text-9xl font-bold text-white drop-shadow-2xl">{hangeul}</div>
        </div>

        {/* 다이얼 영역 */}
        <div className="flex gap-5 sm:gap-12 items-end justify-center w-full max-w-full">
          <Dial items={chosungItems} selectedIndex={choPos} onChange={setChoPos} label="초성" />
          <Dial items={jungsungItems} selectedIndex={jungPos} onChange={setJungPos} label="중성" />
          {showJongsung && config.jongsungIdx.length > 1 && (
            <Dial items={jongsungItems} selectedIndex={jongPos} onChange={setJongPos} label="종성" />
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex gap-3 flex-wrap justify-center pb-6">
          <button
            onClick={speakHangeul}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-xl px-6 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={24} />
            <span className="font-bold">읽기</span>
          </button>

          {/* 종성 토글 (easy 모드에선 숨김) */}
          {difficulty !== 'easy' && (
            <button
              onClick={() => { setShowJongsung(!showJongsung); if (showJongsung) setJongPos(0); }}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-75 shadow-lg active:scale-95 ${
                showJongsung
                  ? 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white hover:shadow-green-500/50'
                  : 'bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white'
              }`}
            >
              받침 {showJongsung ? 'ON' : 'OFF'}
            </button>
          )}

          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-75 shadow-lg active:scale-95 ${
              autoPlay
                ? 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white hover:shadow-blue-500/50'
                : 'bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white'
            }`}
          >
            자동 재생 {autoPlay ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => { setChoPos(0); setJungPos(0); setJongPos(0); }}
            className="flex items-center gap-2 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 active:from-slate-700 active:to-slate-800 text-white rounded-xl px-6 py-3 transition-all duration-75 shadow-lg hover:shadow-slate-500/50 active:scale-95"
          >
            <RotateCcw size={20} />
            <span className="font-bold">초기화</span>
          </button>
        </div>
      </div>
    </div>
  );
}
