importScripts("https://js.pusher.com/beams/service-worker.js");

// Use the imported script
// This function will be called when a notification is received while the service worker is active
PusherPushNotifications.onNotificationReceived = ({ pushEvent, payload }) => {
  console.log("Beams Service Worker: Notification Received", payload);

  // You generally don't need to call showNotification yourself here.
  // The SDK handles showing the notification based on the payload received
  // unless you specifically want to customize it *before* it's shown.
  // If you needed customization, you would use:
  // const options = { body: payload.notification.body /*, other options */ };
  // pushEvent.waitUntil(self.registration.showNotification(payload.notification.title, options));
};