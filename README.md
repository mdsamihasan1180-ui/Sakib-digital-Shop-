# SAKIB DIGITAL STORE

Professional Firebase marketplace starter. The included application has a live Firebase connection point, email/password and Google sign-in, product listing/search/filter, cart, order creation, admin-claim gated product management, and callable secure-download/order-status backend foundations.

## Important status / honest scope
This is a working foundation, not a claim that every feature in the original wishlist is already implemented. Real payment gateway processing, refunds, subscriptions, vendor payouts, email/push campaigns, license activation, analytics dashboards, multi-language content, and full order/payment administration require additional provider-specific integrations and server workflows. The checkout in this starter creates an order record; it does **not** collect money or automatically approve payment. Do not represent an order as paid until a verified gateway webhook or an authorized manual review confirms it.

## 1. Add Firebase Web config
Open `public/index.html`, find `const firebaseConfig`, and replace all six `PASTE_...` values with the config from Firebase Console → Project settings → General → Your apps → Web app. Do not paste service-account JSON or private keys into browser code.

## 2. Firebase console setup
1. Authentication → Sign-in method: enable Email/Password and Google. Add your deployed domain under Authentication → Settings → Authorized domains.
2. Create a Cloud Firestore database.
3. Create a Storage bucket.
4. Register a Firebase App Check provider and configure it for your web app before enforcing App Check.
5. Upgrade to the Firebase plan required by Cloud Functions/your selected services; check current Firebase pricing and regional availability.

## 3. Deploy
Install Node.js 20+ and Firebase CLI, then:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions && npm install && cd ..
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```
Set the hosting public directory to `public` (already configured).

## 4. Create the first administrator safely
The browser never grants itself admin access. Admin access depends on the Firebase Auth custom claim `admin: true`. The callable `setAdminClaim` is deliberately disabled to prevent self-promotion.

Use a trusted, private machine with Firebase Admin SDK credentials (never upload the key to the website or share it in chat). Example one-time script:
```js
const admin = require("firebase-admin");
admin.initializeApp({credential: admin.credential.applicationDefault()});
(async () => {
  const user = await admin.auth().getUser("TARGET_FIREBASE_AUTH_UID");
  await admin.auth().setCustomUserClaims(user.uid, {admin: true});
  console.log("Admin claim set. Sign out/in and refresh ID token.");
})();
```
Only a trusted project owner should run this. Use a separate least-privilege process for additional roles; this starter only recognizes the `admin` claim.

## 5. Product data
Create product documents in `products` using the Admin SDK or after signing in with an admin custom claim:
```json
{
  "name": "Starter Website Template",
  "category": "Website Templates",
  "description": "A responsive starter template.",
  "price": 0,
  "status": "published",
  "version": "1.0.0",
  "imageUrl": "https://example.com/preview.webp",
  "storagePath": "private-downloads/starter-template.zip"
}
```
For paid products, set `price` to a positive number. For secure downloads, upload the file under `private-downloads/` and store its exact `storagePath`. Do not expose private files using public download URLs. The callable download function checks for a completed order for paid items.

## 6. Security notes before production
- Review and test Firestore and Storage rules with the Firebase Emulator Suite.
- Validate product price and totals on the server before accepting payments. Never trust totals sent by a browser.
- Implement payment provider webhook signature verification on Cloud Functions; never rely on a client-submitted transaction ID or screenshot as proof of payment.
- Add App Check, abuse controls, monitoring, backups, privacy/terms/refund policies, and data-retention procedures.
- Add ownership and role-specific rules before enabling reviews, wishlists, support tickets, coupons, affiliate data, or user profile edits.
- The sample product admin UI uses a direct external download URL field only as metadata; use `storagePath` and the secure function for private delivery.
- `confirm()` is used only for destructive delete confirmation; replace with a branded modal if desired.
- Do not store passwords, payment secrets, or service-account keys in Firestore, LocalStorage, or frontend code.

## Branding
The footer permanently displays **Developed with ♥ by Developer Sakib**.
