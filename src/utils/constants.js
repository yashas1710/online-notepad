/**
 * 📋 Configuration Constants
 * Centralized configuration to avoid magic numbers scattered throughout code
 * 
 * Usage:
 *   import { TIMINGS, LIMITS, ERRORS, PATHS } from '../utils/constants';
 *   setTimeout(() => {}, TIMINGS.DEBOUNCE_SAVE);
 *   if (text.length > LIMITS.MAX_TEXT_LENGTH) { ... }
 */

// ============================================
// TIMING CONSTANTS (milliseconds)
// ============================================
export const TIMINGS = {
  /** How long to wait before saving to Firebase (batches keystrokes) */
  DEBOUNCE_SAVE: 500,
  
  /** How long to show "typing" indicator after last keystroke */
  TYPING_INDICATOR_TIMEOUT: 1500,
  
  /** Delay before retrying failed saves */
  RETRY_DELAY: 3000,
  
  /** Maximum number of retry attempts */
  RETRY_ATTEMPTS: 3,
  
  /** How long to show copy button success state */
  COPY_BUTTON_RESET: 2000,

  /** Backward-compatible key used by Notepad handlers */
  COPY_STATUS_RESET: 2000,
  
  /** Mobile/desktop responsiveness check debounce */
  RESIZE_DEBOUNCE: 250
};

// ============================================
// SIZE LIMITS
// ============================================
export const LIMITS = {
  /** Maximum text length (100 KB) */
  MAX_TEXT_LENGTH: 100 * 1024,
  
  /** Maximum note title length */
  MAX_NOTE_TITLE: 255,
  
  /** Maximum concurrent users before showing +N badge */
  MAX_PRESENCE_DISPLAY: 100
};

// ============================================
// UI CONSTANTS
// ============================================
export const UI = {
  /** Screen width breakpoint for mobile view (pixels) */
  MOBILE_BREAKPOINT: 768,
  
  /** Maximum avatars to display before +N badge */
  MAX_AVATAR_DISPLAY: 5
};

// ============================================
// ERROR MESSAGES
// ============================================
export const ERRORS = {
  TEXT_TOO_LARGE: '⚠️ Text exceeds 100KB. Consider splitting into multiple notes.',
  NETWORK_ERROR: '📡 No internet connection. Changes will sync when online.',
  PERMISSION_DENIED: '❌ Permission denied. This note may be read-only.',
  TIMEOUT: '⏱️ Connection timeout. Retrying...',
  SAVE_FAILED: '❌ Failed to save after multiple attempts. Copy your work.',
  SESSION_INIT: 'Initializing session...'
};

// ============================================
// FIREBASE PATHS
// ============================================
export const PATHS = {
  NOTES: 'notes',
  PRESENCE: 'presence'
};

// ============================================
// SUPPORTED LANGUAGES
// ============================================
export const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'json',
  'html',
  'css'
];

// ============================================
// LOCAL STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  USER_ID: 'notepad-user-id',
  PREFERENCES: 'notepad-preferences'
};
