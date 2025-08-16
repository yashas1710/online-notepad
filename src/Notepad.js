import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { database, ref, set, onValue } from "./firebase";

export default function Notepad() {
  const navigate = useNavigate();
  const { id } = useParams();  // Get the ID from the URL
  const [text, setText] = useState("");  // State to hold text content
  const [isLoading, setIsLoading] = useState(true);  // Track loading state

  // Generate a new note ID if not present in the URL
  useEffect(() => {
    if (!id) {
      const newId = uuidv4();  // Generate new ID
      navigate(`/${newId}`);  // Redirect to a new URL with new ID
    }
  }, [id, navigate]);

  // Fetch note text from Firebase when the page loads or ID changes
  useEffect(() => {
    if (id) {
      const textRef = ref(database, `notes/${id}`);  // Reference to Firebase
      const unsubscribe = onValue(textRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setText(data);  // Set fetched text
        } else {
          setText("");  // Clear text if no data found
        }
        setIsLoading(false);  // Stop loading after data is fetched
      });

      return () => unsubscribe();  // Clean up listener on unmount
    }
  }, [id]);  // Fetch data every time the ID changes

  // Save text to Firebase whenever it changes
  useEffect(() => {
    if (id) {
      const textRef = ref(database, `notes/${id}`);
      set(textRef, text);  // Save text to Firebase in real-time
    }
  }, [text, id]);  // Only run when the text or id changes

  // Show loading message while waiting for data from Firebase
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-semibold mb-6 text-gray-800">📝 Loading Note...</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">📝 Online Notepad</h1>
      <p className="mb-4 text-gray-600">
        Share this Link:
        <code className="bg-gray-200 p-1 rounded">{window.location.href}</code> {/* Display current URL */}
      </p>
      <textarea
        className="w-full max-w-2xl h-96 p-4 text-lg border border-pink-500 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        placeholder="Start typing..."
        value={text}  // Display text from Firebase or initial state
        onChange={(e) => setText(e.target.value)}  // Update state and Firebase
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
