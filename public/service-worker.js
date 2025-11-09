// public/service-worker.js

importScripts("https://js.pusher.com/beams/service-worker.js");

// This function will be called when a notification is received
PusherPushNotifications.onNotificationReceived = ({ pushEvent, payload }) => {
  console.log("Beams Service Worker: Forcing notification to show", payload);

  // This is the line that forces the notification to show every time
  const options = {
    body: payload.notification.body,
    icon: payload.notification.icon,
    data: payload.data,
  };
  
  // *** THIS LINE IS NOW UNCOMMENTED AND WILL RUN ***
  pushEvent.waitUntil(
    self.registration.showNotification(payload.notification.title, options)
  );
};
