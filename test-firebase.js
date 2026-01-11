const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🧪 Тестирование инициализации Firebase...\n');

// 1. Проверяем наличие файла
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
console.log('📁 Проверка файла serviceAccountKey.json...');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Файл serviceAccountKey.json не найден!');
  console.log('📍 Путь:', serviceAccountPath);
  process.exit(1);
}
console.log('✅ Файл найден\n');

// 2. Читаем и парсим файл
console.log('📄 Чтение и парсинг JSON...');
try {
  const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(rawData);
  
  console.log('✅ JSON успешно распарсен');
  console.log(`📧 Service Account: ${serviceAccount.client_email}`);
  console.log(`🏷️ Project ID: ${serviceAccount.project_id}`);
  console.log(`🔑 Private Key ID: ${serviceAccount.private_key_id}`);
  
  // Проверяем приватный ключ
  if (!serviceAccount.private_key) {
    console.error('❌ Приватный ключ не найден в JSON');
    process.exit(1);
  }
  
  console.log(`🔑 Длина приватного ключа: ${serviceAccount.private_key.length} символов`);
  
  // Исправляем приватный ключ
  const fixedPrivateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  console.log(`🔑 Длина после исправления: ${fixedPrivateKey.length} символов`);
  
  // Проверяем формат
  if (!fixedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('❌ Неверный формат приватного ключа (отсутствует BEGIN)');
  } else {
    console.log('✅ Найден BEGIN PRIVATE KEY');
  }
  
  if (!fixedPrivateKey.includes('-----END PRIVATE KEY-----')) {
    console.error('❌ Неверный формат приватного ключа (отсутствует END)');
  } else {
    console.log('✅ Найден END PRIVATE KEY');
  }
  
  // Подсчитываем строки
  const lines = fixedPrivateKey.split('\n');
  console.log(`📝 Количество строк в ключе: ${lines.length}`);
  
  console.log('\n--- Первые 3 строки ключа ---');
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
  console.log('\n--- Последние 3 строки ключа ---');
  for (let i = Math.max(0, lines.length - 3); i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
  // 3. Пробуем инициализировать Firebase
  console.log('\n🔥 Пробуем инициализировать Firebase...');
  
  // Создаем исправленный service account объект
  const fixedServiceAccount = {
    ...serviceAccount,
    private_key: fixedPrivateKey
  };
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(fixedServiceAccount),
      storageBucket: 'help-tasc-progect.firebasestorage.app'
    });
    
    console.log('✅ Firebase Admin SDK успешно инициализирован!');
    
    const bucket = admin.storage().bucket();
    console.log(`📦 Bucket: ${bucket.name}`);
    
    // Простой тест
    bucket.getMetadata()
      .then(([metadata]) => {
        console.log('\n🎉 УСПЕХ! Все работает корректно!');
        console.log(`📍 Локация бакета: ${metadata.location}`);
        console.log(`🕐 Создан: ${metadata.timeCreated}`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Ошибка при получении метаданных бакета:', error.message);
        process.exit(1);
      });
      
  } catch (initError) {
    console.error('❌ Ошибка инициализации Firebase:', initError.message);
    
    // Детальная информация об ошибке
    if (initError.message.includes('private key')) {
      console.log('\n🔍 ДЕТАЛИ ОШИБКИ КЛЮЧА:');
      console.log('1. Убедитесь, что ключ начинается с -----BEGIN PRIVATE KEY-----');
      console.log('2. Убедитесь, что ключ заканчивается -----END PRIVATE KEY-----');
      console.log('3. Убедитесь, что нет лишних пробелов или символов');
      console.log('4. Попробуйте создать новый ключ в Firebase Console');
    }
    
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}