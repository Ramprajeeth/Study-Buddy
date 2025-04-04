import { auth } from "./firebase";  // ✅ Import `auth`
import { createUserWithEmailAndPassword } from "firebase/auth";  

const signUpUser = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User ID:", userCredential.user.uid);
    } catch (error) {
        console.error("Error signing up:", error.message);
    }
};

export { signUpUser };
