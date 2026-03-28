import React from 'react';

/**
 * UserPresence Component
 * 🎯 Shows active users with avatars, initials, and typing indicators
 * ✨ Glassmorphism design: blur effect + subtle borders
 */
export const UserPresence = React.memo(({
  presenceCount = 0,
  isTyping = false
}) => {
  // Color palette for user avatars (consistent across sessions)
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];

  // Generate initials and color from user string hash
  const getAvatarStyle = (index) => {
    const color = avatarColors[index % avatarColors.length];
    return {
      backgroundColor: color,
      color: '#ffffff',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75rem',
      fontWeight: 700,
      border: '2px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    };
  };

  const UserAvatar = React.memo(({ index }) => (
    <div
      style={getAvatarStyle(index)}
      title={index === 0 ? 'You' : `User ${index + 1}`}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.1)';
        e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
    >
      {String.fromCharCode(65 + index)}
    </div>
  ));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      border: '1px solid rgba(88, 166, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease'
    }}>
      {/* User Count Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {/* Pulse indicator when someone is typing */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isTyping ? '#4ECDC4' : '#6E7681',
          animation: isTyping ? 'pulse 1.5s ease-in-out infinite' : 'none',
          transition: 'background-color 0.3s ease'
        }} />
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#C9D1D9',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
        </span>
      </div>

      {/* Avatar Badges */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginLeft: '8px'
      }}>
        {typeof presenceCount === 'number' &&
          presenceCount > 0 &&
          Array.from({ length: Math.min(presenceCount, 5) }).map((_, index) => (
            <UserAvatar key={index} index={index} />
          ))}
        {typeof presenceCount === 'number' && presenceCount > 5 && (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(88, 166, 255, 0.2)',
            border: '2px solid rgba(88, 166, 255, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#79C0FF'
          }}>
            +{presenceCount - 5}
          </div>
        )}
      </div>

      {/* Typing Indicator Text - only show if multiple users */}
      {isTyping && presenceCount > 1 && (
        <span style={{
          fontSize: '0.8rem',
          fontStyle: 'italic',
          color: '#79C0FF',
          marginLeft: '8px',
          animation: 'fadeInOut 1.5s ease-in-out infinite'
        }}>
          Someone typing...
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.4);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 0 4px rgba(78, 205, 196, 0.1);
          }
        }

        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
});

UserPresence.displayName = 'UserPresence';

export default UserPresence;
