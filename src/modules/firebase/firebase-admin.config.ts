import * as path from 'path';
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(
    path.join(__dirname, 'aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json')
  ),
});

export default admin;
