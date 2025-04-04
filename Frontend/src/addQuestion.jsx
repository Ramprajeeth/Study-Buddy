import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";  // Import Firestore instance

const addQuestion = async () => {
    try {
        await addDoc(collection(db, "questions"), {
            userId : '123',
            fileId : '456',
            questionText : "What is git",
            type: "mcq",
            options : ["a","b",'c'],
            correctAnswer : "a"
        });
        console.log("Question added!");
    } catch (error) {
        console.error("Error adding question:", error);
    }
};

export {addQuestion};