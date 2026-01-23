import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAljqpdkTFXb8VMa-78wLB1IBJVj4ZsdyQ",
  authDomain: "cdlm-lead-management.firebaseapp.com",
  projectId: "cdlm-lead-management",
  storageBucket: "cdlm-lead-management.firebasestorage.app",
  messagingSenderId: "141867154532",
  appId: "1:141867154532:web:d2553d1808c6ce6b233371",
  measurementId: "G-HWFEMQBXZS"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

