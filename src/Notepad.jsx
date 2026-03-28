import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useEditor } from './context/EditorContext';
import useFirebaseSync from './hooks/useFirebaseSync';
import { usePresence } from './hooks/usePresence';
import Toolbar from './components/Toolbar';
import EditorContainer from './components/EditorContainer';
import Logger from './utils/logger';
import { TIMINGS, STORAGE_KEYS } from './utils/constants';

function Notepad() {
  const navigate = useNavigate();
  const params = useParams();
  // Support both /note/:noteId and /:id routes
  const noteId = params.noteId || params.id;
  const { state, dispatch } = useEditor();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userId] = useState(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.USER_ID);
      if (existing) return existing;

      const generated =
        crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEYS.USER_ID, generated);
      return generated;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  });

  const handlePresenceCountChange = useCallback(
    (count) => {
      dispatch({ type: 'SET_PRESENCE_COUNT', payload: count });
    },
    [dispatch]
  );

  // Auto-generate note ID if not provided
  useEffect(() => {
    if (!noteId) {
      const newNoteId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      navigate(`/note/${newNoteId}`, { replace: true });
    }
  }, [noteId, navigate]);

  // Setup Firebase sync
  useFirebaseSync(noteId);

  // Setup presence tracking
  usePresence(noteId, userId, handlePresenceCountChange);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      dispatch({ type: 'SET_MOBILE', payload: window.innerWidth < 768 });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  // Typing indicator: reset after 1.5s of inactivity
  useEffect(() => {
    if (!state.isTyping) return;

    const timer = setTimeout(() => {
      dispatch({ type: 'SET_TYPING', payload: false });
    }, TIMINGS.TYPING_INDICATOR_TIMEOUT);

    return () => clearTimeout(timer);
  }, [state.isTyping, dispatch]);

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (value) => {
      dispatch({ type: 'SET_TEXT', payload: value || '' });
      dispatch({ type: 'SET_TYPING', payload: true });
    },
    [dispatch]
  );

  // Handle language selection
  const handleLanguageChange = useCallback(
    (language) => {
      dispatch({ type: 'SET_LANGUAGE', payload: language });
      Logger.debug('Language changed', { language });
    },
    [dispatch]
  );

  // Handle editor focus
  const handleEditorFocus = useCallback(() => {
    dispatch({ type: 'SET_FOCUSED', payload: true });
  }, [dispatch]);

  // Handle editor blur
  const handleEditorBlur = useCallback(() => {
    dispatch({ type: 'SET_FOCUSED', payload: false });
  }, [dispatch]);

  // Copy code to clipboard
  const handleCopyCode = useCallback(() => {
    navigator.clipboard
      .writeText(state.text)
      .then(() => {
        dispatch({ type: 'SET_CODE_COPY_STATUS', payload: '✅' });
        setTimeout(() => {
          dispatch({ type: 'SET_CODE_COPY_STATUS', payload: 'Copy Code' });
        }, TIMINGS.COPY_STATUS_RESET);
      })
      .catch((error) => {
        Logger.error('Copy failed', { error });
        dispatch({ type: 'SET_CODE_COPY_STATUS', payload: '❌' });
      });
  }, [state.text, dispatch]);

  // Clear all content
  const handleClearAll = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all content? This action cannot be undone.'
    );
    if (confirmed) {
      dispatch({ type: 'SET_TEXT', payload: '' });
      Logger.info('Content cleared by user');
    }
  }, [dispatch]);

  // Toggle read-only mode
  const handleToggleReadOnly = useCallback(() => {
    dispatch({ type: 'SET_READONLY', payload: !state.isReadOnly });
    Logger.info('Read-only mode toggled', { isReadOnly: !state.isReadOnly });
  }, [state.isReadOnly, dispatch]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(() => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        dispatch({ type: 'SET_COPY_STATUS', payload: '✅ Copied' });
        setTimeout(() => {
          dispatch({ type: 'SET_COPY_STATUS', payload: '📋 Copy Link' });
        }, TIMINGS.COPY_STATUS_RESET);
        Logger.info('Link copied to clipboard', { url: currentUrl });
      })
      .catch((error) => {
        Logger.error('Failed to copy link', { error });
        dispatch({ type: 'SET_COPY_STATUS', payload: '❌ Failed' });
      });
  }, [dispatch]);

  // Handle copy status change
  const handleCopyStatusChange = useCallback((status) => {
    dispatch({ type: 'SET_COPY_STATUS', payload: status });
  }, [dispatch]);

  // Handle code copy status change
  const handleCodeCopyStatusChange = useCallback((status) => {
    dispatch({ type: 'SET_CODE_COPY_STATUS', payload: status });
  }, [dispatch]);

  // Show loader until note ID exists and initial sync finishes
  if (!noteId || state.isLoading) {
    return (
      <div className="loading-container">
        <div className="loader-icon"></div>
        <div className="loading-text">Initializing Notepad</div>
        <div className="loading-subtext">
          {!noteId
            ? 'Preparing your note URL...'
            : 'Syncing your note from Firebase...'}
        </div>
      </div>
    );
  }

  return (
    <div className="notepad-page">
      <Toolbar
        text={state.text}
        language={state.language}
        isSyncing={state.isSyncing}
        syncError={state.syncError}
        isReadOnly={state.isReadOnly}
        copyStatus={state.copyStatus}
        codeCopyStatus={state.codeCopyStatus}
        usersOnline={state.presenceCount ?? 0}
        lastSavedAt={state.lastSavedAt}
        isMobile={isMobile}
        onLanguageChange={handleLanguageChange}
        onCopyLink={handleCopyLink}
        onCopyCode={handleCopyCode}
        onCopyStatusChange={handleCopyStatusChange}
        onCodeCopyStatusChange={handleCodeCopyStatusChange}
        onClearAll={handleClearAll}
        onToggleReadOnly={handleToggleReadOnly}
      />

      <div className="notepad-editor-region">
        <EditorContainer>
          <Editor
            height="100%"
            language={state.language}
            value={state.text}
            onChange={handleEditorChange}
            onFocus={handleEditorFocus}
            onBlur={handleEditorBlur}
            theme="vs-dark"
            options={{
              minimap: { enabled: !isMobile },
              wordWrap: 'on',
              fontSize: isMobile ? 12 : 14,
              scrollBeyondLastLine: false,
              readOnly: state.isReadOnly,
              defaultLanguage: state.language,
            }}
          />
        </EditorContainer>
      </div>

      {state.syncError && (
        <div className="sync-error-banner" role="alert" aria-live="polite">
          <span className="error-icon">⚠️</span>
          <span>{state.syncErrorMessage}</span>
          {state.retryCount > 0 && (
            <span>
              (Retrying... Attempt {state.retryCount})
            </span>
          )}
        </div>
      )}

      {state.lastSavedAt && (
        <div className="last-saved-bar">
          Last saved: {new Date(state.lastSavedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default Notepad;
