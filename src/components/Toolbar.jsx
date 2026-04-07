import React, { useCallback, useEffect } from 'react';

export const Toolbar = React.memo(({
  isSyncing,
  syncError,
  usersOnline = 0,
  copyStatus,
  onCopyLink,
  text,
  isReadOnly,
  onToggleReadOnly,
  onClearAll,
  lastSavedAt,
  isMobile = false,
  onCopyStatusChange = () => {},
  codeCopyStatus,
  onCopyCode,
  onCodeCopyStatusChange = () => {},
  onPaste = () => {}
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
    <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 shadow-lg">
      {/* Top Row */}
      <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Notepad</h1>
            <p className="text-xs text-slate-400">Write Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-slate-300">{isMobile ? usersOnline : usersLabel}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            syncError ? 'bg-red-500/20 text-red-300' :
            isSyncing ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-green-500/20 text-green-300'
          }`}>
            {getSyncStatus()}
          </span>
        </div>
      </div>

      {/* Actions Row */}
      <div className="px-4 md:px-6 py-3 border-t border-slate-600 flex gap-2 md:gap-3 flex-wrap items-center">
        <button
          onClick={onCopyLink}
          aria-label="Copy note link"
          title="Copy note link"
          className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          {copyStatus.includes('Copied') ? '✅ Copied!' : '🔗 Share'}
        </button>

        <button
          onClick={onPaste}
          aria-label="Paste from clipboard"
          title="Paste from clipboard"
          className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-slate-500 hover:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          📌 Paste
        </button>

        <button
          onClick={onCopyCode}
          disabled={!text}
          aria-label="Copy all text"
          title="Copy all text"
          className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          {codeCopyStatus === '✅' ? '✅' : '📋 Copy'}
        </button>

        <button
          onClick={onToggleReadOnly}
          aria-label={isReadOnly ? 'Enable editing' : 'Disable editing'}
          title={isReadOnly ? 'Enable editing' : 'Disable editing'}
          className={`flex-1 md:flex-none px-3 md:px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
            isReadOnly 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {isReadOnly ? '🔒 Locked' : '✏️ Edit'}
        </button>

        <button
          onClick={onClearAll}
          disabled={!text || isReadOnly}
          aria-label="Clear all content"
          title="Clear all content"
          className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-red-300 hover:text-red-200 text-sm font-semibold rounded-lg transition-colors duration-200"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Status Row */}
      <div className="px-4 md:px-6 py-2 border-t border-slate-600 flex justify-between text-xs text-slate-400 gap-2">
        <span>Characters: {text?.length?.toLocaleString() || 0}</span>
        <span>{getSyncStatus()}</span>
      </div>

      {syncError && (
        <div className="px-4 md:px-6 py-2 bg-red-500/10 border-t border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{syncError}</span>
        </div>
      )}
    </header>
  );
});

export default Toolbar;
