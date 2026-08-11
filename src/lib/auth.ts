// src/lib/auth.ts
// Firebase Authentication 래퍼 함수 모음

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();

/** 이메일/비밀번호로 회원가입 후 users 컬렉션에 프로필 문서를 생성합니다. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserProfileDoc(user, displayName);
  return user;
}

/** 이메일/비밀번호로 로그인합니다. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

/** 구글 팝업 로그인. 최초 로그인 시에만 프로필 문서를 생성하고, 기존 유저는 프로필을 그대로 유지합니다. */
export async function signInWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider);
  const existing = await getDoc(doc(db, "users", user.uid));
  if (!existing.exists()) {
    await createUserProfileDoc(user, user.displayName ?? "여행자");
  }
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** users/{uid} 문서가 없으면 기본 프로필로 생성합니다. merge: true라 이미 있으면 덮어쓰지 않습니다. */
async function createUserProfileDoc(user: User, displayName: string) {
  const ref = doc(db, "users", user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      displayName,
      email: user.email ?? "",
      avatarUrl: user.photoURL ?? "",
      bio: "",
      followerCount: 0,
      followingCount: 0,
      courseCount: 0,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
