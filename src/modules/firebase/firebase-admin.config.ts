import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert('src/modules/firebase/aktau-go-firebase-adminsdk-yairb-1a4fff2d03.json'),
});

export default admin;
