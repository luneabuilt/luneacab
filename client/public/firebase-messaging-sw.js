importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCkl3wqF_0SwBdLQieHu8vXeO79_7zkAy4",
  authDomain: "luneacabs.firebaseapp.com",
  projectId: "luneacabs",
  storageBucket: "luneacabs.firebasestorage.app",
  messagingSenderId: "736709697784",
  appId: "1:736709697784:web:c6a6f80b40a02bda27db0d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("🔥 Background message:", payload);

  const notificationTitle = payload.data.title;

  const notificationOptions = {
    body: payload.data.body,
    icon: "/icon.png",
    data: {
      rideId: payload.data.rideId,
    },
    actions: [
      {
        action: "accept",
        title: "Accept Ride",
      },
      {
        action: "reject",
        title: "Reject",
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {

  const rideId = event.notification.data.rideId;

  event.notification.close();

  // 🚕 ACCEPT RIDE DIRECTLY FROM NOTIFICATION
    if (event.action === "accept") {
      
    event.waitUntil(

      clients.matchAll({ type: "window", includeUncontrolled: true })
        .then(function (clientList) {

          if (clientList.length > 0) {
            clientList[0].postMessage({
              type: "ACCEPT_RIDE",
              rideId: rideId
            });

            return clientList[0].focus();
          }

          return clients.openWindow(`/driver?ride=${rideId}`);
        })

    );

    return;
  }
  if (event.action === "reject") {
    return;
  }

  // 📱 NORMAL CLICK → OPEN DRIVER APP
  event.waitUntil(
    clients.openWindow(`/driver?ride=${rideId}`)
  );

});
