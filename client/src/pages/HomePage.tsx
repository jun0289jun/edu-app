import { useLocation } from "wouter";
import { Calculator } from "lucide-react";

/**
 * 홈화면 페이지
 * - 계수기 앱으로 이동하는 버튼
 */
export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4">
      {/* 타이틀 */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-white mb-4">숫자 계수기</h1>
        <p className="text-xl text-slate-400">아이 교육용 계수 학습 앱</p>
      </div>

      {/* 메인 버튼 */}
      <button
        onClick={() => setLocation("/counter")}
        className="flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white rounded-3xl px-16 py-20 transition-all duration-75 shadow-2xl hover:shadow-blue-500/50 active:scale-95"
      >
        <Calculator size={100} strokeWidth={1.5} />
        <span className="text-3xl font-bold">계수기 시작</span>
      </button>

      {/* 설명 텍스트 */}
      <div className="mt-20 max-w-2xl text-center">
        <div className="bg-slate-800/50 rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">기능</h2>
          <ul className="text-slate-300 space-y-3 text-left">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">✓</span>
              <span>1자리부터 천만(7자리)까지 자리수 조절</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">✓</span>
              <span>1, 10, 100, 1000, 10000, 100000, 1000000 단위로 증가치 선택</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">✓</span>
              <span>의미 있는 숫자만 강조 표시</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">✓</span>
              <span>버튼 클릭 시 진동 피드백</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
