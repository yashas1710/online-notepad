import { useEffect, useRef, useCallback } from 'react';
import { database, ref, set, onValue } from '../firebase';
import { sanitizeInput, validateTextLength } from '../utils/sanitization';
import { useEditor } from '../context/EditorContext';
import Logger from '../utils/logger';
import { TIMINGS, LIMITS, ERRORS } from '../utils/constants';

/**
 * 🔄 useFirebaseSync Hook
 * Handles all Firebase real-time database synchronization
 * 
 * ✅ No prop drilling (uses context via useEditor)
 * ✅ Proper retry queue implementation
 * ✅ Replaced console.logs with Logger utility
 * ✅ Uses constants for all magic numbers
 */
export const useFirebaseSync = (noteId) => {
  const { state, dispatch } = useEditor();
  const lastSyncedTextRef = useRef('');
  const currentVersionRef = useRef(0);
  const textRef = useRef(state.text);
  const isFocusedRef = useRef(state.isFocused);
  const isTypingRef = useRef(state.isTyping);
  const pendingRemoteRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const retryQueueRef = useRef([]);

  // Initialize BroadcastChannel for cross-tab sync
  useEffect(() => {
    if (!noteId) return;

    try {
      const channel = new BroadcastChannel(`notepad-${noteId}`);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, text: incomingText, lastUpdated } = event.data;

        if (type === 'SYNC' && !isFocusedRef.current) {
          textRef.current = incomingText;
          lastSyncedTextRef.current = incomingText;
          dispatch({
            type: 'APPLY_REMOTE_UPDATE',
            payload: {
              text: incomingText,
              language: state.language,
              lastSavedAt: new Date(lastUpdated || Date.now())
            }
          });
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch (err) {
      Logger.warn('BroadcastChannel not available', err.message);
    }
  }, [noteId, dispatch, state.language]);

  // Keep refs in sync with state changes
  useEffect(() => {
    textRef.current = state.text;
  }, [state.text]);

  useEffect(() => {
    isFocusedRef.current = state.isFocused;
  }, [state.isFocused]);

  useEffect(() => {
    isTypingRef.current = state.isTyping;
  }, [state.isTyping]);

  /**
   * Get user-friendly error message
   */
  const getSyncErrorMessage = useCallback((error) => {
    if (error.code === 'PERMISSION_DENIED') {
      return ERRORS.PERMISSION_DENIED;
    }
    if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      return ERRORS.NETWORK_ERROR;
    }
    if (error.message?.includes('timeout')) {
      return ERRORS.TIMEOUT;
    }
    return ERRORS.SAVE_FAILED;
  }, []);

  /**
   * Check if error is network-related (retriable)
   */
  const isNetworkError = useCallback((error) => {
    return (
      error.message?.includes('network') ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('timeout')
    );
  }, []);

  /**
   * 📡 Setup real-time sync listener
   */
  const setupSyncListener = useCallback(() => {
    if (!noteId) return undefined;

    dispatch({ type: 'SET_LOADING', payload: true });

    const noteRef = ref(database, `notes/${noteId}`);

    const unsubscribe = onValue(
      noteRef,
      (snapshot) => {
        const rawData = snapshot.val();

        if (rawData === null) {
          const now = Date.now();
          const initialPayload = {
            text: '',
            lastUpdated: now,
            updatedAt: now,
            language: state.language || 'plaintext',
            version: 0
          };

          set(noteRef, initialPayload).catch((error) => {
            Logger.warn('Failed to initialize note schema', error);
          });
        }

        // Handle empty note
        const payload =
          rawData && typeof rawData === 'object'
            ? rawData
            : {
                text: rawData !== null && rawData !== undefined ? String(rawData) : '',
                lastUpdated: Date.now()
              };

        const incomingText = payload.text ?? '';
        const incomingSavedAt = payload.lastUpdated || payload.updatedAt
          ? new Date(payload.lastUpdated || payload.updatedAt)
          : null;

        currentVersionRef.current =
          typeof payload.version === 'number' && payload.version >= 0
            ? payload.version
            : 0;

        Logger.debug('Sync listener received data', {
          hasText: typeof incomingText === 'string',
          textLength: incomingText.length
        });

        lastSyncedTextRef.current = incomingText;

        if (incomingSavedAt) {
          dispatch({ type: 'SET_LAST_SAVED', payload: incomingSavedAt });
        }

        // CURSOR JUMP PROTECTION:
        // Only defer when user has local unsynced edits while focused/typing.
        const hasUnsyncedLocalChanges = textRef.current !== lastSyncedTextRef.current;
        if (
          isFocusedRef.current &&
          isTypingRef.current &&
          hasUnsyncedLocalChanges &&
          incomingText !== textRef.current
        ) {
          Logger.debug('User is editing, holding remote update');

          pendingRemoteRef.current = {
            text: incomingText,
            updatedAt: incomingSavedAt
          };

          dispatch({ type: 'SET_PENDING_REMOTE', payload: true });
          dispatch({ type: 'LOAD_COMPLETE' });
          return;
        }

        // No pending update, apply immediately
        pendingRemoteRef.current = null;
        dispatch({ type: 'SET_PENDING_REMOTE', payload: false });
        dispatch({ type: 'SET_TEXT', payload: incomingText });
        dispatch({ type: 'SET_RETRY_COUNT', payload: 0 });
        dispatch({ type: 'CLEAR_ERROR' });
        dispatch({ type: 'LOAD_COMPLETE' });

        Logger.info('Remote update applied');
      },
      (error) => {
        Logger.error('Sync listener error', error);

        const errorMsg = getSyncErrorMessage(error);
        dispatch({
          type: 'SET_SYNC_ERROR_MESSAGE',
          payload: errorMsg
        });

        dispatch({ type: 'LOAD_COMPLETE' });
      }
    );

    return () => unsubscribe();
  }, [noteId, dispatch, getSyncErrorMessage, state.language]);

  /**
   * ✅ ACTUAL RETRY LOGIC (previously was broken)
   */
  const processRetryQueue = useCallback(async () => {
    if (retryQueueRef.current.length === 0) {
      return;
    }

    const queueItem = retryQueueRef.current[0];
    const { payload, attempt } = queueItem;

    try {
      dispatch({ type: 'SET_SYNCING', payload: true });

      Logger.debug('Retrying save', {
        attempt,
        hasPayload: !!payload
      });

      // Attempt to save
      await set(ref(database, `notes/${noteId}`), payload);

      // Success! Remove from queue
      retryQueueRef.current.shift();

      dispatch({
        type: 'SYNC_SUCCESS',
        payload: new Date(payload.lastUpdated)
      });

      Logger.info('Retry succeeded', { remainingInQueue: retryQueueRef.current.length });

      // Process next item in queue (if any)
      if (retryQueueRef.current.length > 0) {
        setTimeout(processRetryQueue, TIMINGS.RETRY_DELAY);
      }
    } catch (error) {
      // Check if we should retry again
      if (attempt < TIMINGS.RETRY_ATTEMPTS && isNetworkError(error)) {
        // Increment attempt count
        queueItem.attempt++;

        Logger.warn('Retry failed, will retry again', {
          attempt: queueItem.attempt,
          maxAttempts: TIMINGS.RETRY_ATTEMPTS
        });

        dispatch({
          type: 'SET_SYNC_ERROR_MESSAGE',
          payload: `Retrying... (attempt ${queueItem.attempt}/${TIMINGS.RETRY_ATTEMPTS})`
        });

        // Schedule next retry
        setTimeout(processRetryQueue, TIMINGS.RETRY_DELAY);
      } else {
        // Give up after max attempts
        Logger.error('Retry failed after max attempts', error);

        dispatch({
          type: 'SYNC_ERROR',
          payload: {
            error: error.code,
            message: ERRORS.SAVE_FAILED
          }
        });

        // Remove from queue (give up)
        retryQueueRef.current.shift();

        // Process next item
        if (retryQueueRef.current.length > 0) {
          setTimeout(processRetryQueue, TIMINGS.RETRY_DELAY);
        }
      }
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [noteId, dispatch, isNetworkError]);
  /**
   * 💾 Auto-save when text changes
   * 500ms debounce to batch keystrokes
   */
  const setupAutoSave = useCallback(() => {
    // Skip if no ID or text hasn't changed
    if (!noteId || state.text === lastSyncedTextRef.current) {
      return undefined;
    }

    // ✅ Validate text length (prevent quota abuse)
    if (!validateTextLength(state.text, LIMITS.MAX_TEXT_LENGTH)) {
      dispatch({
        type: 'SET_SYNC_ERROR_MESSAGE',
        payload: ERRORS.TEXT_TOO_LARGE
      });
      return undefined;
    }

    // Clear previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // 🚀 Debounce: Only save after 500ms of inactivity
    const timeout = setTimeout(async () => {
      dispatch({ type: 'SET_SYNCING', payload: true });

      try {
        // 🛡️ Sanitize input (prevent XSS)
        const sanitizedText = sanitizeInput(state.text);

        // 📊 Create new payload
        const now = Date.now();
        const nextVersion = currentVersionRef.current + 1;

        const newPayload = {
          text: sanitizedText,
          // Keep both keys for backward compatibility while rules still reference updatedAt.
          lastUpdated: now,
          updatedAt: now,
          language: state.language || 'plaintext',
          version: nextVersion
        };

        // Skip if nothing changed
        if (sanitizedText === lastSyncedTextRef.current) {
          Logger.debug('No changes in delta, skipping save');
          dispatch({ type: 'SET_SYNCING', payload: false });
          return;
        }

        Logger.debug('Syncing note text');

        // ✅ Write to database
        await set(ref(database, `notes/${noteId}`), newPayload);

        // Update local state
        lastSyncedTextRef.current = sanitizedText;
        textRef.current = sanitizedText;
        currentVersionRef.current = nextVersion;

        // Clear error and retry count on success
        dispatch({
          type: 'SYNC_SUCCESS',
          payload: new Date(newPayload.lastUpdated)
        });

        Logger.info('Save successful');

        // Broadcast to other tabs (instant sync)
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'SYNC',
            text: sanitizedText,
            lastUpdated: newPayload.lastUpdated
          });
        }
      } catch (error) {
        Logger.error('Save failed', error);

        const errorMsg = getSyncErrorMessage(error);
        dispatch({
          type: 'SET_SYNC_ERROR_MESSAGE',
          payload: errorMsg
        });

        // ✅ ADD TO RETRY QUEUE (this was the broken part!)
        if (isNetworkError(error)) {
          retryQueueRef.current.push({
            payload: {
              text: sanitizeInput(state.text),
              lastUpdated: Date.now(),
              updatedAt: Date.now(),
              language: state.language || 'plaintext',
              version: currentVersionRef.current + 1
            },
            attempt: 1
          });

          Logger.info('Added to retry queue', {
            queueLength: retryQueueRef.current.length
          });

          // Start processing queue
          processRetryQueue();
        }
      } finally {
        dispatch({ type: 'SET_SYNCING', payload: false });
      }
    }, TIMINGS.DEBOUNCE_SAVE);

    debounceTimeoutRef.current = timeout;

    return () => clearTimeout(timeout);
  }, [noteId, state.text, state.language, dispatch, getSyncErrorMessage, isNetworkError, processRetryQueue]);

  /**
   * Handle editor blur - apply pending remote updates
   */
  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;

    // No pending update, nothing to do
    if (!pendingRemoteRef.current) {
      return;
    }

    const remoteUpdate = pendingRemoteRef.current;
    pendingRemoteRef.current = null;

    // Conflict detection: Local and remote both changed
    if (
      textRef.current !== lastSyncedTextRef.current &&
      textRef.current !== remoteUpdate.text
    ) {
      Logger.warn('Conflict detected');

      dispatch({
        type: 'SET_SYNC_ERROR_MESSAGE',
        payload: 'Remote update conflicts with your changes. Copy your work and refresh to see remote version.'
      });

      return;
    }

    // No conflict, apply remote update
    Logger.debug('Applying pending remote update');

    dispatch({
      type: 'APPLY_REMOTE_UPDATE',
      payload: {
        text: remoteUpdate.text,
        language: state.language,
        lastSavedAt: remoteUpdate.updatedAt
      }
    });

    lastSyncedTextRef.current = remoteUpdate.text;
    textRef.current = remoteUpdate.text;
  }, [dispatch, state.language]);

  // 🔌 SETUP EFFECTS
  // Setup sync listener when noteId changes
  useEffect(() => {
    if (!noteId) return;
    return setupSyncListener();
  }, [noteId, setupSyncListener]);

  // Setup auto-save listener when text changes
  useEffect(() => {
    if (!noteId) return;
    return setupAutoSave();
  }, [noteId, state.text, setupAutoSave]);

  // Handle blur event to apply pending updates
  useEffect(() => {
    const handleBlurEvent = () => {
      handleBlur();
    };

    window.addEventListener('blur', handleBlurEvent);
    return () => window.removeEventListener('blur', handleBlurEvent);
  }, [handleBlur]);

  return {
    setupSyncListener,
    setupAutoSave,
    handleBlur
  };
};

export default useFirebaseSync;
