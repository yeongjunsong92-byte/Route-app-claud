// src/lib/firebase.ts
// Firebase 앱 초기화 및 서비스 인스턴스 export

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

// 환경변수는 .env(.local) 파일에 VITE_ 접두사로 정의합니다.
// 예: VITE_FIREBASE_API_KEY=xxxx
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

// getFirestore(app) 대신 initializeFirestore를 써서 long-polling 자동 감지를 켭니다.
// 일부 브라우저/네트워크(광고 차단 확장 프로그램, 사파리의 추적 방지, 특정 프록시 등)에서
// Firestore의 기본 스트리밍(WebChannel) 연결이 "Fetch API cannot load ... due to access control
// checks" 에러로 막히는 경우가 있는데, 이 옵션을 켜면 스트리밍이 실패할 때 자동으로
// 표준 long-polling 방식으로 전환해서 우회합니다. (경고 로그가 콘솔에 남을 수 있지만
// 정상 동작에는 지장 없습니다.)
export const db: Firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const storage: FirebaseStorage = getStorage(app);

// AI 추천처럼 비밀 API 키가 필요한 기능은 브라우저에 키를 두지 않고, Cloud Functions(서버)를
// 통해서만 호출합니다. 리전은 Firestore/Storage와 동일 프로젝트 기본 리전을 사용합니다.
export const functions: Functions = getFunctions(app);

export default app;
