// src/lib/storage.ts
// Firebase Storage 이미지 업로드 관련 함수

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

/** 이미지 파일인지(용량 포함) 검증합니다. 하나라도 잘못되면 어떤 파일이 문제인지 알려줍니다. */
function assertValidImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}"은(는) 이미지 파일이 아니에요.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`"${file.name}"의 용량이 너무 커요. (10MB 이하만 업로드할 수 있어요)`);
  }
}

/** 코스 커버 이미지 업로드. 경로: course-covers/{userId}/{timestamp}-{filename} */
export async function uploadCourseCover(userId: string, file: File): Promise<string> {
  const path = `course-covers/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** 피드 게시물 이미지(여러 장) 업로드. 경로: post-images/{userId}/{postId}/{index}-{filename} */
export async function uploadPostImages(
  userId: string,
  postId: string,
  files: File[]
): Promise<string[]> {
  const uploads = files.map(async (file, index) => {
    const path = `post-images/${userId}/${postId}/${index}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  });
  return Promise.all(uploads);
}

/** 프로필 아바타 업로드. 경로: avatars/{userId} */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `avatars/${userId}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** 여행 기록 사진(여러 장) 업로드. 경로: travel-log-photos/{userId}/{courseId}/{index}-{filename} */
export async function uploadTravelLogPhotos(
  userId: string,
  courseId: string,
  files: File[]
): Promise<string[]> {
  files.forEach(assertValidImageFile);
  const uploads = files.map(async (file, index) => {
    const path = `travel-log-photos/${userId}/${courseId}/${Date.now()}-${index}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  });
  return Promise.all(uploads);
}

export async function deleteFileByUrl(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef).catch(() => void 0);
}
