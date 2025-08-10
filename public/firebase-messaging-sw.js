importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAppCmCI4_vb9Hu0qBTmDh2bjTOOC347zo",
  authDomain: "pomodoro-timer-59f7c.firebaseapp.com",
  projectId: "pomodoro-timer-59f7c",
  storageBucket: "pomodoro-timer-59f7c.firebasestorage.app",
  messagingSenderId: "109208697982",
  appId: "1:109208697982:web:760b20c3c7346b2476ac2f",
  measurementId: "G-XYDVC8YSD9"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload,
  );

  // Check if the app is in the foreground
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if (client.visibilityState === 'visible') {
      // If the app is visible, don't show a notification
      return;
    }
  }

  // Customize notification here
  const notificationTitle = payload.notification.title || 'Background Message Title';
  const notificationOptions = {
    body: payload.notification.body || 'Background Message body.',
    icon: payload.notification.icon || '/icon-192x192.png',
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});