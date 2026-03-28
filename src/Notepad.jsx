import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
const Editor = React.lazy(() => import("@monaco-editor/react"));
import { database, ref, set, onValue, onDisconnect } from "./firebase";
import { getStorage, ref as storageRef, uploadBytes, deleteObject, getDownloadURL } from "firebase/storage";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Editor error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
          <p className="font-semibold">Editor Error</p>
          <p className="text-sm">{this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Skeleton Component
const EditorLoadingState = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%', 
    backgroundColor: '#1e2d45',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div style={{
      display: 'flex',
      gap: '8px'
    }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#58a6ff',
            animation: `pulse 1.4s infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
    </div>
    <p style={{ color: '#6e7681', fontSize: '1rem', margin: 0 }}>Loading editor...</p>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
    `}</style>
  </div>
);

// File Chip Component
const FileChip = ({ file, onDelete, disabled }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    border: '1px solid rgba(88, 166, 255, 0.3)',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#79c0ff',
    whiteSpace: 'nowrap',
    position: 'relative',
    transition: 'all 0.2s ease',
    marginRight: '8px',
    marginBottom: '8px'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.2)';
    e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.6)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.1)';
    e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.3)';
  }}
  >
    <span style={{ fontSize: '1.1rem' }}>📄</span>
    <a 
      href={file.url} 
      download={file.name}
      style={{
        color: '#79c0ff',
        textDecoration: 'none',
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer'
      }}
      title={file.name}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') window.open(file.url);
      }}
    >
      {file.name}
    </a>
    <button
      onClick={() => onDelete(file.name, file.url)}
      disabled={disabled}
      style={{
        background: 'none',
        border: 'none',
        color: '#f85149',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        padding: '0 4px',
        display: 'flex',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 0.7,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => { e.target.style.opacity = '1'; }}
      onMouseLeave={(e) => { e.target.style.opacity = '0.7'; }}
      title="Delete file"
      aria-label={`Delete ${file.name}`}
    >
      ✕
    </button>
  </div>
);

function NotepadComponent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [hasPendingRemote, setHasPendingRemote] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [copyStatus, setCopyStatus] = useState("Copy Link");
  const [usersOnline, setUsersOnline] = useState(0);
  const [userSessionId] = useState(uuidv4());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [retryCount, setRetryCount] = useState(0);
  // New state for attachments feature
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [codeCopyStatus, setCodeCopyStatus] = useState("📋");

  const textRef = useRef("");
  const isFocusedRef = useRef(false);
  const lastSyncedVersionRef = useRef(0);
  const lastSyncedTextRef = useRef("");
  const pendingRemoteRef = useRef(null);
  const copyStatusTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const codeCopyTimeoutRef = useRef(null);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigate to new note if no ID
  useEffect(() => {
    if (!id) {
      navigate(`/${uuidv4()}`);
    }
  }, [id, navigate]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current) clearTimeout(copyStatusTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Setup presence tracking
  useEffect(() => {
    if (!id) return undefined;

    const presenceRef = ref(database, `notes/${id}/presence/${userSessionId}`);
    
    const setupPresence = async () => {
      try {
        await set(presenceRef, {
          timestamp: Date.now(),
          sessionId: userSessionId
        });
        
        onDisconnect(presenceRef, async () => {
          try {
            await set(presenceRef, null);
          } catch (err) {
            console.error("Presence cleanup error", err);
          }
        });
      } catch (error) {
        console.error("Presence setup error", error);
      }
    };

    setupPresence();

    const presenceParentRef = ref(database, `notes/${id}/presence`);
    const unsubscribePresence = onValue(presenceParentRef, (snapshot) => {
      const presenceData = snapshot.val();
      const count = presenceData ? Object.keys(presenceData).length : 0;
      setUsersOnline(count);
    });

    return () => unsubscribePresence();
  }, [id, userSessionId]);

  // Sync text ref with state
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Real-time sync listener
  useEffect(() => {
    if (!id) {
      return undefined;
    }

    setIsLoading(true);
    const noteRef = ref(database, `notes/${id}`);

    const unsubscribe = onValue(
      noteRef,
      (snapshot) => {
        const rawData = snapshot.val();
        const payload =
          rawData && typeof rawData === "object"
            ? rawData
            : { text: rawData !== null && rawData !== undefined ? String(rawData) : "", version: 0, language: "javascript" };

        const incomingText = payload.text ?? "";
        const incomingVersion = Number(payload.version ?? 0);
        const incomingSavedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
        const incomingLanguage = payload.language ?? "javascript";

        if (incomingVersion < lastSyncedVersionRef.current) {
          setIsLoading(false);
          return;
        }

        lastSyncedVersionRef.current = incomingVersion;
        lastSyncedTextRef.current = incomingText;
        if (incomingSavedAt) {
          setLastSavedAt(incomingSavedAt);
        }

        setLanguage(incomingLanguage);

        if (isFocusedRef.current && incomingText !== textRef.current) {
          pendingRemoteRef.current = {
            text: incomingText,
            version: incomingVersion,
            updatedAt: incomingSavedAt,
            language: incomingLanguage
          };
          setHasPendingRemote(true);
          setIsLoading(false);
          return;
        }

        pendingRemoteRef.current = null;
        setHasPendingRemote(false);
        setText(incomingText);
        textRef.current = incomingText;
        setSyncError("");
        setRetryCount(0);
        
        // Sync attachments from Firebase
        const incomingAttachments = payload.attachments ?? [];
        setAttachments(Array.isArray(incomingAttachments) ? incomingAttachments : []);
        
        setIsLoading(false);
      },
      (error) => {
        console.error("Realtime listener error", error);
        setSyncError(getSyncErrorMessage(error));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Debounced save to Firebase with retry logic
  useEffect(() => {
    if (!id || text === lastSyncedTextRef.current) {
      return undefined;
    }

    const timeout = setTimeout(async () => {
      setIsSyncing(true);

      const payload = {
        text,
        version: lastSyncedVersionRef.current + 1,
        language,
        updatedAt: Date.now()
      };

      try {
        await set(ref(database, `notes/${id}`), payload);
        lastSyncedVersionRef.current = payload.version;
        lastSyncedTextRef.current = payload.text;
        textRef.current = payload.text;
        setLastSavedAt(new Date(payload.updatedAt));
        setSyncError("");
        setRetryCount(0);
      } catch (error) {
        console.error("Save failed", error);
        const errorMsg = getSyncErrorMessage(error);
        setSyncError(errorMsg);
        
        // Auto-retry on network errors
        if (retryCount < 3 && isNetworkError(error)) {
          setRetryCount(retryCount + 1);
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            // Trigger save again by dummy text change
          }, 3000);
        }
      } finally {
        setIsSyncing(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [text, id, language, retryCount]);

  // Helper functions - memoized
  const getSyncErrorMessage = useCallback((error) => {
    if (error.code === 'PERMISSION_DENIED') {
      return '❌ Permission denied. Your note may be read-only.';
    }
    if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      return '📡 No internet connection. Changes will sync when online.';
    }
    if (error.message?.includes('timeout')) {
      return '⏱️ Connection timeout. Retrying in 3 seconds...';
    }
    return '⚠️ Save failed. Keep typing to retry automatically.';
  }, []);

  const isNetworkError = useCallback((error) => {
    return error.message?.includes('network') || 
           error.code === 'NETWORK_ERROR' || 
           error.message?.includes('timeout');
  }, []);

  const detectLanguageFromCode = useMemo(() => (code) => {
    if (!code || code.length < 5) return null;

    const trimmed = code.trim().substring(0, 200);

    if (/^import\s+|^require\s*\(|export\s+(default\s+)?function|const\s+\w+\s*=|=>/.test(trimmed)) {
      return "javascript";
    }

    if (/^import\s+|^from\s+\w+\s+import|^def\s+\w+|^class\s+\w+/.test(trimmed)) {
      return "python";
    }

    if (/^SELECT\s+|^INSERT\s+|^UPDATE\s+|^DELETE\s+|^CREATE\s+/i.test(trimmed)) {
      return "sql";
    }

    if (/^[{[]/.test(trimmed)) {
      return "json";
    }

    if (/^<!DOCTYPE|^<html|^<head|^<body/.test(trimmed)) {
      return "html";
    }

    if (/^[\w-]+\s*{|@media|@import|@keyframes/.test(trimmed)) {
      return "css";
    }

    if (/^interface\s+|^type\s+|:\s*string|:\s*number|:\s*boolean/.test(trimmed)) {
      return "typescript";
    }

    return null;
  }, []);

  // Event handlers - memoized
  const handleEditorChange = useCallback((value) => {
    if (!isReadOnly && value !== undefined) {
      setText(value);

      const detectedLang = detectLanguageFromCode(value);
      if (detectedLang && detectedLang !== language) {
        setLanguage(detectedLang);
      }
    }
  }, [isReadOnly, language, detectLanguageFromCode]);

  const handleLanguageChange = useCallback((event) => {
    setLanguage(event.target.value);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Copied to clipboard!");
      if (copyStatusTimeoutRef.current) clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus("Copy Link"), 2000);
    } catch (error) {
      console.error("Copy failed", error);
      setCopyStatus("Copy failed");
      if (copyStatusTimeoutRef.current) clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus("Copy Link"), 2000);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to delete all content? This cannot be undone.")) {
      setText("");
    }
  }, []);

  const toggleReadOnly = useCallback(() => {
    setIsReadOnly(prev => !prev);
  }, []);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;

    if (!pendingRemoteRef.current) {
      return;
    }

    const remoteUpdate = pendingRemoteRef.current;
    pendingRemoteRef.current = null;
    setHasPendingRemote(false);

    if (textRef.current !== lastSyncedTextRef.current && textRef.current !== remoteUpdate.text) {
      setSyncError("A newer remote update is available. Copy your draft before refreshing.");
      return;
    }

    lastSyncedVersionRef.current = remoteUpdate.version;
    lastSyncedTextRef.current = remoteUpdate.text;
    textRef.current = remoteUpdate.text;
    setText(remoteUpdate.text);
    if (remoteUpdate.language) {
      setLanguage(remoteUpdate.language);
    }
    if (remoteUpdate.updatedAt) {
      setLastSavedAt(remoteUpdate.updatedAt);
    }
    setSyncError("");
  }, []);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const getSyncStatus = useCallback(() => {
    if (syncError) return "⚠️ Offline";
    if (isSyncing) return "🔄 Syncing...";
    return "☁️ Saved";
  }, [syncError, isSyncing]);

  // Handle code copy to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCodeCopyStatus("✅");
      if (codeCopyTimeoutRef.current) clearTimeout(codeCopyTimeoutRef.current);
      codeCopyTimeoutRef.current = setTimeout(() => setCodeCopyStatus("📋"), 2000);
    } catch (error) {
      console.error("Code copy failed", error);
      setCodeCopyStatus("❌");
      if (codeCopyTimeoutRef.current) clearTimeout(codeCopyTimeoutRef.current);
      codeCopyTimeoutRef.current = setTimeout(() => setCodeCopyStatus("📋"), 2000);
    }
  }, [text]);

  // Handle file attachment
  const handleFileSelect = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    
    if (!id) {
      alert("Please wait for note to load");
      return;
    }

    // Safety check: Max 5 files per note
    if (attachments.length + files.length > 5) {
      alert("Maximum 5 files per note. Current: " + attachments.length);
      return;
    }

    // Safety check: Max 5MB per file
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`File(s) too large: ${oversizedFiles.map(f => f.name).join(", ")} (max 5MB)`);
      return;
    }

    setUploading(true);
    const storage = getStorage();
    const newAttachments = [...attachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round((i / files.length) * 100));

        const filePath = `files/${id}/${file.name}`;
        const fileRef = storageRef(storage, filePath);

        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        newAttachments.push({
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size,
          uploadedAt: Date.now()
        });
      }

      // Save attachments to Realtime Database
      await set(ref(database, `notes/${id}/attachments`), newAttachments);
      setAttachments(newAttachments);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed: " + error.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [id, attachments, database]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (fileName, url) => {
    if (!id || !window.confirm(`Delete "${fileName}"?`)) return;

    setUploading(true);
    const storage = getStorage();

    try {
      // Delete from Storage
      const fileRef = storageRef(storage, `files/${id}/${fileName}`);
      await deleteObject(fileRef);

      // Delete from Database
      const updatedAttachments = attachments.filter(a => a.name !== fileName);
      await set(ref(database, `notes/${id}/attachments`), updatedAttachments.length > 0 ? updatedAttachments : null);
      
      setAttachments(updatedAttachments);
    } catch (error) {
      console.error("Delete failed", error);
      alert("Delete failed: " + error.message);
    } finally {
      setUploading(false);
    }
  }, [id, attachments, database]);

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%', backgroundColor: '#1a1a1a' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '16px', color: '#ffffff' }}>
            📝 Loading Notebook...
          </h1>
          <div style={{
            width: '32px',
            height: '32px',
            border: '4px solid #569cd6',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', backgroundColor: '#0a0e27', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden' }}>
      {/* Ultra-Premium Toolbar */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1a1f3a 0%, #16213e 100%)', borderBottom: '1px solid rgba(88, 166, 255, 0.1)', padding: isMobile ? '14px 16px' : '20px 28px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)', zIndex: 100, position: 'sticky', top: 0, backdropFilter: 'blur(10px)', overflowY: 'auto', maxHeight: isMobile ? '50vh' : 'auto' }}>
        
        {/* Header Row: Branding + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '12px' : '18px', gap: isMobile ? '12px' : '20px', flexWrap: 'wrap' }}>
          {/* Left: Premium Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: isMobile ? 'auto' : 'fit-content' }}>
            <span style={{ fontSize: '1.8rem', background: 'linear-gradient(135deg, #58a6ff, #79c0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>✨</span>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 800, color: '#c9d1d9', letterSpacing: '-0.8px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Notepad</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#6e7681', fontWeight: 500, letterSpacing: '0.8px' }}>REAL-TIME SYNC</p>
            </div>
          </div>

          {/* Center: Language Selector */}
          <select
            value={language}
            onChange={handleLanguageChange}
            aria-label="Select programming language for syntax highlighting"
            title="Select programming language for syntax highlighting"
            style={{ 
              padding: isMobile ? '8px 12px' : '10px 16px', 
              backgroundColor: 'rgba(30, 45, 80, 0.6)',
              backdropFilter: 'blur(8px)',
              color: '#79c0ff', 
              border: '1px solid rgba(88, 166, 255, 0.2)', 
              borderRadius: '8px', 
              fontSize: isMobile ? '0.8rem' : '0.9rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(88, 166, 255, 0.6)';
              e.target.style.backgroundColor = 'rgba(40, 55, 90, 0.8)';
              e.target.style.boxShadow = '0 4px 16px rgba(88, 166, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(88, 166, 255, 0.2)';
              e.target.style.backgroundColor = 'rgba(30, 45, 80, 0.6)';
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="json">JSON</option>
            <option value="sql">SQL</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="plaintext">Plain Text</option>
          </select>

          {/* Right: Status Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', marginLeft: isMobile ? 'auto' : 'auto', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#6e7681', fontWeight: 500, whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3fb950', boxShadow: '0 0 8px #3fb950' }}></span>
              {isMobile ? usersOnline : `${usersOnline} ${usersOnline === 1 ? "user" : "users"}`}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: syncError ? '#f85149' : isSyncing ? '#58a6ff' : '#3fb950', display: 'flex', alignItems: 'center', gap: '4px', textShadow: syncError ? 'none' : isSyncing ? '0 0 8px rgba(88, 166, 255, 0.3)' : '0 0 8px rgba(63, 185, 80, 0.3)', whiteSpace: 'nowrap' }}>
              {getSyncStatus()}
            </span>
          </div>
        </div>

        {/* Premium Copy Button Section */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? '6px' : '12px', justifyContent: isMobile ? 'flex-start' : 'space-between', flexWrap: 'wrap' }}>
          {/* HERO Copy Link Button */}
          <button
            onClick={handleCopyLink}
            aria-label="Copy note link to clipboard"
            title="Copy note link to clipboard"
            style={{
              flex: isMobile ? '1 1 auto' : '0 1 auto',
              minHeight: isMobile ? '48px' : '54px',
              padding: isMobile ? '0 18px' : '0 32px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 800,
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              background: copyStatus.includes("Copied") 
                ? 'linear-gradient(135deg, #238636, #2cbe6f)' 
                : copyStatus.includes("failed") 
                ? 'linear-gradient(135deg, #da3633, #f85149)'
                : 'linear-gradient(135deg, #1f6feb, #388bfd)',
              color: '#ffffff',
              boxShadow: copyStatus.includes("Copied") 
                ? '0 0 0 4px rgba(35, 134, 54, 0.2), 0 8px 24px rgba(35, 134, 54, 0.4)'
                : copyStatus.includes("failed")
                ? '0 0 0 4px rgba(218, 54, 51, 0.2), 0 8px 24px rgba(218, 54, 51, 0.3)'
                : '0 0 0 4px rgba(31, 111, 235, 0.2), 0 8px 24px rgba(31, 111, 235, 0.4)',
              transform: copyStatus.includes("Copied") ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '10px',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if(!copyStatus.includes("Copied") && !copyStatus.includes("failed")) {
                e.target.style.background = 'linear-gradient(135deg, #388bfd, #58a6ff)';
                e.target.style.boxShadow = '0 0 0 5px rgba(31, 111, 235, 0.3), 0 12px 32px rgba(31, 111, 235, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'scale(1.025) translateY(-3px)';
              }
            }}
            onMouseLeave={(e) => {
              if(!copyStatus.includes("Copied") && !copyStatus.includes("failed")) {
                e.target.style.background = 'linear-gradient(135deg, #1f6feb, #388bfd)';
                e.target.style.boxShadow = '0 0 0 4px rgba(31, 111, 235, 0.2), 0 8px 24px rgba(31, 111, 235, 0.4)';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            <span style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', display: 'flex', alignItems: 'center' }}>
              {copyStatus.includes("Copied") ? '✓' : copyStatus.includes("failed") ? '⚠' : '📋'}
            </span>
            {!isMobile && <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>{copyStatus}</span>}
          </button>

          {/* Secondary Actions */}
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px' }}>
            {/* Copy Code Button */}
            <button
              onClick={handleCopyCode}
              disabled={!text}
              aria-label="Copy editor content to clipboard"
              title="Copy editor content to clipboard"
              style={{
                padding: isMobile ? '10px 14px' : '12px 22px',
                fontSize: isMobile ? '1rem' : '1.2rem',
                fontWeight: 700,
                border: '2px solid',
                borderColor: codeCopyStatus === '✅' ? '#238636' : codeCopyStatus === '❌' ? '#f85149' : 'rgba(88, 166, 255, 0.3)',
                borderRadius: '8px',
                cursor: !text ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: codeCopyStatus === '✅' ? 'rgba(35, 134, 54, 0.1)' : 'transparent',
                color: codeCopyStatus === '✅' ? '#3fb950' : codeCopyStatus === '❌' ? '#f85149' : '#8b949e',
                backdropFilter: 'blur(8px)',
                opacity: !text ? 0.4 : 1,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (text && codeCopyStatus !== '✅' && codeCopyStatus !== '❌') {
                  e.target.style.borderColor = '#58a6ff';
                  e.target.style.backgroundColor = 'rgba(88, 166, 255, 0.1)';
                  e.target.style.color = '#58a6ff';
                  e.target.style.boxShadow = '0 4px 12px rgba(88, 166, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (text && codeCopyStatus !== '✅' && codeCopyStatus !== '❌') {
                  e.target.style.borderColor = 'rgba(88, 166, 255, 0.3)';
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#8b949e';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {codeCopyStatus}
            </button>

            {/* Attach Files Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadOnly || uploading || attachments.length >= 5}
              aria-label="Attach files to note"
              title={attachments.length >= 5 ? "Maximum 5 files reached" : "Attach files to note"}
              style={{
                padding: isMobile ? '10px 14px' : '12px 22px',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 700,
                border: '2px solid',
                borderColor: uploading ? 'rgba(88, 166, 255, 0.5)' : 'rgba(217, 119, 6, 0.3)',
                borderRadius: '8px',
                cursor: isReadOnly || uploading || attachments.length >= 5 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: uploading ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                color: '#d9751b',
                backdropFilter: 'blur(8px)',
                opacity: isReadOnly || uploading || attachments.length >= 5 ? 0.4 : 1,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isReadOnly && !uploading && attachments.length < 5) {
                  e.target.style.borderColor = '#d9751b';
                  e.target.style.backgroundColor = 'rgba(217, 119, 6, 0.15)';
                  e.target.style.color = '#ffa657';
                  e.target.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isReadOnly && !uploading && attachments.length < 5) {
                  e.target.style.borderColor = 'rgba(217, 119, 6, 0.3)';
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#d9751b';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {uploading ? `⏳ ${uploadProgress}%` : '📎'}
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={isReadOnly || uploading}
              style={{ display: 'none' }}
              aria-hidden="true"
              accept="*/*"
            />

            <button
              onClick={toggleReadOnly}
              aria-label={isReadOnly ? "Switch to edit mode" : "Switch to view mode"}
              title={isReadOnly ? "Switch to edit mode" : "Switch to view mode"}
              style={{
                padding: isMobile ? '10px 14px' : '12px 22px',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 700,
                border: '2px solid',
                borderColor: isReadOnly ? 'rgba(212, 165, 116, 0.5)' : 'rgba(88, 166, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: isReadOnly ? 'rgba(212, 165, 116, 0.1)' : 'transparent',
                color: isReadOnly ? '#d4a574' : '#8b949e',
                backdropFilter: 'blur(8px)',
                fontWeight: 600,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#58a6ff';
                e.target.style.backgroundColor = 'rgba(88, 166, 255, 0.1)';
                e.target.style.color = '#58a6ff';
                e.target.style.boxShadow = '0 4px 12px rgba(88, 166, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = isReadOnly ? 'rgba(212, 165, 116, 0.5)' : 'rgba(88, 166, 255, 0.3)';
                e.target.style.backgroundColor = isReadOnly ? 'rgba(212, 165, 116, 0.1)' : 'transparent';
                e.target.style.color = isReadOnly ? '#d4a574' : '#8b949e';
                e.target.style.boxShadow = 'none';
              }}
            >
              {isMobile ? (isReadOnly ? '🔒' : '✏️') : (isReadOnly ? '🔒 View' : '✏️ Edit')}
            </button>
            <button
              onClick={handleClearAll}
              disabled={isReadOnly || text.length === 0}
              aria-label="Clear all content from editor"
              title="Clear all content from editor"
              style={{
                padding: isMobile ? '10px 14px' : '12px 22px',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 700,
                border: '2px solid',
                borderColor: '#f85149',
                borderRadius: '8px',
                cursor: isReadOnly || text.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: 'transparent',
                color: '#f85149',
                backdropFilter: 'blur(8px)',
                letterSpacing: '0.3px',
                opacity: isReadOnly || text.length === 0 ? 0.4 : 1,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isReadOnly && text.length > 0) {
                  e.target.style.backgroundColor = 'rgba(248, 81, 73, 0.15)';
                  e.target.style.boxShadow = '0 4px 12px rgba(248, 81, 73, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.boxShadow = 'none';
              }}
            >
              {isMobile ? '🗑️' : '🗑️ Clear'}
            </button>
          </div>
        </div>

        {/* Elegant Status Bar */}
        <div style={{ marginTop: isMobile ? '12px' : '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobile ? '0.8rem' : '0.85rem', color: '#6e7681', gap: isMobile ? '10px' : '16px', flexWrap: 'wrap', paddingTop: isMobile ? '10px' : '12px', borderTop: '1px solid rgba(88, 166, 255, 0.08)' }}>
          <span style={{ fontWeight: 500 }}>📊 <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{text.length.toLocaleString()}</span></span>
          <span style={{ fontWeight: 500 }}>🕐 {lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'just now'}</span>
          {attachments.length > 0 && <span style={{ fontWeight: 500, color: '#79c0ff' }}>📎 {attachments.length} file{attachments.length !== 1 ? 's' : ''}</span>}
        </div>

        {/* File Attachments Section */}
        {attachments.length > 0 && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(88, 166, 255, 0.08)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#6e7681', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📂 Attachments</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {attachments.map((file) => (
                <FileChip 
                  key={file.name} 
                  file={file} 
                  onDelete={handleDeleteFile}
                  disabled={uploading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error/Warning Messages with Animation */}
        {syncError && (
          <div style={{ marginTop: '10px', padding: '12px 16px', backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', color: '#f85149', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', animation: 'slideIn 0.3s ease-out', backdropFilter: 'blur(8px)' }}>
            ⚠️ {syncError}
            {retryCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>Retry {retryCount}/3</span>}
          </div>
        )}
        {hasPendingRemote && !isSyncing && (
          <div style={{ marginTop: '10px', padding: '12px 16px', backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#d9751b', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', animation: 'slideIn 0.3s ease-out', backdropFilter: 'blur(8px)' }}>
            🔔 Remote updates available. Click elsewhere to apply.
          </div>
        )}
      </div>

      {/* Monaco Editor Container */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <ErrorBoundary>
          <Suspense fallback={<EditorLoadingState />}>
            <div style={{ flex: 1, width: '100%', height: '100%' }}>
              <Editor
                height="100%"
                width="100%"
                language={language}
                value={text}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                onFocus={handleFocus}
                onBlur={handleBlur}
                theme="vs-dark"
                options={{
                  minimap: { enabled: !isMobile },
                  fontSize: isMobile ? 13 : 15,
                  lineNumbers: "on",
                  wordWrap: "on",
                  readOnly: isReadOnly,
                  formatOnPaste: true,
                  formatOnType: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 }
                }}
              />
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        button {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        button:active:not(:disabled) {
          transform: scale(0.98) !important;
        }

        select:focus {
          outline: none;
        }

        /* Editor scrollbar styling */
        .monaco-scrollable-element > .scrollbar > .slider {
          background: rgba(88, 166, 255, 0.2) !important;
        }

        .monaco-scrollable-element > .scrollbar > .slider:hover {
          background: rgba(88, 166, 255, 0.4) !important;
        }
      `}</style>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(NotepadComponent);
