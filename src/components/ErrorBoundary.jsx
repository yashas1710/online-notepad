import React from 'react';
import Logger from '../utils/logger';

/**
 * ❌ ErrorBoundary
 * Catches React component errors and displays graceful fallback
 * Prevents "white screen of death" when components crash
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  /**
   * Update state to show fallback UI
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Log error details
   */
  componentDidCatch(error, errorInfo) {
    Logger.error('ErrorBoundary caught error', error);
    
    // Track error count (useful for detecting persistent issues)
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1
    }));
  }

  /**
   * Reset error state (allows user to try again)
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: '20px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* Error Icon + Heading */}
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            ❌ Something went wrong
          </h1>

          {/* Error Message */}
          <p style={{
            fontSize: '1.1rem',
            marginBottom: '20px',
            color: '#aaa',
            maxWidth: '500px'
          }}>
            {this.state.error?.message || 'An unexpected error occurred while running the app.'}
          </p>

          {/* Dev-Only: Error Stack Trace */}
          {import.meta.env.DEV && this.state.errorInfo && (
            <details style={{
              backgroundColor: '#2a2a2a',
              padding: '12px',
              borderRadius: '6px',
              textAlign: 'left',
              maxWidth: '600px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              border: '1px solid #444'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#569cd6',
                marginBottom: '8px'
              }}>
                📋 Error Details (Dev Only)
              </summary>
              <pre style={{
                overflowX: 'auto',
                marginTop: '10px',
                color: '#888',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#569cd6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#6fa3dd'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#569cd6'}
            >
              🔄 Try Again
            </button>

            <button
              onClick={() => {
                // Hard reload to reset app state
                window.location.href = '/';
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#777'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#666'}
            >
              📝 New Note
            </button>
          </div>

          {/* Error Count Warning */}
          {this.state.errorCount > 3 && (
            <p style={{
              marginTop: '16px',
              fontSize: '0.9rem',
              color: '#ff6b6b',
              fontStyle: 'italic'
            }}>
              ⚠️ Multiple errors detected ({this.state.errorCount}). Your browser might need a refresh.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
