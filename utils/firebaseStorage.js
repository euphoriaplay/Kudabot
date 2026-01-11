const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class FirebaseStorage {
  constructor() {
    this.bucket = null;
    this.initialized = false;
    
    try {
      console.log('🔧 Инициализация Firebase Storage...');
      
      // Путь к JSON файлу с ключом
      const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.error(`❌ Файл с ключом Firebase не найден: ${serviceAccountPath}`);
        console.log('ℹ️  Создайте файл serviceAccountKey.json в корне проекта');
        return;
      }

      // Читаем файл вручную и исправляем приватный ключ
      const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
      console.log('📄 Чтение serviceAccountKey.json...');
      
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(rawData);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message);
        return;
      }
      
      // Исправляем приватный ключ - заменяем литералы \n на реальные переносы строк
      if (serviceAccount.private_key) {
        console.log('🔑 Исправление приватного ключа...');
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        
        // Проверяем формат ключа
        if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
          console.error('❌ Неверный формат приватного ключа');
          return;
        }
        
        console.log(`✅ Приватный ключ исправлен, длина: ${serviceAccount.private_key.length} символов`);
      }
      
      console.log(`📧 Service Account: ${serviceAccount.client_email}`);
      console.log(`🏷️ Project ID: ${serviceAccount.project_id}`);
      
      if (!admin.apps.length) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'help-tasc-progect.firebasestorage.app'
          });
          console.log('✅ Firebase Admin SDK инициализирован');
        } catch (initError) {
          console.error('❌ Ошибка инициализации Firebase Admin SDK:', initError.message);
          return;
        }
      }
      
      this.bucket = admin.storage().bucket();
      console.log('✅ Firebase Storage инициализирован');
      console.log(`📦 Bucket: ${this.bucket.name}`);
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Критическая ошибка инициализации Firebase:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  // Проверить подключение
  async testConnection() {
    try {
      if (!this.initialized || !this.bucket) {
        return { 
          success: false, 
          error: 'Firebase Storage не инициализирован' 
        };
      }
      
      console.log('🔍 Тестирование подключения к Firebase...');
      const [files] = await this.bucket.getFiles({ 
        prefix: 'photos/', 
        maxResults: 1 
      });
      
      console.log(`✅ Подключение к Firebase успешно. Файлов в хранилище: ${files.length}`);
      return { 
        success: true, 
        fileCount: files.length,
        bucketName: this.bucket.name,
        initialized: this.initialized
      };
      
    } catch (error) {
      console.error('❌ Ошибка подключения к Firebase:', error.message);
      return { 
        success: false, 
        error: error.message,
        initialized: this.initialized
      };
    }
  }

  // Простой тест инициализации без сложных операций
  async simpleTest() {
    try {
      if (!this.initialized) {
        return { success: false, error: 'Не инициализирован' };
      }
      
      // Просто получаем информацию о бакете
      const [metadata] = await this.bucket.getMetadata();
      
      return {
        success: true,
        bucketName: metadata.name,
        location: metadata.location,
        created: metadata.timeCreated
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Загрузить фото из Telegram в Firebase
 async uploadPhotoFromTelegram(fileId, botToken) {
  try {
    if (!this.initialized || !this.bucket) {
      return { 
        success: false, 
        error: 'Firebase Storage не инициализирован' 
      };
    }

    console.log(`📥 Загружаю фото из Telegram в Firebase, fileId: ${fileId}`);
    
    // Получаем информацию о файле от Telegram
    const fileResponse = await axios.get(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
      { timeout: 10000 }
    );
    
    if (!fileResponse.data.ok) {
      throw new Error('Не удалось получить информацию о файле из Telegram');
    }
    
    const filePath = fileResponse.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    console.log(`🔗 URL файла: ${fileUrl}`);
    
    // Скачиваем файл
    const photoResponse = await axios.get(fileUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000
    });
    
    const buffer = Buffer.from(photoResponse.data);
    console.log(`📦 Размер файла: ${buffer.length} байт`);
    
    // Генерируем уникальное имя файла
    const uniqueFileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const destination = `photos/${uniqueFileName}`;
    const file = this.bucket.file(destination);
    
    // Загружаем файл
    await file.save(buffer, {
      metadata: {
        contentType: 'image/jpeg',
      },
    });
    
    // Делаем файл публичным
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;
    
    console.log(`✅ Фото загружено в Firebase: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,  // ← ВАЖНО: сохраняем URL!
      fileName: uniqueFileName,
      uploadedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Ошибка загрузки фото в Firebase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
}

module.exports = FirebaseStorage;