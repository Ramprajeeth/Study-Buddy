import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";  // Import Firestore instance

const addFile = async () => {
    try {
        await addDoc(collection(db, "files"), {
            userId : '123',
            fileName : 'git.pdf',
            fileType : 'pdf',
            uploadedAt: new Date()
        });
        console.log("File added!");
    } catch (error) {
        console.error("Error adding file:", error);
    }
};

export {addFile};