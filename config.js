// إعدادات Firebase لمشروع بصمة الشمراني
// انسخها من Firebase > Project settings > General > Your apps > Web app (SDK setup and configuration > Config)
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// UID حساب المالك من Firebase > Authentication > Users
// لازم يكون نفس الرقم المكتوب في firestore.rules
export const OWNER_UID = "PASTE_OWNER_UID";

// الموظف يدخل باسم المستخدم، والتطبيق يحوّله لإيميل داخلي بالشكل ده
export const EMAIL_DOMAIN = "shamrani-basma.app";
