import React, { useState } from 'react';

// File Chip Component
const FileChip = React.memo(({ file, onDelete, disabled, isDeleting }) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Calculate time remaining for expiry
  const getExpiryText = () => {
    const now = Date.now();
    const expiresAt = file.expiresAt || (file.uploadedAt + 30 * 24 * 60 * 60 * 1000);
    const timeLeft = expiresAt - now;

    if (timeLeft < 0) return "expired";
    if (timeLeft < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      return `${hours}h left`;
    }
    const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    return `${days}d left`;
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeleting) return;

    setShowConfirm(true);
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
    onDelete(file.name);
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 10px',
        backgroundColor: 'rgba(248, 81, 73, 0.15)',
        border: '2px solid rgba(248, 81, 73, 0.5)',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: '#f85149',
        whiteSpace: 'nowrap',
        animation: 'pulse 0.5s ease',
        marginRight: '8px',
        marginBottom: '8px',
        fontWeight: 600
      }}>
        <span>Delete?</span>
        <button
          onClick={handleConfirm}
          style={{
            background: 'rgba(248, 81, 73, 0.2)',
            border: 'none',
            borderRadius: '3px',
            color: '#f85149',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(248, 81, 73, 0.4)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(248, 81, 73, 0.2)'}
        >
          Yes
        </button>
        <button
          onClick={handleCancel}
          style={{
            background: 'rgba(88, 166, 255, 0.2)',
            border: 'none',
            borderRadius: '3px',
            color: '#79c0ff',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(88, 166, 255, 0.4)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(88, 166, 255, 0.2)'}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: isDeleting ? 'rgba(88, 166, 255, 0)' : 'rgba(88, 166, 255, 0.1)',
      border: `1px solid ${isDeleting ? 'rgba(88, 166, 255, 0.1)' : 'rgba(88, 166, 255, 0.3)'}`,
      borderRadius: '20px',
      fontSize: '0.85rem',
      color: '#79c0ff',
      whiteSpace: 'nowrap',
      position: 'relative',
      transition: 'all 0.2s ease',
      marginRight: '8px',
      marginBottom: '8px',
      opacity: isDeleting ? 0.4 : 1,
      transform: isDeleting ? 'scale(0.95)' : 'scale(1)',
      pointerEvents: isDeleting ? 'none' : 'auto'
    }}
      onMouseEnter={(e) => {
        if (!isDeleting) {
          e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.6)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDeleting) {
          e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.3)';
        }
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>📄</span>
      <a
        href={file.url}
        download={file.name}
        style={{
          color: '#79c0ff',
          textDecoration: 'none',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          cursor: isDeleting ? 'default' : 'pointer',
          pointerEvents: isDeleting ? 'none' : 'auto'
        }}
        title={file.name}
        role="button"
        tabIndex={isDeleting ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isDeleting) window.open(file.url);
        }}
      >
        {file.name}
      </a>

      {/* File Expiry Timer */}
      <span style={{
        fontSize: '0.7rem',
        color: '#6e7681',
        paddingLeft: '4px',
        borderLeft: '1px solid rgba(88, 166, 255, 0.2)'
      }}>
        {getExpiryText()}
      </span>

      <button
        onClick={handleDeleteClick}
        disabled={disabled || isDeleting}
        style={{
          background: 'none',
          border: 'none',
          color: '#f85149',
          cursor: disabled || isDeleting ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          opacity: disabled || isDeleting ? 0.5 : 0.7,
          transition: 'opacity 0.2s',
          marginLeft: '2px'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isDeleting) e.target.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isDeleting) e.target.style.opacity = '0.7';
        }}
        title={isDeleting ? "Deleting..." : "Delete file"}
        aria-label={`Delete ${file.name}`}
      >
        {isDeleting ? '⏳' : '✕'}
      </button>
    </div>
  );
});

export const FileSection = React.memo(({
  attachments,
  uploading,
  deletingFile,
  onDelete
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(88, 166, 255, 0.08)' }}>
      <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#6e7681', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📂 Attachments</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {attachments.map((file) => (
          <FileChip
            key={file.name}
            file={file}
            onDelete={onDelete}
            disabled={uploading}
            isDeleting={deletingFile === file.name}
          />
        ))}
      </div>
    </div>
  );
});
