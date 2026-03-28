import { createContext, useReducer, useContext } from 'react';

/**
 * 🧠 EditorContext
 * Centralized state management using Context + useReducer
 * Replaces prop drilling with clean (state, dispatch) interface
 * 
 * All component state lives here:
 * - Content (text, language)
 * - UI (focused, mobile, readonly)
 * - Sync (loading, syncing, errors)
 * - Presence (user count, typing)
 * - Copy buttons (status)
 * 
 * Usage:
 *   const { state, dispatch } = useEditor();
 *   dispatch({ type: 'SET_TEXT', payload: newText });
 */

const EditorContext = createContext();

/**
 * Initial state - all editor state in one place
 */
const initialState = {
  // ============================================
  // CONTENT STATE
  // ============================================
  text: '',
  language: 'javascript',

  // ============================================
  // UI STATE
  // ============================================
  isReadOnly: false,
  isFocused: false,
  isMobile: false,

  // ============================================
  // FIREBASE SYNC STATE
  // ============================================
  isLoading: true,
  isSyncing: false,
  syncError: '',
  syncErrorMessage: '',
  hasPendingRemote: false,
  lastSavedAt: null,
  retryCount: 0,

  // ============================================
  // REAL-TIME COLLABORATION STATE
  // ============================================
  presenceCount: null, // null = loading, 0 = solo, N = N users
  isTyping: false,

  // ============================================
  // UI FEEDBACK STATE
  // ============================================
  copyStatus: '📋 Copy Link',
  codeCopyStatus: '📋'
};

/**
 * Reducer: Pure function that handles state updates
 * Every action is explicit and traceable
 */
function editorReducer(state, action) {
  switch (action.type) {
    // ============================================
    // CONTENT MUTATIONS
    // ============================================
    case 'SET_TEXT':
      return { ...state, text: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    // ============================================
    // UI MUTATIONS
    // ============================================
    case 'SET_FOCUSED':
      return { ...state, isFocused: action.payload };
    case 'SET_MOBILE':
      return { ...state, isMobile: action.payload };
    case 'SET_READONLY':
      return { ...state, isReadOnly: action.payload };

    // ============================================
    // SYNC STATE MUTATIONS
    // ============================================
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_SYNC_ERROR':
      return { ...state, syncError: action.payload };
    case 'SET_SYNC_ERROR_MESSAGE':
      return { ...state, syncErrorMessage: action.payload };
    case 'SET_PENDING_REMOTE':
      return { ...state, hasPendingRemote: action.payload };
    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.payload };
    case 'SET_RETRY_COUNT':
      return { ...state, retryCount: action.payload };

    // ============================================
    // PRESENCE MUTATIONS
    // ============================================
    case 'SET_PRESENCE_COUNT':
      return { ...state, presenceCount: action.payload };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };

    // ============================================
    // COPY BUTTON MUTATIONS
    // ============================================
    case 'SET_COPY_STATUS':
      return { ...state, copyStatus: action.payload };
    case 'SET_CODE_COPY_STATUS':
      return { ...state, codeCopyStatus: action.payload };

    // ============================================
    // BATCH MUTATIONS (multiple state updates at once)
    // ============================================
    case 'SYNC_SUCCESS':
      return {
        ...state,
        isSyncing: false,
        syncError: '',
        syncErrorMessage: '',
        retryCount: 0,
        lastSavedAt: action.payload
      };

    case 'SYNC_ERROR':
      return {
        ...state,
        isSyncing: false,
        syncError: action.payload.error,
        syncErrorMessage: action.payload.message
      };

    case 'APPLY_REMOTE_UPDATE':
      return {
        ...state,
        text: action.payload.text,
        language: action.payload.language,
        lastSavedAt: action.payload.lastSavedAt,
        hasPendingRemote: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        syncError: '',
        syncErrorMessage: ''
      };

    // ============================================
    // LOADING COMPLETE
    // ============================================
    case 'LOAD_COMPLETE':
      return {
        ...state,
        isLoading: false,
        syncError: ''
      };

    default:
      console.warn(`Unknown action: ${action.type}`);
      return state;
  }
}

/**
 * EditorProvider Component
 * Wraps app with state management
 */
export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
}

/**
 * useEditor Hook
 * Use this in any component to access editor state
 * 
 * Usage:
 *   const { state, dispatch } = useEditor();
 *   const { text, isLoading } = state;
 *   dispatch({ type: 'SET_TEXT', payload: 'new text' });
 */
export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}
