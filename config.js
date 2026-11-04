// إعدادات Firebase لمشروع بصمة الشمراني
// انسخها من Firebase > Project settings > General > Your apps > Web app (SDK setup and configuration > Config)
export const firebaseConfig = {
  apiKey: "AIzaSyC0CKfm1aiiuc-If8WVYiLBad8DP-iLz5Q",
  authDomain: "alshmorani-1a1a2.firebaseapp.com",
  projectId: "alshmorani-1a1a2",
  storageBucket: "alshmorani-1a1a2.firebasestorage.app",
  messagingSenderId: "608129324316",
  appId: "1:608129324316:web:197f339d9e2bf9e471d6d9",
  measurementId: "G-62VGJTMSYP"
};

// UID حساب المالك من Firebase > Authentication > Users
// لازم يكون نفس الرقم المكتوب في firestore.rules
export const OWNER_UID = "bRGeKE9GqXYFh2F93FO6osHYxr63";

// الموظف يدخل باسم المستخدم، والتطبيق يحوّله لإيميل داخلي بالشكل ده
export const EMAIL_DOMAIN = "shamrani-basma.app";
