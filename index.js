const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");
initializeApp();
const db = getFirestore();

exports.setAdminClaim = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  // Bootstrap is intentionally disabled. Set the first admin claim using a trusted
  // local Admin SDK script or Firebase console environment with verified operator identity.
  throw new HttpsError("permission-denied", "Admin bootstrap is disabled. Follow README.md.");
});

exports.createSecureDownloadUrl = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const productId = String(request.data?.productId || "");
  if (!productId || productId.length > 150) throw new HttpsError("invalid-argument", "Invalid product ID.");
  const productSnap = await db.doc(`products/${productId}`).get();
  if (!productSnap.exists || productSnap.data().status !== "published") throw new HttpsError("not-found", "Product unavailable.");
  const product = productSnap.data();
  const free = Number(product.price || 0) === 0;
  if (!free) {
    const orders = await db.collection("orders").where("uid", "==", request.auth.uid).where("status", "==", "completed").limit(100).get();
    const owns = orders.docs.some(d => (d.data().items || []).some(i => i.productId === productId));
    if (!owns) throw new HttpsError("permission-denied", "A completed purchase is required.");
  }
  if (!product.storagePath) throw new HttpsError("failed-precondition", "This product has no private Storage file configured.");
  const bucket = getStorage().bucket();
  const file = bucket.file(product.storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError("not-found", "Download file missing.");
  const token = crypto.randomBytes(24).toString("hex");
  await db.collection("downloadTokens").doc(token).set({
    uid: request.auth.uid, productId, expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: FieldValue.serverTimestamp()
  });
  const [url] = await file.getSignedUrl({action:"read",expires:Date.now()+5*60*1000});
  await db.collection("downloadLogs").add({uid:request.auth.uid,productId,createdAt:FieldValue.serverTimestamp()});
  return { url, expiresInSeconds: 300 };
});

exports.adminSetOrderStatus = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const claims = await getAuth().getUser(request.auth.uid);
  if (claims.customClaims?.admin !== true) throw new HttpsError("permission-denied", "Admin only.");
  const { orderId, status } = request.data || {};
  if (!orderId || !["completed","rejected","cancelled"].includes(status)) throw new HttpsError("invalid-argument", "Invalid order update.");
  await db.doc(`orders/${orderId}`).update({status,updatedAt:FieldValue.serverTimestamp(),reviewedBy:request.auth.uid});
  return {ok:true};
});