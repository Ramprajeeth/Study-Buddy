import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const addFlashcard = async () => {
    try {
        await addDoc(collection(db, "flashcards"), {
            userId : "123",
            fileId : "456",
            front : "What is git",
            back : "It is something",
            createdAt: new Date()
        });
        console.log("Flashcard added!");
    } catch (error) {
        console.error("Error adding flashcard:", error);
    }
};

export {addFlashcard}
