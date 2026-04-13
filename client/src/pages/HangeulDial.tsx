import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Volume2, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";

/**
 * 한글 학습용 인터랙티브 다이얼 UI
 * 초성, 중성, 종성을 조합하여 한글을 만들고 음성으로 읽어준다.
 */

// 한글 자모 데이터
const CHOSUNG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSUNG = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];
const JONGSUNG = ['(없음)', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];

// 한글 조합 함수
const combineHangeul = (choIdx: number, jungIdx: number, jongIdx: number): string => {
  // 종성이 없음인 경우 0으로 처리
  const actualJongIdx = jongIdx === 0 ? 0 : jongIdx;
  const unicode = 0xac00 + (choIdx * 21 * 28) + (jungIdx * 28) + actualJongIdx;
  return String.fromCharCode(unicode);
};

// 다이얼 컴포넌트
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

  // 마우스/터치 다운
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
  };

  // 마우스/터치 무브
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = clientY - startY;
    setCurrentOffset(diff);
  };

  // 마우스/터치 업
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // 스냅: 가장 가까운 항목으로 이동
    const itemsMoved = Math.round(currentOffset / itemHeight);
    const newIndex = Math.max(0, Math.min(items.length - 1, selectedIndex - itemsMoved));
    onChange(newIndex);
    setCurrentOffset(0);
  };

  // 전역 마우스 이벤트
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

  // 렌더링할 항목들 (선택된 항목 위아래 2개씩)
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
            style={{
              transform: `translateY(${offset}px)`,
            }}
          >
            {items[idx]}
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
        className="relative w-24 h-80 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-slate-700 shadow-lg"
      >
        {/* 중앙 선택 표시 */}
        <div className="absolute top-1/2 left-0 right-0 h-20 border-t-2 border-b-2 border-blue-500 -translate-y-1/2 pointer-events-none" />

        {/* 항목들 */}
        <div className="relative w-full h-full flex items-center justify-center">
          {renderItems()}
        </div>
      </div>
    </div>
  );
};

export default function HangeulDialPage() {
  const [, setLocation] = useLocation();
  const [choIdx, setChoIdx] = useState(0);
  const [jungIdx, setJungIdx] = useState(0);
  const [jongIdx, setJongIdx] = useState(0);
  const [showJongsung, setShowJongsung] = useState(true);

  // 한글 조합
  const hangeul = combineHangeul(choIdx, jungIdx, jongIdx);

  // 음성 재생
  const speakHangeul = () => {
    const utterance = new SpeechSynthesisUtterance(hangeul);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  // 자동 재생 모드
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setChoIdx((prev) => (prev + 1) % CHOSUNG.length);
      // 자동 재생 시 음성 출력
      setTimeout(() => {
        const newHangeul = combineHangeul((choIdx + 1) % CHOSUNG.length, jungIdx, jongIdx);
        const utterance = new SpeechSynthesisUtterance(newHangeul);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }, 100);
    }, 1500);

    return () => clearInterval(interval);
  }, [autoPlay, jungIdx, jongIdx]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4 relative">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 text-white">
        <button
          onClick={() => setLocation("/")}
          className="text-2xl hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold">한글 배우기</h1>
        <div className="w-8" />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center gap-12 flex-1 justify-center">
        {/* 결과 글자 표시 */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-2">조합된 글자</p>
          <div className="text-9xl font-bold text-white drop-shadow-2xl">{hangeul}</div>
        </div>

        {/* 다이얼 영역 */}
        <div className="flex gap-12 items-end">
          <Dial
            items={CHOSUNG}
            selectedIndex={choIdx}
            onChange={setChoIdx}
            label="초성"
          />
          <Dial
            items={JUNGSUNG}
            selectedIndex={jungIdx}
            onChange={setJungIdx}
            label="중성"
          />
          {showJongsung && (
            <Dial
              items={JONGSUNG}
              selectedIndex={jongIdx}
              onChange={setJongIdx}
              label="종성"
            />
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex gap-4 flex-wrap justify-center">
          {/* 음성 버튼 */}
          <button
            onClick={speakHangeul}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-xl px-6 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={24} />
            <span className="font-bold">읽기</span>
          </button>

          {/* 종성 토글 */}
          <button
            onClick={() => {
              setShowJongsung(!showJongsung);
              if (showJongsung) setJongIdx(0);
            }}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-75 shadow-lg active:scale-95 ${
              showJongsung
                ? 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white hover:shadow-green-500/50'
                : 'bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white hover:shadow-slate-500/50'
            }`}
          >
            종성 {showJongsung ? 'ON' : 'OFF'}
          </button>

          {/* 자동 재생 */}
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-75 shadow-lg active:scale-95 ${
              autoPlay
                ? 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white hover:shadow-blue-500/50'
                : 'bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white hover:shadow-slate-500/50'
            }`}
          >
            자동 재생 {autoPlay ? 'ON' : 'OFF'}
          </button>

          {/* 리셋 */}
          <button
            onClick={() => {
              setChoIdx(0);
              setJungIdx(0);
              setJongIdx(0);
            }}
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
