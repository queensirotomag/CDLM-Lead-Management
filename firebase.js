
// firebase.js

// ✅ Hardcoded Firebase config (તમારા પ્રોજેક્ટ મુજબ)
const firebaseConfig = {
  apiKey: "AIzaSyAljqpdkTFXb8VMa-78wLB1IBJVj4ZsdyQ",
  authDomain: "cdlm-lead-management.firebaseapp.com",
  projectId: "cdlm-lead-management",
  storageBucket: "cdlm-lead-management.appspot.com", // NOTE: appspot.com
  messagingSenderId: "141867154532",
  appId: "1:141867154532:web:d2553d1808c6ce6b233371",
  measurementId: "G-HWFEMQBXZS"
};

let db = null;
let fbInitialized = false;

function initFirebase() {
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    fbInitialized = true;
    if (typeof addDebugLog === 'function') addDebugLog('✅ Firebase Connected (hardcoded config)', 'success');
    if (typeof showMessage === 'function') showMessage('Firebase Connected!', 'success');
  } catch (err) {
    console.error(err);
    if (typeof addDebugLog === 'function') addDebugLog('❌ ' + err.message, 'error');
    if (typeof showMessage === 'function') showMessage('Error: ' + err.message, 'error');
  }
}

// Auto-connect on page load
document.addEventListener('DOMContentLoaded', () => {
  try { initFirebase(); } catch (e) {}
});
