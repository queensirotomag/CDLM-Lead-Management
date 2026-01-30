
# CDLM – Centralized Digital Lead Management (Ready-to-Deploy)

This package contains a ready-to-deploy Firebase Hosting app with Firestore integration (Sync, Pull, Live updates).

## Files
- `index.html` – UI shell
- `styles.css` – styles
- `firebase.js` – Firebase config + init (compat SDK)
- `app.js` – App logic (CSV → Clean → UI → Firestore CRUD)
- `sample.csv` – sample data
- `firebase.json`, `.firebaserc` – Firebase Hosting config

## Quick Start
```bash
npm i -g firebase-tools
firebase login
firebase deploy --only hosting
```

If you see a project mismatch, set the default project:
```bash
firebase use cdlm-lead-management
```

## Local Test
```bash
firebase emulators:start --only hosting
# open http://localhost:5000
```

## Notes
- Ensure Firestore is enabled in your project.
- For production, secure your Firestore security rules.
