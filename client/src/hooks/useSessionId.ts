/**
 * 브라우저 localStorage에 고유 세션 ID를 생성/유지하는 훅.
 * 비로그인 사용자도 DB에 데이터를 저장할 수 있도록 식별자를 제공한다.
 */
import { useMemo } from "react";

const SESSION_KEY = "edu-app-session-id";

function generateId(): string {
  // crypto.randomUUID 지원 여부 확인 후 fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useSessionId(): string {
  return useMemo(() => {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const id = generateId();
      localStorage.setItem(SESSION_KEY, id);
      return id;
    } catch {
      // localStorage 접근 불가 시 임시 ID 반환
      return generateId();
    }
  }, []);
}
