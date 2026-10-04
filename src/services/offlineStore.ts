import type { CareLinkPatientData } from "@/src/types";
import type { FootCheckRecord } from "@/src/services/footCheckService";

const DB_NAME = "carelink-offline";
const DB_VERSION = 1;
const PATIENT_STORE = "patient";
const FOOT_CHECK_STORE = "footChecks";

type StoredPatientSession = {
  id: "active";
  userId: string;
  accessToken: string;
  patient: CareLinkPatientData;
  savedAt: string;
};

export type StoredFootCheck = FootCheckRecord & {
  userId: string;
  imageBlob: Blob;
  imageName: string;
  imageType: string;
  syncStatus: "pending" | "synced";
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PATIENT_STORE)) {
        database.createObjectStore(PATIENT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(FOOT_CHECK_STORE)) {
        const store = database.createObjectStore(FOOT_CHECK_STORE, { keyPath: "id" });
        store.createIndex("userId", "userId");
        store.createIndex("syncStatus", "syncStatus");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("CareLink offline storage could not open."));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    let result: T;
    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error("CareLink offline storage request failed."));
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("CareLink offline storage transaction failed."));
    };
  });
}

export async function saveOfflineSession(session: Omit<StoredPatientSession, "id" | "savedAt">) {
  if (typeof indexedDB === "undefined") return;
  await withStore(PATIENT_STORE, "readwrite", (store) =>
    store.put({ ...session, id: "active", savedAt: new Date().toISOString() }),
  );
}

export async function loadOfflineSession() {
  if (typeof indexedDB === "undefined") return null;
  try {
    return await withStore<StoredPatientSession | undefined>(PATIENT_STORE, "readonly", (store) =>
      store.get("active"),
    ) ?? null;
  } catch {
    return null;
  }
}

export async function clearOfflineSession() {
  if (typeof indexedDB === "undefined") return;
  await withStore(PATIENT_STORE, "readwrite", (store) => store.delete("active"));
}

export async function saveOfflineFootCheck(
  userId: string,
  answers: { redness: boolean; swelling: boolean; warmth: boolean },
  file: File,
  syncStatus: "pending" | "synced" = "pending",
  remoteImageUrl = "",
) {
  const symptomCount = Number(answers.redness) + Number(answers.swelling) + Number(answers.warmth);
  const recommendation = symptomCount > 0 ? "doctor_attention" as const : "monitor" as const;
  const record: StoredFootCheck = {
    id: crypto.randomUUID(),
    userId,
    redness: answers.redness,
    swelling: answers.swelling,
    warmth: answers.warmth,
    symptomCount,
    recommendation,
    createdAt: new Date().toISOString(),
    imageUrl: remoteImageUrl,
    imageBlob: file,
    imageName: file.name,
    imageType: file.type,
    syncStatus,
  };
  await withStore(FOOT_CHECK_STORE, "readwrite", (store) => store.put(record));
  return record;
}

export async function listOfflineFootChecks(userId: string): Promise<StoredFootCheck[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const database = await openDatabase();
    return await new Promise<StoredFootCheck[]>((resolve, reject) => {
      const transaction = database.transaction(FOOT_CHECK_STORE, "readonly");
      const request = transaction.objectStore(FOOT_CHECK_STORE).index("userId").getAll(userId);
      request.onsuccess = () => {
        const records = (request.result ?? [])
          .map((record) => ({
            ...record,
            imageUrl: record.imageUrl || URL.createObjectURL(record.imageBlob),
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(records);
      };
      request.onerror = () => reject(request.error ?? new Error("CareLink offline records could not load."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error("CareLink offline records could not load."));
      };
    });
  } catch {
    return [];
  }
}

export async function pendingOfflineFootChecks(userId: string) {
  return (await listOfflineFootChecks(userId)).filter((record) => record.syncStatus === "pending");
}

export async function markOfflineFootCheckSynced(id: string, imageUrl = "") {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FOOT_CHECK_STORE, "readwrite");
    const store = transaction.objectStore(FOOT_CHECK_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as StoredFootCheck | undefined;
      if (record) store.put({ ...record, syncStatus: "synced", imageUrl: imageUrl || record.imageUrl });
    };
    request.onerror = () => reject(request.error ?? new Error("CareLink offline record could not update."));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("CareLink offline record could not update."));
    };
  });
}
