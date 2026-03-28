/**
 * 🛡️ Logger Utility
 * Production-safe logging
 * 
 * ✅ Development: All logs shown
 * ✅ Production: Only warnings/errors shown
 * 
 * Usage:
 *   Logger.debug('Setting userId', id);  // Dev only
 *   Logger.info('Note synced', data);     // Dev only
 *   Logger.warn('Slow sync', time);       // Always shown
 *   Logger.error('Save failed', err);     // Always shown
 */

class Logger {
  // Check if running in production mode
  static isDev = !import.meta.env.PROD;

  /**
   * Debug: Low-level detailed information (dev only)
   */
  static debug(label, data = null) {
    if (this.isDev) {
      console.log(`[DEBUG] ${label}:`, data);
    }
  }

  /**
   * Info: General informational messages (dev only)
   */
  static info(label, data = null) {
    if (this.isDev) {
      console.info(`[INFO] ${label}:`, data);
    }
  }

  /**
   * Warn: Warning messages (always shown)
   */
  static warn(label, data = null) {
    console.warn(`[WARN] ${label}:`, data);
  }

  /**
   * Error: Critical errors (always shown)
   */
  static error(label, error) {
    console.error(`[ERROR] ${label}:`, error);
    
    // Integration point for error tracking services (Sentry, etc)
    if (window.__SENTRY__) {
      window.__SENTRY__.captureException(error);
    }
  }
}

export default Logger;
