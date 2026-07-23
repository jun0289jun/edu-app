import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* 떠다니는 이모지 */}
      <div
        style={{
          fontSize: "5rem",
          marginBottom: "1rem",
          animation: "float 3s ease-in-out infinite",
        }}
      >
        🎈
      </div>

      {/* 큰 숫자 */}
      <div
        style={{
          fontSize: "clamp(5rem, 20vw, 10rem)",
          fontWeight: 900,
          lineHeight: 1,
          background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "0.5rem",
          letterSpacing: "-0.05em",
        }}
      >
        404
      </div>

      {/* 메시지 */}
      <p
        style={{
          fontSize: "clamp(1.2rem, 4vw, 1.6rem)",
          fontWeight: 700,
          color: "#e2e8f0",
          marginBottom: "0.5rem",
        }}
      >
        앗! 길을 잃었어요 🗺️
      </p>
      <p
        style={{
          fontSize: "clamp(0.9rem, 3vw, 1.1rem)",
          color: "#94a3b8",
          marginBottom: "2.5rem",
          lineHeight: 1.6,
        }}
      >
        찾는 페이지가 없어요.
        <br />
        놀이터로 돌아가 볼까요?
      </p>

      {/* 홈 버튼 */}
      <button
        onClick={() => setLocation("/")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.85rem 2rem",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          border: "none",
          borderRadius: "9999px",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(99,102,241,0.55)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)";
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
      >
        🏠 놀이터로 가기
      </button>

      {/* float 애니메이션 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
