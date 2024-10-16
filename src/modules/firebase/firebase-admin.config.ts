import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert('src/modules/firebase/aktau-go-firebase-adminsdk-yairb-1b4b0b54cc.json'),
});

export default admin;
