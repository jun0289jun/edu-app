import { useEffect } from "react";

/**
 * 홈화면: 정적 "놀이터"(공유용 미니앱 모음)로 이동합니다.
 * 놀이터는 client/public/놀이터/ 에 있으며, 배포 후 /놀이터/ 로 서빙됩니다.
 * (숫자키·계산기·계수기·글자놀이·게임·카메라 등 포함)
 */
export default function HomePage() {
  useEffect(() => {
    window.location.replace("놀이터/");
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ fontSize: 20, fontWeight: 700 }}>놀이터로 이동 중… 🎈</p>
    </div>
  );
}
