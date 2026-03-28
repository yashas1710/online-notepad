// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Notepad from "./Notepad";
import ErrorBoundary from "./components/ErrorBoundary";
import { EditorProvider } from "./context/EditorContext";
import "./App.css";

/**
 * App Root Component
 * 
 * Architecture:
 * ErrorBoundary (catches all errors)
 *   ↓
 * EditorProvider (state management)
 *   ↓
 * Router (routing)
 *   ↓
 * Routes (page components)
 */
export default function App() {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Notepad />} />
            <Route path="/note/:noteId" element={<Notepad />} />
            <Route path="/:id" element={<Notepad />} />
          </Routes>
        </Router>
      </EditorProvider>
    </ErrorBoundary>
  );
}
