"use client";

export function getMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

/**
 * Asks the user to share the video-call tab (or a screen). The audio track is
 * the interviewer's voice; the video track is kept for the "analyse screen" mode.
 * Chromium options are passed through: unknown keys are ignored by other browsers.
 */
export async function getDisplayCapture(withAudio: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Le partage d'onglet n'est pas disponible dans ce navigateur. Utilisez Chrome ou Edge sur ordinateur.");
  }
  const options = {
    video: { frameRate: 5 },
    audio: withAudio ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false,
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "include",
    preferCurrentTab: false,
  } as DisplayMediaStreamOptions;
  return navigator.mediaDevices.getDisplayMedia(options);
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Grabs one frame of a live video track as a JPEG data URL (long edge ≤ 1568 px). */
export async function grabFrame(stream: MediaStream, maxEdge = 1568): Promise<string> {
  const track = stream.getVideoTracks().find((t) => t.readyState === "live");
  if (!track) throw new Error("Aucun écran partagé.");
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  await video.play();
  if (!video.videoWidth) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
  await new Promise((r) => requestAnimationFrame(r));

  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Capture impossible.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  video.pause();
  video.srcObject = null;
  return canvas.toDataURL("image/jpeg", 0.88);
}

/** Reads an image file (upload fallback for the screen mode) as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}
