import { useState, useRef, useEffect } from "react";
import { Plus, Minus, Settings, ArrowLeft, Volume2, Shuffle } from "lucide-react";
import { useLocation } from "wouter";

export default function CounterPage() {
  const [, setLocation] = useLocation();
  const [count, setCount] = useState(0);
  const [digits, setDigits] = useState(4);
  const [increment, setIncrement] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxCount = Math.pow(10, digits) - 1;

  const triggerVibration = () => {
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleIncrement = () => {
    if (isRolling) return;
    triggerVibration();
    setCount((prev) => (prev + increment) % (maxCount + 1));
  };

  const handleDecrement = () => {
    if (isRolling) return;
    triggerVibration();
    setCount((prev) => (prev - increment + (maxCount + 1)) % (maxCount + 1));
  };

  // 직접 입력 모드 진입
  const handleNumberClick = () => {
    if (isRolling) return;
    setInputValue(String(count));
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  // 입력 확정
  const confirmEdit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      setCount(Math.min(maxCount, Math.max(0, parsed)));
    }
    setIsEditing(false);
  };

  // 랜덤 숫자 (주사위 굴리기 애니메이션)
  const handleRandom = () => {
    if (isRolling || isEditing) return;
    setIsRolling(true);
    triggerVibration();

    let flashes = 0;
    const maxFlashes = 14;
    let delay = 50;

    const roll = () => {
      setCount(Math.floor(Math.random() * (maxCount + 1)));
      flashes++;
      if (flashes < maxFlashes) {
        // 점점 느리게
        delay = 50 + (flashes / maxFlashes) * 200;
        rollingRef.current = setTimeout(roll, delay);
      } else {
        setIsRolling(false);
        triggerVibration();
      }
    };

    rollingRef.current = setTimeout(roll, delay);
  };

  useEffect(() => {
    return () => {
      if (rollingRef.current) clearTimeout(rollingRef.current);
    };
  }, []);

  const displayCount = String(count).padStart(digits, "0");

  const renderNumberDisplay = () => {
    const countStr = String(count);
    const leadingZeros = digits - countStr.length;

    return (
      <div
        className={`max-w-full overflow-hidden text-[clamp(4.5rem,22vw,200px)] font-bold text-white tracking-tight sm:tracking-wider font-mono drop-shadow-2xl leading-none flex justify-center transition-all duration-75 ${
          isRolling ? 'opacity-70 scale-95' : ''
        } ${!isRolling ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}`}
        onClick={handleNumberClick}
      >
        {Array.from({ length: digits }).map((_, idx) => {
          const isLeadingZero = idx < leadingZeros;
          return (
            <span
              key={idx}
              className={`transition-opacity duration-300 ${isLeadingZero ? "opacity-30" : "opacity-100"}`}
            >
              {displayCount[idx]}
            </span>
          );
        })}
      </div>
    );
  };

  const convertToKorean = (num: number): string => {
    const n = ['영','일','이','삼','사','오','육','칠','팔','구'];
    if (num === 0) return '영';
    let r = '';
    const m = Math.floor(num / 1000000); if (m > 0) r += (m === 1 ? '' : n[m]) + '백만';
    const ht = Math.floor((num % 1000000) / 100000); if (ht > 0) r += (ht === 1 ? '' : n[ht]) + '십만';
    const tt = Math.floor((num % 100000) / 10000); if (tt > 0) r += (tt === 1 ? '' : n[tt]) + '만';
    const th = Math.floor((num % 10000) / 1000); if (th > 0) r += (th === 1 ? '' : n[th]) + '천';
    const h = Math.floor((num % 1000) / 100); if (h > 0) r += (h === 1 ? '' : n[h]) + '백';
    const t = Math.floor((num % 100) / 10); if (t > 0) r += (t === 1 ? '' : n[t]) + '십';
    const o = num % 10; if (o > 0) r += n[o];
    return r;
  };

  const convertToEnglish = (num: number): string => {
    const ones = ['zero','one','two','three','four','five','six','seven','eight','nine'];
    const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    const tensArr = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    if (num === 0) return 'zero';
    const cvt = (n: number): string => {
      let r = '';
      const h = Math.floor(n / 100);
      if (h > 0) r += ones[h] + ' hundred';
      const rem = n % 100;
      if (rem >= 20) { if (r) r += ' '; r += tensArr[Math.floor(rem / 10)]; if (rem % 10 > 0) r += ' ' + ones[rem % 10]; }
      else if (rem >= 10) { if (r) r += ' '; r += teens[rem - 10]; }
      else if (rem > 0) { if (r) r += ' '; r += ones[rem]; }
      return r;
    };
    let result = ''; let si = 0; let n = num;
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const txt = cvt(chunk);
        result = txt + (si > 0 ? (si === 1 ? ' thousand' : ' million') : '') + (result ? ' ' + result : '');
      }
      n = Math.floor(n / 1000); si++;
    }
    return result;
  };

  const speakNumber = (lang: 'ko' | 'en') => {
    const text = lang === 'ko' ? convertToKorean(count) : convertToEnglish(count);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const formatIncrement = (inc: number) => {
    if (inc >= 1000000) return `+${inc / 1000000}백만`;
    if (inc >= 100000) return `+${inc / 100000}십만`;
    if (inc >= 10000) return `+${inc / 10000}만`;
    if (inc >= 1000) return `+${inc / 1000}천`;
    if (inc >= 100) return `+${inc / 100}백`;
    if (inc >= 10) return `+${inc / 10}십`;
    return `+${inc}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4 relative">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-6 text-white">
        <button onClick={() => setLocation("/")} className="text-2xl hover:opacity-70 transition-opacity">
          <ArrowLeft size={32} />
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="text-2xl hover:opacity-70 transition-opacity">
          <Settings size={32} />
        </button>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="absolute top-24 right-4 sm:right-6 bg-slate-800 rounded-2xl p-6 shadow-2xl z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] overflow-y-auto">
          <h2 className="text-white text-lg font-bold mb-6">설정</h2>
          <div className="mb-8">
            <p className="text-slate-300 text-sm font-semibold mb-3">자리수</p>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5,6,7].map((d) => (
                <button
                  key={d}
                  onClick={() => { setDigits(d); setCount(0); }}
                  className={`py-2 px-4 rounded-lg font-bold transition-all ${
                    digits === d ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-slate-400 text-xs mt-2">현재: {Array(digits).fill(0).join("")}</p>
          </div>
          <div>
            <p className="text-slate-300 text-sm font-semibold mb-3">증가치</p>
            <div className="flex gap-2 flex-wrap">
              {[1,10,100,1000,10000,100000,1000000].map((inc) => (
                <button
                  key={inc}
                  onClick={() => setIncrement(inc)}
                  className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                    increment === inc ? "bg-green-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {formatIncrement(inc)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all">
            닫기
          </button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center flex-1 gap-8 sm:gap-12 w-full max-w-full">
        {/* 숫자 표시 / 직접 입력 */}
        <div className="text-center w-full">
          {isEditing ? (
            <div className="flex flex-col items-center gap-3">
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={confirmEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                min={0}
                max={maxCount}
                className="text-[clamp(4rem,18vw,160px)] font-bold text-white font-mono bg-transparent border-b-4 border-blue-500 outline-none text-center w-full max-w-xs sm:max-w-md appearance-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
              <p className="text-slate-400 text-sm">Enter로 확인 · Esc로 취소</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {renderNumberDisplay()}
              <p className="text-slate-600 text-xs mt-1 select-none">
                {isRolling ? '🎲 굴리는 중...' : '탭하여 직접 입력'}
              </p>
            </div>
          )}
        </div>

        {/* 음성 + 랜덤 버튼 */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => speakNumber('ko')}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-2xl px-5 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={22} />
            <span className="font-bold">한글</span>
          </button>
          <button
            onClick={() => speakNumber('en')}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-2xl px-5 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={22} />
            <span className="font-bold">English</span>
          </button>
          <button
            onClick={handleRandom}
            disabled={isRolling || isEditing}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-white transition-all duration-75 shadow-lg active:scale-95 ${
              isRolling
                ? 'bg-gradient-to-b from-orange-500 to-orange-600 shadow-orange-500/50 animate-pulse'
                : 'bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 hover:shadow-orange-500/50'
            }`}
          >
            <Shuffle size={22} className={isRolling ? 'animate-spin' : ''} />
            <span>{isRolling ? '굴리는 중' : '랜덤'}</span>
          </button>
        </div>

        {/* +/- 버튼 */}
        <div className="flex gap-4 sm:gap-8 w-full max-w-sm">
          <button
            onClick={handleIncrement}
            disabled={isRolling}
            className="flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 active:from-slate-700 active:to-slate-800 text-white rounded-3xl py-16 sm:py-24 flex items-center justify-center transition-all duration-75 shadow-2xl hover:shadow-slate-500/50 active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-20 w-20 sm:h-[120px] sm:w-[120px]" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleDecrement}
            disabled={isRolling}
            className="flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 active:from-slate-700 active:to-slate-800 text-white rounded-3xl py-16 sm:py-24 flex items-center justify-center transition-all duration-75 shadow-2xl hover:shadow-slate-500/50 active:scale-95 disabled:opacity-40"
          >
            <Minus className="h-20 w-20 sm:h-[120px] sm:w-[120px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="text-slate-500 text-sm">
          자리수: {digits} · 증가치: {formatIncrement(increment)}
        </div>
      </div>
    </div>
  );
}
