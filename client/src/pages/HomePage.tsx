import { useLocation } from "wouter";
import { Calculator, BookOpen } from "lucide-react";

/**
 * 홈화면 페이지
 * - 계수기 앱으로 이동하는 버튼
 * - 한글 다이얼 앱으로 이동하는 버튼
 */
export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center px-4">
      {/* 타이틀 */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-white mb-4">아이 교육 앱</h1>
        <p className="text-lg text-slate-400">숫자와 한글을 배워보세요</p>
      </div>

      {/* 메인 버튼 */}
      <div className="flex flex-col gap-8 w-full max-w-sm">
        <button
          onClick={() => setLocation("/counter")}
          className="flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white rounded-3xl px-16 py-16 transition-all duration-75 shadow-2xl hover:shadow-blue-500/50 active:scale-95"
        >
          <Calculator size={80} strokeWidth={1.5} />
          <span className="text-2xl font-bold">계수기 시작</span>
        </button>
        <button
          onClick={() => setLocation("/hangeul")}
          className="flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white rounded-3xl px-16 py-16 transition-all duration-75 shadow-2xl hover:shadow-purple-500/50 active:scale-95"
        >
          <BookOpen size={80} strokeWidth={1.5} />
          <span className="text-2xl font-bold">한글 배우기</span>
        </button>
      </div>

      {/* 설명 텍스트 */}
      <div className="mt-16 max-w-2xl text-center">
        <div className="bg-slate-800/50 rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">📱 계수기</h2>
          <ul className="text-slate-300 space-y-2 text-left text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">✓</span>
              <span>1~천만 자리수 조절</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">✓</span>
              <span>1~백만 단위 증가치 선택</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">✓</span>
              <span>한글/영어 음성 안내</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">✓</span>
              <span>버튼 클릭 시 진동 피드백</span>
            </li>
          </ul>
          <hr className="my-4 border-slate-600" />
          <h2 className="text-xl font-bold text-white mb-4">📚 한글 배우기</h2>
          <ul className="text-slate-300 space-y-2 text-left text-sm">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">✓</span>
              <span>초성, 중성, 종성 다이얼로 한글 조합</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">✓</span>
              <span>실시간 글자 조합 및 음성 읽기</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">✓</span>
              <span>종성 ON/OFF 토글</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">✓</span>
              <span>자동 재생 모드</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
