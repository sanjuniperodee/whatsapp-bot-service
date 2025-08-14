import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Попробуем оба возможных файла
const possibleServiceAccountPaths = [
  path.join(__dirname, 'aktau-go-420cf0ba8c4c.json')
];

function getValidServiceAccountPath(): string | null {
  for (const filePath of possibleServiceAccountPaths) {
    if (fs.existsSync(filePath)) {
      console.log(`🔑 Firebase: Найден файл service account: ${filePath}`);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        console.log(`📄 Firebase: Файл загружен. Project ID: ${parsed.project_id || 'не указан'}`);
      } catch (readError) {
        console.error(`❌ Firebase: Ошибка при чтении или парсинге JSON файла: ${filePath}`);
        throw readError;
      }

      return filePath;
    } else {
      console.log(`🔍 Firebase: Файл не найден по пути: ${filePath}`);
    }
  }
  console.log(`⚠️ Firebase: Service account файл не найден в ${__dirname}. Firebase будет отключен.`);
  return null;
}

function validateServiceAccount(filePath: string): any {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Проверяем обязательные поля
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        throw new Error(`Отсутствует обязательное поле: ${field}`);
      }
    }
    
    // Проверяем валидность private_key
    if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Некорректный формат private_key');
    }
    
    console.log(`✅ Firebase: Service account валидный для проекта ${serviceAccount.project_id}`);
    return serviceAccount;
    
  } catch (error) {
    console.error(`❌ Firebase: Ошибка валидации service account:`, error);
    throw error;
  }
}

function initializeFirebaseAdmin() {
  // Проверяем, не инициализован ли уже
  if (admin.apps.length > 0) {
    console.log('🔄 Firebase: Admin SDK уже инициализирован');
    return admin.app();
  }

  try {
    const serviceAccountPath = getValidServiceAccountPath();
    
    if (!serviceAccountPath) {
      console.log('⚠️ Firebase: Service account не найден, Firebase отключен');
      return null;
    }
    
    const serviceAccount = validateServiceAccount(serviceAccountPath);
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log(`🚀 Firebase: Admin SDK успешно инициализирован для проекта ${serviceAccount.project_id}`);
    
    // Тестируем подключение
    admin.messaging().sendToDevice('test', {
      notification: { title: 'test', body: 'test' }
    }).catch(() => {
      console.log('🧪 Firebase: Тестовая отправка (ожидаемая ошибка для тестового токена)');
    });
    
    return app;
    
  } catch (error) {
    console.error('❌ Firebase: Критическая ошибка инициализации:', error);
    console.log('⚠️ Firebase: Продолжаем без Firebase');
    return null;
  }
}

export default initializeFirebaseAdmin();
