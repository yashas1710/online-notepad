import { useEffect, useRef, useCallback } from 'react';
import { database, ref, set, onValue, onDisconnect } from '../firebase';
import Logger from '../utils/logger';

/**
 * 👥 usePresence Hook
 * Session-Based Presence Tracking
 * 
 * ✅ Fixes multi-tab presence bugs with unique sessionId per tab
 * ✅ Prevents "ghost users" when closing tabs
 * ✅ Counts unique users, not sessions
 * ✅ Uses Logger utility instead of console.logs
 */
export const usePresence = (noteId, uid, setPresenceCount = () => {}) => {
  const sessionIdRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const isPermissionDeniedRef = useRef(false);

  // Generate unique sessionId on first render (per tab/window)
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      Logger.debug('Session ID generated', sessionIdRef.current.slice(0, 8));
    }
  }, []);

  // Setup presence tracking with session granularity
  useEffect(() => {
    // Guard: Skip if missing required params
    if (!noteId || !uid || !sessionIdRef.current) {
      Logger.debug('usePresence guard triggered', {
        hasNoteId: !!noteId,
        hasUid: !!uid,
        hasSessionId: !!sessionIdRef.current
      });
      return;
    }

    // If rules have already denied presence in this session, avoid repeated writes/listens.
    if (isPermissionDeniedRef.current) {
      setPresenceCount(1);
      return;
    }

    Logger.debug('usePresence setup', {
      noteId,
      uid,
      sessionId: sessionIdRef.current?.slice(0, 8)
    });

    const sessionId = sessionIdRef.current;

    // Keep presence under note path to match Firebase security rules.
    const sessionRef = ref(database, `notes/${noteId}/presence/${uid}/${sessionId}`);
    
    const setupPresence = async () => {
      try {
        // Set this session as active
        await set(sessionRef, {
          timestamp: Date.now(),
          sessionId: sessionId,
          userAgent: navigator.userAgent
        });

        // OnDisconnect: Only removes THIS tab's session, not entire user
        onDisconnect(sessionRef).set(null);
        
        Logger.info('Presence registered', {
          uid,
          sessionId: sessionId.slice(0, 8)
        });
      } catch (error) {
        const code = String(error?.code || '').toLowerCase();
        const message = String(error?.message || '').toLowerCase();
        const isPermissionDenied =
          code.includes('permission_denied') || message.includes('permission_denied');

        if (isPermissionDenied) {
          isPermissionDeniedRef.current = true;
          // Fall back to local-only presence instead of crashing the UI.
          setPresenceCount(1);
          Logger.warn('Presence disabled by Firebase rules (permission denied)');
          return;
        }

        Logger.error('Presence setup error', error);
      }
    };

    setupPresence();

    // Count UNIQUE users (not sessions)
    const presenceRef = ref(database, `notes/${noteId}/presence`);

    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        if (isPermissionDeniedRef.current) {
          return;
        }

        const presenceData = snapshot.val();

        if (!presenceData || Object.keys(presenceData).length === 0) {
          setPresenceCount(0);
          return;
        }

        // Count unique UIDs (not sessions)
        const uniqueUserIds = Object.keys(presenceData);
        setPresenceCount(uniqueUserIds.length);
      },
      (error) => {
        const code = String(error?.code || '').toLowerCase();
        const message = String(error?.message || '').toLowerCase();
        const isPermissionDenied =
          code.includes('permission_denied') || message.includes('permission_denied');

        if (isPermissionDenied) {
          isPermissionDeniedRef.current = true;
          setPresenceCount(1);
          Logger.warn('Presence listener blocked by Firebase rules (permission denied)');
          return;
        }

        Logger.error('Presence listener error', error);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      // Best effort cleanup only if writes are allowed.
      if (!isPermissionDeniedRef.current) {
        set(sessionRef, null).catch(() => {});
      }
    };
  }, [noteId, uid, setPresenceCount]);

  // Return sessionId for other features (e.g., typing indicator)
  return {
    sessionId: sessionIdRef.current,
    getSessionId: useCallback(() => sessionIdRef.current, [])
  };
};

export default usePresence;
