importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAzZ62egsE1ZudQIqJ8VObGWuMMg0fMON8",
    authDomain: "pasr-2bf77.firebaseapp.com",
    projectId: "pasr-2bf77",
    storageBucket: "pasr-2bf77.firebasestorage.app",
    messagingSenderId: "986496673089",
    appId: "1:986496673089:web:a8806510528277c7762dc0"
});

const messaging = firebase.messaging();

// Handle background push notifications (when app is closed/backgrounded)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const title = payload.notification?.title || 'PASR Notification';
    const options = {
        body: payload.notification?.body || '',
        icon: '/images/icon.jpeg',
        badge: '/images/icon.jpeg',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        tag: payload.data?.orderId || 'pasr-notification',
        renotify: true,
        requireInteraction: true
    };

    self.registration.showNotification(title, options);
});

// Handle notification click — open the right page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const type = data.type;

    let targetUrl = '/home';
    if (type === 'ORDER_RECEIVED') {
        targetUrl = '/api/orders/my-shop-orders';
    } else if (type === 'ORDER_STATUS_UPDATE' || type === 'ORDER_BROADCAST') {
        targetUrl = '/api/orders/my-orders';
    } else if (type === 'ORDER_CLAIMED') {
        targetUrl = '/api/orders/my-shop-orders';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
