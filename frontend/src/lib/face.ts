// Dò khuôn mặt để tính điểm lấy nét (ox,oy %) -> crop luôn giữ mặt trong khung.
// 3 lớp: (1) FaceDetector native (nhanh, Chrome/Edge) -> (2) MODEL ML face-api.js (mọi trình duyệt,
// tải lười từ CDN ~2MB lần đầu) -> (3) mặc định lệch lên trên (mặt thường ở nửa trên).
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const DEFAULT = { ox: 50, oy: 38 };

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src;
});

/* ---- lớp 2: model face-api.js (TinyFaceDetector) — tải 1 lần, dùng lại ---- */
const FA_VER = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13";
let faPromise: Promise<any> | null = null;
function loadFaceApi(): Promise<any> {
  if (faPromise) return faPromise;
  faPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("ssr"));
    const s = document.createElement("script");
    s.src = `${FA_VER}/dist/face-api.js`;
    s.async = true;
    s.onload = async () => {
      try {
        const fa = (window as any).faceapi;
        await fa.nets.tinyFaceDetector.loadFromUri(`${FA_VER}/model`);
        resolve(fa);
      } catch (e) { faPromise = null; reject(e); }
    };
    s.onerror = () => { faPromise = null; reject(new Error("cdn")); };
    document.head.appendChild(s);
  });
  return faPromise;
}

function unionCenter(boxes: { x: number; y: number; w: number; h: number }[], W: number, H: number) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const b of boxes) { minx = Math.min(minx, b.x); miny = Math.min(miny, b.y); maxx = Math.max(maxx, b.x + b.w); maxy = Math.max(maxy, b.y + b.h); }
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  return { ox: clamp((cx / W) * 100, 12, 88), oy: clamp((cy / H) * 100, 10, 82) };
}

export async function detectFocus(src: string): Promise<{ ox: number; oy: number }> {
  let img: HTMLImageElement;
  try { img = await loadImg(src); } catch { return DEFAULT; }
  const W = img.naturalWidth || 1, H = img.naturalHeight || 1;

  // (1) FaceDetector native
  try {
    const FD = (window as any).FaceDetector;
    if (FD) {
      const faces = await new FD({ fastMode: true, maxDetectedFaces: 8 }).detect(img);
      if (faces?.length) return unionCenter(faces.map((f: any) => ({ x: f.boundingBox.x, y: f.boundingBox.y, w: f.boundingBox.width, h: f.boundingBox.height })), W, H);
    }
  } catch { /* thử lớp 2 */ }

  // (2) MODEL ML face-api.js — chạy mọi trình duyệt
  try {
    const fa = await loadFaceApi();
    const dets = await fa.detectAllFaces(img, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }));
    if (dets?.length) return unionCenter(dets.map((d: any) => ({ x: d.box.x, y: d.box.y, w: d.box.width, h: d.box.height })), W, H);
  } catch { /* rơi xuống mặc định */ }

  return DEFAULT; // (3)
}
