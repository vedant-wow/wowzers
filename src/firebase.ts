import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { FIREBASE_CONFIG } from "./config";
import type { User } from "./types";

// Firebase state
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let currentUser: User | null = null;

// Initialize Firebase
export function initFirebase(): void {
  if (FIREBASE_CONFIG.apiKey) {
    try {
      app = initializeApp(FIREBASE_CONFIG);
      db = getFirestore(app);
      console.log("Firebase initialized");
    } catch (e) {
      console.error("Firebase init error:", e);
      alert("Firebase Error: Check console.");
    }
  } else {
    console.warn("Firebase config missing.");
  }
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  if (!db) return false;

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (e) {
    console.error("Check username error:", e);
    return false;
  }
}

export async function loginUser(username: string): Promise<User | null> {
  if (!db) {
    currentUser = { id: `local_${Date.now()}`, username };
    return currentUser;
  }

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      currentUser = { id: docSnap.id, ...docSnap.data() } as User;
      return currentUser;
    }
    return null;
  } catch (e) {
    console.error("Login error:", e);
    return null;
  }
}

export async function registerUser(
  username: string,
  email?: string
): Promise<User | null> {
  if (!db) {
    currentUser = { id: `offline_${Date.now()}`, username };
    return currentUser;
  }

  try {
    const docRef = await addDoc(collection(db, "users"), {
      username,
      email: email || "",
      createdAt: serverTimestamp(),
      totalGames: 0,
    });

    currentUser = { id: docRef.id, username };
    console.log("User registered with ID:", docRef.id);
    return currentUser;
  } catch (e) {
    console.error("Error adding user:", e);
    currentUser = { id: `offline_${Date.now()}`, username };
    return currentUser;
  }
}

export async function saveScore(score: number): Promise<void> {
  if (!db || !currentUser || currentUser.id.startsWith("local_")) {
    return;
  }

  const finalScore = Math.floor(score);
  console.log(`Saving score ${finalScore} for user ${currentUser.username}`);

  try {
    await addDoc(collection(db, "scores"), {
      userId: currentUser.id,
      username: currentUser.username,
      score: finalScore,
      timestamp: serverTimestamp(),
    });
    console.log("Score saved successfully!");

    const userRef = doc(db, "users", currentUser.id);
    await updateDoc(userRef, {
      totalGames: increment(1),
    });
  } catch (e) {
    console.error("Error saving score:", e);
  }
}

export async function loadLeaderboards(): Promise<{
  mostGames: Array<{ username: string; totalGames: number }>;
  highestScores: Array<{ username: string; score: number }>;
}> {
  if (!db) {
    return { mostGames: [], highestScores: [] };
  }

  try {
    const gamesQuery = query(
      collection(db, "users"),
      orderBy("totalGames", "desc"),
      limit(5)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    const mostGames = gamesSnapshot.docs.map((doc) => ({
      username: doc.data().username,
      totalGames: doc.data().totalGames || 0,
    }));

    const scoresQuery = query(
      collection(db, "scores"),
      orderBy("score", "desc"),
      limit(5)
    );
    const scoresSnapshot = await getDocs(scoresQuery);
    const highestScores = scoresSnapshot.docs.map((doc) => ({
      username: doc.data().username,
      score: doc.data().score,
    }));

    return { mostGames, highestScores };
  } catch (e) {
    console.error("Error loading leaderboards:", e);
    return { mostGames: [], highestScores: [] };
  }
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function logout(): void {
  currentUser = null;
}

export function isOnline(): boolean {
  return db !== null;
}
