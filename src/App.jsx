// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Notepad from "./Notepad";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Notepad />} />
        <Route path="/:id" element={<Notepad />} />
      </Routes>
    </Router>
  );
}
