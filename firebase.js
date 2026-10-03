// ===== FIREBASE INITIALIZATION =====
// Этот файл подключается ПЕРЕД app.js

const firebaseConfig = {
  apiKey: "AIzaSyCOg2tcqN94KCGVFSkNIRKo2f1X_CrzNL0",
  authDomain: "focus-bitch-6b640.firebaseapp.com",
  projectId: "focus-bitch-6b640",
  storageBucket: "focus-bitch-6b640.firebasestorage.app",
  messagingSenderId: "167095700853",
  appId: "1:167095700853:web:1e6e9ee0d0a5a3f852173c"
};

// Инициализация Firebase (через compat-версию, чтобы работало без сборщиков)
firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

// Включаем офлайн-режим (данные кэшируются локально)
fbDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.warn('Firestore persistence error:', err.code);
});

// ═══ Текущий пользователь (заполняется auth.js) ═══
let currentUser = null;