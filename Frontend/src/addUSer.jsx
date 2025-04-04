import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";  // Import Firestore instance

// Function to add a user to Firestore
const addUser = async () => {
    try {
        await addDoc(collection(db, "users"), {  
            name: "John Doe",
            email: "john@example.com",
            createdAt: new Date(),
        });
        console.log("User added!");
    } catch (error) {
        console.error("Error adding user:", error);
    }
};

export { addUser };
