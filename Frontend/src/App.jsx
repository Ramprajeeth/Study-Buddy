import React from "react";
import { addUser } from "./addUSer";  // Import function
import { addFile } from "./addFile";
import { addQuestion } from "./addQuestion";
import { addFlashcard } from "./addFlashcard";
function App() {
    return (
        <div>
            <h1>Firestore User Management</h1>
            <button onClick={addUser}>Add User to Firestore</button>
            <button onClick={addFile}>Upload a file</button>
          <button onClick={addFile}>Upload a file</button>
          <button onClick={addQuestion}>Add a question? It is wrong though it must be added by the LLM</button>
          <button onClick={addFlashcard}>add flash</button>
        </div>
    );
}

export default App;

