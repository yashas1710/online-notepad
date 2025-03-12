import { useState, useEffect } from "react";

export default function Notepad() {
  const [text, setText] = useState("");

  // Load saved note from localStorage
  useEffect(() => {
    const savedText = localStorage.getItem("notepad-text");
    if (savedText) setText(savedText);
  }, []);

  // Save note to localStorage on change
  useEffect(() => {
    localStorage.setItem("notepad-text", text);
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">📝 Online Notepad</h1>
      <textarea
        className="w-full max-w-2xl h-96 p-4 text-lg border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        placeholder="Enter your note here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      ></textarea>
    </div>
  );
}