const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Путь к файлу с ключом
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

async function migratePhotos() {
  try {
    console.log('🚀 Начинаю миграцию фото...');
    
    // Инициализируем Firebase
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'help-tasc-progect.firebasestorage.app'
    });
    
    const bucket = admin.storage().bucket();
    console.log(`✅ Firebase инициализирован, bucket: ${bucket.name}`);
    
    // Читаем все файлы городов
    const citiesDir = path.join(__dirname, 'data', 'cities');
    const cityFiles = await fs.readdir(citiesDir);
    
    console.log(`🏙️ Найдено ${cityFiles.length} файлов городов`);
    
    for (const cityFile of cityFiles) {
      if (!cityFile.endsWith('.json')) continue;
      
      const cityPath = path.join(citiesDir, cityFile);
      const cityData = JSON.parse(await fs.readFile(cityPath, 'utf8'));
      const cityName = path.basename(cityFile, '.json');
      
      console.log(`\n🔍 Обрабатываю город: ${cityName}`);
      
      if (!cityData.places || cityData.places.length === 0) {
        console.log(`📭 В городе ${cityName} нет мест`);
        continue;
      }
      
      let updatedCount = 0;
      
      for (const place of cityData.places) {
        if (!place.photos || place.photos.length === 0) continue;
        
        const newPhotos = [];
        let photosUpdated = false;
        
        for (const photo of place.photos) {
          // Если фото уже имеет URL, оставляем как есть
          if (photo && photo.url) {
            newPhotos.push(photo);
            continue;
          }
          
          // Если есть только fileName, генерируем URL
          if (photo && photo.fileName) {
            const url = `https://storage.googleapis.com/${bucket.name}/photos/${photo.fileName}`;
            newPhotos.push({
              ...photo,
              url: url
            });
            photosUpdated = true;
          }
        }
        
        if (photosUpdated) {
          place.photos = newPhotos;
          updatedCount++;
          console.log(`✅ Обновлено фото для места: ${place.name}`);
        }
      }
      
      if (updatedCount > 0) {
        // Сохраняем обновленные данные
        await fs.writeFile(cityPath, JSON.stringify(cityData, null, 2), 'utf8');
        console.log(`💾 Сохранен город ${cityName}, обновлено мест: ${updatedCount}`);
      }
    }
    
    console.log('\n🎉 Миграция завершена!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

// Запуск миграции
migratePhotos();