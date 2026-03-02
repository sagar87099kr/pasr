// =============================================
// PASR — Firebase Cloud Messaging (FCM) Setup
// Requests notification permission and saves
// the push token to the server for this user.
// =============================================

(function () {
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyAzZ62egsE1ZudQIqJ8VObGWuMMg0fMON8",
        authDomain: "pasr-2bf77.firebaseapp.com",
        projectId: "pasr-2bf77",
        storageBucket: "pasr-2bf77.firebasestorage.app",
        messagingSenderId: "986496673089",
        appId: "1:986496673089:web:a8806510528277c7762dc0"
    };

    const VAPID_KEY = "BMY7WiX1yGtgHfdPfqX8vPGIukZJ1BpuVE7aLVV3u2eDOT3gR7EeKAQ9XlsI-gEUVnTFtylQIyYpuW28W3oNobI";

    // Only run if browser supports service workers & notifications
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.log('[FCM] Push notifications not supported in this browser.');
        return;
    }

    // Load Firebase SDK dynamically (v10 modular)
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function initFCM() {
        try {
            // Load Firebase compat scripts (compatible with service worker importScripts)
            await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

            // Avoid re-initializing if already done
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            const messaging = firebase.messaging();

            // Register the Firebase service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[FCM] Service worker registered:', registration.scope);

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[FCM] Notification permission denied.');
                return;
            }

            // Get FCM token
            const token = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (!token) {
                console.log('[FCM] Could not get FCM token.');
                return;
            }

            console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');

            // Save token to server — determine endpoint based on user type
            const res = await fetch('/api/fcm/save-customer-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fcmToken: token })
            });

            if (res.ok) {
                console.log('[FCM] Token saved to server successfully.');
            } else {
                console.warn('[FCM] Failed to save token:', res.status);
            }

            // Handle foreground messages (app open)
            messaging.onMessage((payload) => {
                console.log('[FCM] Foreground message received:', payload);

                const title = payload.notification?.title || 'PASR';
                const body = payload.notification?.body || '';

                // Show browser notification even when page is open
                if (Notification.permission === 'granted') {
                    const notif = new Notification(title, {
                        body,
                        icon: '/images/icon.jpeg',
                        badge: '/images/icon.jpeg',
                        tag: payload.data?.orderId || 'pasr-notif',
                        renotify: true
                    });

                    // Auto-close after 8 seconds
                    setTimeout(() => notif.close(), 8000);

                    // Handle click
                    notif.onclick = () => {
                        const type = payload.data?.type;
                        if (type === 'ORDER_RECEIVED' || type === 'ORDER_CLAIMED') {
                            window.open('/api/orders/my-shop-orders', '_blank');
                        } else {
                            window.open('/api/orders/my-orders', '_blank');
                        }
                        notif.close();
                    };
                }
            });

        } catch (err) {
            console.error('[FCM] Initialization error:', err);
        }
    }

    // Only init for logged-in users (check if body has a data attribute set in template)
    window.addEventListener('load', () => {
        const isLoggedIn = document.body.dataset.loggedIn === 'true';
        if (isLoggedIn) {
            initFCM();
        }
    });
})();
