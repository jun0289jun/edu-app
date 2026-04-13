import { useState } from "react";
import { Plus, Minus, Settings, ArrowLeft, Volume2 } from "lucide-react";
import { useLocation } from "wouter";

/**
 * 아이 교육용 계수기 앱
 * - 의미 있는 숫자만 강조 표시 (앞의 0은 투명)
 * - 자리수 조절 (1~7자리: 천만까지)
 * - 증가치 조절 (1, 10, 100, 1000, 10000, 100000, 1000000)
 * - 버튼 클릭 시 진동 효과
 */
export default function CounterPage() {
  const [, setLocation] = useLocation();
  const [count, setCount] = useState(0);
  const [digits, setDigits] = useState(4);
  const [increment, setIncrement] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // 진동 효과 함수
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // 최대값 계산 (자리수에 따라)
  const maxCount = Math.pow(10, digits) - 1;

  // + 버튼 클릭
  const handleIncrement = () => {
    triggerVibration();
    setCount((prev) => (prev + increment) % (maxCount + 1));
  };

  // - 버튼 클릭
  const handleDecrement = () => {
    triggerVibration();
    setCount((prev) => (prev - increment + (maxCount + 1)) % (maxCount + 1));
  };

  // 자리수별로 포맷팅
  const displayCount = String(count).padStart(digits, "0");

  // 의미 있는 숫자와 무의미한 숫자 분리
  const renderNumberWithTransparency = () => {
    const countStr = String(count);
    const leadingZeros = digits - countStr.length;

    return (
      <div className="text-[200px] font-bold text-white tracking-wider font-mono drop-shadow-2xl leading-none flex justify-center">
        {Array.from({ length: digits }).map((_, idx) => {
          const isLeadingZero = idx < leadingZeros;
          const digit = displayCount[idx];
          return (
            <span
              key={idx}
              className={`transition-opacity duration-300 ${
                isLeadingZero ? "opacity-30" : "opacity-100"
              }`}
            >
              {digit}
            </span>
          );
        })}
      </div>
    );
  };

  // 한글 숫자 변환 (자연스러운 발음)
  const convertToKorean = (num: number): string => {
    const koreanNumbers = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    
    if (num === 0) return '영';
    
    let result = '';
    
    // 백만 단위
    const millions = Math.floor(num / 1000000);
    if (millions > 0) {
      result += millions === 1 ? '백만' : koreanNumbers[millions] + '백만';
    }
    
    // 십만 단위
    const hundredThousands = Math.floor((num % 1000000) / 100000);
    if (hundredThousands > 0) {
      result += hundredThousands === 1 ? '십만' : koreanNumbers[hundredThousands] + '십만';
    }
    
    // 만 단위
    const tenThousands = Math.floor((num % 100000) / 10000);
    if (tenThousands > 0) {
      result += koreanNumbers[tenThousands] + '만';
    }
    
    // 천 단위
    const thousands = Math.floor((num % 10000) / 1000);
    if (thousands > 0) {
      result += thousands === 1 ? '천' : koreanNumbers[thousands] + '천';
    }
    
    // 백 단위
    const hundreds = Math.floor((num % 1000) / 100);
    if (hundreds > 0) {
      result += hundreds === 1 ? '백' : koreanNumbers[hundreds] + '백';
    }
    
    // 십 단위
    const tens = Math.floor((num % 100) / 10);
    if (tens > 0) {
      result += tens === 1 ? '십' : koreanNumbers[tens] + '십';
    }
    
    // 일 단위
    const ones = num % 10;
    if (ones > 0) {
      result += koreanNumbers[ones];
    }
    
    return result;
  };

  // 영어 숫자 변환
  const convertToEnglish = (num: number): string => {
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million'];
    
    if (num === 0) return 'zero';
    
    const convertHundreds = (n: number): string => {
      let result = '';
      const hundred = Math.floor(n / 100);
      if (hundred > 0) {
        result += ones[hundred] + ' hundred';
      }
      const remainder = n % 100;
      if (remainder >= 20) {
        if (result) result += ' ';
        result += tens[Math.floor(remainder / 10)];
        if (remainder % 10 > 0) {
          result += ' ' + ones[remainder % 10];
        }
      } else if (remainder >= 10) {
        if (result) result += ' ';
        result += teens[remainder - 10];
      } else if (remainder > 0) {
        if (result) result += ' ';
        result += ones[remainder];
      }
      return result;
    };
    
    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkText = convertHundreds(chunk);
        if (scaleIndex > 0) {
          result = chunkText + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
        } else {
          result = chunkText + (result ? ' ' + result : '');
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    return result;
  };

  // 음성 재생 함수
  const speakNumber = (lang: 'ko' | 'en') => {
    const text = lang === 'ko' ? convertToKorean(count) : convertToEnglish(count);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  // 증가치 표시 포맷
  const formatIncrement = (inc: number) => {
    if (inc >= 1000000) return `+${(inc / 1000000).toFixed(0)}백만`;
    if (inc >= 100000) return `+${(inc / 100000).toFixed(0)}십만`;
    if (inc >= 10000) return `+${(inc / 10000).toFixed(0)}만`;
    if (inc >= 1000) return `+${(inc / 1000).toFixed(0)}천`;
    if (inc >= 100) return `+${inc / 100}백`;
    if (inc >= 10) return `+${inc / 10}십`;
    return `+${inc}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4 relative">
      {/* 헤더 영역 */}
      <div className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-6 text-white">
        <button
          onClick={() => setLocation("/")}
          className="text-2xl hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={32} />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            <Settings size={32} />
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="absolute top-24 right-6 bg-slate-800 rounded-2xl p-6 shadow-2xl z-50 w-96 max-h-[70vh] overflow-y-auto">
          <h2 className="text-white text-lg font-bold mb-6">설정</h2>

          {/* 자리수 조절 */}
          <div className="mb-8">
            <p className="text-slate-300 text-sm font-semibold mb-3">자리수</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDigits(d);
                    setCount(0);
                  }}
                  className={`py-2 px-4 rounded-lg font-bold transition-all ${
                    digits === d
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-slate-400 text-xs mt-2">
              현재: {Array(digits).fill(0).join("")}
            </p>
          </div>

          {/* 증가치 조절 */}
          <div>
            <p className="text-slate-300 text-sm font-semibold mb-3">증가치</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 10, 100, 1000, 10000, 100000, 1000000].map((inc) => (
                <button
                  key={inc}
                  onClick={() => setIncrement(inc)}
                  className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                    increment === inc
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {formatIncrement(inc)}
                </button>
              ))}
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
          >
            닫기
          </button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center flex-1 gap-16">
        {/* 숫자 표시 */}
        <div className="text-center">{renderNumberWithTransparency()}</div>

        {/* 음성 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={() => speakNumber('ko')}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-2xl px-6 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={24} />
            <span className="font-bold">한글</span>
          </button>
          <button
            onClick={() => speakNumber('en')}
            className="flex items-center gap-2 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-2xl px-6 py-3 transition-all duration-75 shadow-lg hover:shadow-purple-500/50 active:scale-95"
          >
            <Volume2 size={24} />
            <span className="font-bold">English</span>
          </button>
        </div>

        {/* 버튼 영억 */}
        <div className="flex gap-8 w-full max-w-sm">
          {/* + 버튼 */}
          <button
            onClick={handleIncrement}
            className="flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 active:from-slate-700 active:to-slate-800 text-white rounded-3xl py-24 flex items-center justify-center transition-all duration-75 shadow-2xl hover:shadow-slate-500/50 active:scale-95"
          >
            <Plus size={120} strokeWidth={1.5} />
          </button>

          {/* - 버튼 */}
          <button
            onClick={handleDecrement}
            className="flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 active:from-slate-700 active:to-slate-800 text-white rounded-3xl py-24 flex items-center justify-center transition-all duration-75 shadow-2xl hover:shadow-slate-500/50 active:scale-95"
          >
            <Minus size={120} strokeWidth={1.5} />
          </button>
        </div>

        {/* 현재 설정 표시 */}
        <div className="text-slate-400 text-sm mt-8">
          <p>자리수: {digits} | 증가치: {formatIncrement(increment)}</p>
        </div>
      </div>
    </div>
  );
}
