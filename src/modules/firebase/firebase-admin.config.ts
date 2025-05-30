import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, 'aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export default admin;
