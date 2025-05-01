// src/Notepad.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Notepad() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!id) {
      const newId = uuidv4();
      navigate(`/${newId}`);
    }
  }, [id, navigate]);

  useEffect(() => {
    const savedText = localStorage.getItem(`notepad-text-${id}`);
    if (savedText) setText(savedText);
  }, [id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`notepad-text-${id}`, text);
    }
  }, [text, id]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">📝 Online Notepad</h1>
      <p className="mb-4 text-gray-600">
        Share this Link:
        <code className="bg-gray-200 p-1 rounded">{window.location.href}</code>
      </p>
      <textarea
        className="w-full max-w-2xl h-96 p-4 text-lg border border-pink-500 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        placeholder="Start typing..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
