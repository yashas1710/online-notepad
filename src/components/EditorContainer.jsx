import React from 'react';
import ErrorBoundary from './ErrorBoundary';

export const EditorContainer = React.memo(({ children }) => {
  return (
    <div className="editor-container">
      <ErrorBoundary>
        <div className="editor-surface">{children}</div>
      </ErrorBoundary>
    </div>
  );
});

export default EditorContainer;
