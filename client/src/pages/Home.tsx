import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";

/**
 * 4자리 계수기 앱
 * - 0000~9999 범위의 숫자를 표시
 * - + 버튼으로 1씩 증가, - 버튼으로 1씩 감소
 * - 버튼 클릭 시 진동 효과 발생
 * - 범위를 초과하면 순환 (9999 → 0, -1 → 9999)
 */
export default function Home() {
  const [count, setCount] = useState(0);

  // 진동 효과 함수
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // 50ms 진동
    }
  };

  // + 버튼 클릭
  const handleIncrement = () => {
    triggerVibration();
    setCount((prev) => (prev + 1) % 10000);
  };

  // - 버튼 클릭
  const handleDecrement = () => {
    triggerVibration();
    setCount((prev) => (prev - 1 + 10000) % 10000);
  };

  // 4자리 숫자로 포맷팅
  const displayCount = String(count).padStart(4, "0");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4">
      {/* 헤더 영역 */}
      <div className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-6 text-white">
        <button className="text-2xl hover:opacity-70 transition-opacity">
          ←
        </button>
        <div className="flex gap-4">
          <button className="text-2xl hover:opacity-70 transition-opacity">
            ≡
          </button>
          <button className="text-2xl hover:opacity-70 transition-opacity">
            ⚙
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center justify-center flex-1 gap-16">
        {/* 4자리 숫자 표시 */}
        <div className="text-center">
          <div className="text-[200px] font-bold text-white tracking-wider font-mono drop-shadow-2xl leading-none">
            {displayCount}
          </div>
        </div>

        {/* 버튼 영역 */}
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
      </div>
    </div>
  );
}
