const deviceModeKey = "carelink-device-mode";
const pinUnlockedPrefix = "carelink-pin-unlocked-";
const pinRecordPrefix = "carelink-pin-record-";
const activityPrefix = "carelink-last-activity-";
const encoder = new TextEncoder();

type PinRecord = {
  salt: string;
  hash: string;
  createdAt: string;
};

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function hashPin(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToBase64(bits);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function saveDeviceMode(personalDevice: boolean) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(deviceModeKey, personalDevice ? "personal" : "shared");
}

export function loadDeviceMode() {
  if (typeof localStorage === "undefined") return "personal";
  return localStorage.getItem(deviceModeKey) === "shared" ? "shared" : "personal";
}

export function hasPin(userId: string) {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(`${pinRecordPrefix}${userId}`));
}

export function touchDeviceActivity(userId: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`${activityPrefix}${userId}`, String(Date.now()));
}

export function isDeviceActivityExpired(userId: string, timeoutMs: number) {
  if (typeof localStorage === "undefined") return false;
  const lastActivity = Number(localStorage.getItem(`${activityPrefix}${userId}`));
  return !Number.isFinite(lastActivity) || Date.now() - lastActivity >= timeoutMs;
}

export async function createPin(userId: string, pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error("Use a 4 to 8 digit PIN.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const record: PinRecord = {
    salt: bytesToBase64(salt),
    hash: await hashPin(pin, salt),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(`${pinRecordPrefix}${userId}`, JSON.stringify(record));
  unlockPinForThisSession(userId);
}

export async function verifyPin(userId: string, pin: string) {
  const raw = localStorage.getItem(`${pinRecordPrefix}${userId}`);
  if (!raw) return false;
  const record = JSON.parse(raw) as PinRecord;
  const nextHash = await hashPin(pin, base64ToBytes(record.salt));
  const ok = timingSafeEqual(nextHash, record.hash);
  if (ok) unlockPinForThisSession(userId);
  return ok;
}

export function unlockPinForThisSession(userId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${pinUnlockedPrefix}${userId}`, "true");
}

export function lockPinForThisSession(userId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${pinUnlockedPrefix}${userId}`);
}

export function isPinUnlocked(userId: string) {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(`${pinUnlockedPrefix}${userId}`) === "true";
}
