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

    window.manualInitFCM = initFCM;

    // Only run if browser supports service workers & notifications
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('[FCM] Push notifications not supported in this browser (or context is insecure).');
        // Do not return early so the user can still click the button and see the error.
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

    async function initFCM(isSilent = false) {
        try {
            if (!('serviceWorker' in navigator)) {
                if (!isSilent && typeof showToast === 'function') showToast('Error: Your browser is blocking Service Workers because it is an INSECURE context (e.g. Incognito or plain HTTP without localhost).', 'danger');
                return;
            }

            if (!('Notification' in window)) {
                if (!isSilent && typeof showToast === 'function') showToast('Error: This browser does not support Notifications.', 'danger');
                return;
            }

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
            if (typeof showToast === "function") showToast('[FCM] Service worker registered:', registration.scope);

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                if (!isSilent && typeof showToast === "function") showToast('[FCM] Notification permission denied.');
                if (!isSilent && typeof showToast === 'function') showToast('Please allow Notification settings in your browser', 'warning');
                return;
            }

            // check if showToast is available
            if (!isSilent && typeof showToast === 'function') {
                showToast('Getting push token...', 'info');
            }

            // Get FCM token
            const token = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (!token) {
                if (!isSilent && typeof showToast === "function") showToast('[FCM] Could not get FCM token.');
                if (!isSilent) showToast('Failed to generate device token', 'danger');
                return;
            }

            if (!isSilent && typeof showToast === "function") showToast('[FCM] Token obtained:', token.substring(0, 20) + '...');

            // Save token to server — determine endpoint based on user type
            const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : '';

            const res = await fetch('/api/fcm/save-customer-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ fcmToken: token })
            });

            if (res.ok) {
                if (!isSilent && typeof showToast === "function") showToast('[FCM] Token saved to server successfully.');
                if (!isSilent) showToast('Push Notifications enabled!', 'success');
            } else {
                console.warn('[FCM] Failed to save token:', res.status);
                if (!isSilent) showToast('API Error saving token: ' + res.status, 'danger');
            }

            // Handle foreground messages (app open)
            messaging.onMessage((payload) => {
                console.log('[FCM] Foreground message payload:', payload);

                const data = payload.data || {};
                const title = data.title || 'PASR';
                const body = data.body || '';

                if (typeof showToast === "function" && body) {
                    showToast(`${title}: ${body}`, 'info');
                }

                if (Notification.permission === 'granted') {
                    const notifOptions = {
                        body,
                        icon: '/images/icon.jpeg',
                        badge: '/images/icon.jpeg',
                        tag: data.orderId || 'pasr-notif',
                        renotify: true,
                        data: data
                    };

                    try {
                        const notif = new Notification(title, notifOptions);
                        setTimeout(() => notif.close(), 8000);

                        notif.onclick = () => {
                            const type = data.type;
                            if (type === 'ORDER_RECEIVED' || type === 'ORDER_CLAIMED') {
                                window.open('/api/orders/my-shop-orders', '_blank');
                            } else {
                                window.open('/api/orders/my-orders', '_blank');
                            }
                            notif.close();
                        };
                    } catch (e) {
                         if (registration && registration.showNotification) {
                             registration.showNotification(title, notifOptions);
                         }
                    }
                }

                // Update navbar bell icon badge in real-time
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    badge.style.display = 'block';
                    if (typeof fetchNotifications === 'function') fetchNotifications();
                }
            });

        } catch (err) {
            console.error('[FCM] Initialization error:', err);
        }
    }

    function showCustomPermissionPrompt() {
        if (Notification.permission !== 'default') return;

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100vw'; overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '24px';
        dialog.style.borderRadius = '16px';
        dialog.style.maxWidth = '90%';
        dialog.style.width = '350px';
        dialog.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
        dialog.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        dialog.style.textAlign = 'center';
        dialog.style.transform = 'translateY(20px)';
        dialog.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        dialog.innerHTML = `
            <div style="font-size: 48px; color: #f59e0b; margin-bottom: 12px;">
                <i class="fa-solid fa-bell"></i>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1f2937;">Enable Notifications</h3>
            <p style="margin: 0 0 24px 0; color: #404040; font-size: 15px; line-height: 1.5;">
                PASR wants to send you instant updates about your orders and nearby deliveries.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="fcm-deny-btn" style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; background: transparent; border-radius: 10px; font-weight: 600; font-size: 15px; color: #4b5563; cursor: pointer; transition: background 0.2s;">Not Now</button>
                <button id="fcm-allow-btn" style="flex: 1; padding: 12px; border: none; background: #25D366; border-radius: 10px; font-weight: 600; font-size: 15px; color: white; cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 6px rgba(37, 211, 102, 0.2);">Allow</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'translateY(0)';
        });

        const closePrompt = () => {
            overlay.style.opacity = '0';
            dialog.style.transform = 'translateY(20px)';
            setTimeout(() => document.body.removeChild(overlay), 300);
        };

        document.getElementById('fcm-deny-btn').addEventListener('click', () => {
            closePrompt();
            localStorage.setItem('fcm_prompt_dismissed', 'true');
        });

        document.getElementById('fcm-allow-btn').addEventListener('click', () => {
            closePrompt();
            // This click event satisfies Chrome/Safari's User Gesture requirement!
            initFCM();
        });
    }

    function triggerPromptCheck() {
        try {
            if (!('Notification' in window)) {
                console.warn('[FCM] This browser does not support notifications.');
                return;
            }

            const isLoggedIn = document.body.dataset.loggedIn === 'true';
            console.log('[FCM] isLoggedIn:', isLoggedIn, '| Permission:', Notification.permission);

            if (isLoggedIn) {
                if (Notification.permission === 'granted') {
                    // Silently refresh token in background
                    initFCM(true);
                } else if (Notification.permission === 'default') {
                    if (localStorage.getItem('fcm_prompt_dismissed') !== 'true') {
                        // Show our custom prompt slightly after page load to not be overwhelming
                        setTimeout(showCustomPermissionPrompt, 1500);
                    } else {
                        console.log('[FCM] Prompt previously dismissed by user.');
                    }
                } else {
                    console.log('[FCM] Notifications are natively BLOCKED by user or browser.');
                }
            }
        } catch (e) {
            console.error('[FCM] Error in prompt check:', e);
        }
    }

    // Run initialization based on current document state
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        triggerPromptCheck();
    } else {
        window.addEventListener('load', triggerPromptCheck);
    }

    // Expose initFCM globally so we can trigger it manually for debugging
    window.manualInitFCM = initFCM;
})();
