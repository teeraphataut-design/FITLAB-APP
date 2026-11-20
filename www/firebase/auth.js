window.fitlabFirebase = (async () => {
  const config = window.FITLAB_FIREBASE_CONFIG;
  if (!config?.apiKey || !config?.projectId || !config?.appId) return null;
  const base = 'https://www.gstatic.com/firebasejs/12.6.0/';
  const [{ initializeApp }, authSdk] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
  ]);
  const auth = authSdk.getAuth(initializeApp(config));
  await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
  await auth.authStateReady();
  return {
    get user() {
      return auth.currentUser;
    },
    login: (email, password) => authSdk.signInWithEmailAndPassword(auth, email, password),
    async register(username, email, password) {
      const result = await authSdk.createUserWithEmailAndPassword(auth, email, password);
      await authSdk.updateProfile(result.user, { displayName: username });
      return result;
    },
    reset: (email) => authSdk.sendPasswordResetEmail(auth, email),
    logout: () => authSdk.signOut(auth),
  };
})();
// Keep SDK download failures available to the UI without an unhandled rejection.
window.fitlabFirebase.catch(() => {});
