import { initializeApp } from "firebase/app";
import { getDatabase, ref as dbRef, set as dbSet, onValue as dbOnValue, onDisconnect as dbDisconnect } from "firebase/database";

// ============================================
// ENVIRONMENT GUARD: Fail loudly if API key is missing
// ============================================
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    '❌ FATAL: Firebase API Key is missing!\n' +
    'Environment Variable: VITE_FIREBASE_API_KEY\n' +
    'Action: Add your Firebase config to your .env file or Vercel/hosting environment variables.\n' +
    'This prevents infinite loading screens and ensures proper initialization.'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with required config
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ✅ STORAGE REMOVED: Bundle size optimized (-25KB)
// All file operations now use Realtime Database + localStorage for client-side caching

// Export Database instances alongside helper functions
// Allows single point of initialization across entire app
export { 
  // Core instance
  database, 
  
  // Database helper functions with tree-shaking aliases
  dbRef as ref, 
  dbSet as set, 
  dbOnValue as onValue, 
  dbDisconnect as onDisconnect,
  
  // App reference if needed elsewhere
  app
};