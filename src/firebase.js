import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
  storageBucket: "hisab-app-e4616.firebasestorage.app",
  messagingSenderId: "495760469063",
  appId: "1:495760469063:web:c1e904a12071d1e5351562"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
