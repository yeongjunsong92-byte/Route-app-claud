// src/screens/LoginScreen.tsx
// 로그인 / 회원가입 화면

import { useState } from "react";
import { Mail, Lock, User, MapPin } from "lucide-react";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "../lib/auth";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName || "여행자");
      }
    } catch (err) {
      setError(err instanceof Error ? mapFirebaseError(err.message) : "문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("구글 로그인에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-8">
      <div className="mb-10 flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
          <MapPin size={26} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-800">Route</h1>
        <p className="mt-1 text-sm text-gray-600">나만의 여행 코스를 만들고 공유하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 transition-colors focus-within:border-primary">
            <User size={16} className="text-gray-600" />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="닉네임"
              className="w-full bg-transparent text-sm focus:outline-none"
              required
            />
          </label>
        )}
        <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 transition-colors focus-within:border-primary">
          <Mail size={16} className="text-gray-600" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full bg-transparent text-sm focus:outline-none"
            required
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 transition-colors focus-within:border-primary">
          <Lock size={16} className="text-gray-600" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full bg-transparent text-sm focus:outline-none"
            required
            minLength={6}
          />
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="tap-scale mt-2 flex h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-300" />
        <span className="text-xs text-gray-600">또는</span>
        <div className="h-px flex-1 bg-gray-300" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="tap-scale flex h-12 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-800"
      >
        Google로 계속하기
      </button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-center text-sm text-gray-600"
      >
        {mode === "login" ? (
          <>
            아직 계정이 없으신가요? <span className="font-semibold text-primary">회원가입</span>
          </>
        ) : (
          <>
            이미 계정이 있으신가요? <span className="font-semibold text-primary">로그인</span>
          </>
        )}
      </button>
    </div>
  );
}

function mapFirebaseError(message: string): string {
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }
  if (message.includes("auth/email-already-in-use")) {
    return "이미 사용 중인 이메일이에요.";
  }
  if (message.includes("auth/weak-password")) {
    return "비밀번호는 6자 이상이어야 해요.";
  }
  return "문제가 발생했어요. 다시 시도해주세요.";
}
