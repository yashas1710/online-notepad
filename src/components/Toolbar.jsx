import React, { useEffect } from 'react';

export const Toolbar = React.memo(({
  language,
  onLanguageChange,
  isSyncing,
  syncError,
  usersOnline = 0,
  copyStatus,
  onCopyLink,
  codeCopyStatus,
  onCopyCode,
  text,
  isReadOnly,
  onToggleReadOnly,
  onClearAll,
  lastSavedAt,
  isMobile = false,
  onCopyStatusChange = () => {},
  onCodeCopyStatusChange = () => {}
}) => {
  useEffect(() => {
    if (copyStatus && copyStatus.includes('Copied')) {
      const timer = setTimeout(() => {
        onCopyStatusChange('📋 Copy Link');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus, onCopyStatusChange]);

  useEffect(() => {
    if (codeCopyStatus === '✅') {
      const timer = setTimeout(() => {
        onCodeCopyStatusChange('📋');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [codeCopyStatus, onCodeCopyStatusChange]);

  const getSyncStatus = () => {
    if (syncError) return 'Offline';
    if (isSyncing) return 'Syncing...';
    return 'Saved';
  };

  const usersLabel = usersOnline === 1 ? '1 user' : `${usersOnline} users`;

  return (
    <header className="toolbar">
      <div className="toolbar-top">
        <div className="toolbar-brand">
          <span aria-hidden="true">✨</span>
          <div>
            <h1 className="toolbar-title">Notepad</h1>
            <p className="toolbar-subtitle">Write Sync</p>
          </div>
        </div>

        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          aria-label="Select programming language for syntax highlighting"
          title="Select programming language for syntax highlighting"
          className="toolbar-language"
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
      </div>

      <div className="toolbar-actions">
        <div className="toolbar-status">
          <span className="toolbar-users">
            <span className="toolbar-users-dot" aria-hidden="true"></span>
            {isMobile ? usersOnline : usersLabel}
          </span>
          <span>{getSyncStatus()}</span>
        </div>

        <div className="toolbar-action-group">
        <button
          onClick={onCopyLink}
          aria-label="Copy note link to clipboard"
          title="Copy note link to clipboard"
          className="toolbar-button toolbar-button-primary"
        >
          {copyStatus.includes('Copied') ? 'Link Copied!' : 'Copy Link'}
        </button>

          <button
            onClick={onCopyCode}
            disabled={!text}
            aria-label="Copy editor content to clipboard"
            title="Copy editor content to clipboard"
            className="toolbar-button toolbar-button-muted"
          >
            {codeCopyStatus}
          </button>

          <button
            onClick={onToggleReadOnly}
            aria-label={isReadOnly ? "Switch to edit mode" : "Switch to view mode"}
            title={isReadOnly ? "Switch to edit mode" : "Switch to view mode"}
            className="toolbar-button toolbar-button-muted"
          >
            {isMobile ? (isReadOnly ? '🔒' : '✏️') : isReadOnly ? '🔒 View' : '✏️ Edit'}
          </button>

          <button
            onClick={onClearAll}
            disabled={isReadOnly || text.length === 0}
            aria-label="Clear all content from editor"
            title="Clear all content from editor"
            className="toolbar-button toolbar-button-danger"
          >
            {isMobile ? '🗑️' : '🗑️ Clear'}
          </button>
        </div>
      </div>

      <div className="toolbar-bottom">
        <span>Chars: {text?.length?.toLocaleString() || 0}</span>
        <span>Saved: {lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'just now'}</span>
      </div>

      {syncError && (
        <div className="sync-error-banner">
          ⚠️ {syncError}
        </div>
      )}
    </header>
  );
});

export default Toolbar;
