const fs = require('fs-extra');
const path = require('path');

async function initData() {
  const dataDir = path.join(__dirname, 'data');
  
  // Создаем папку data если нет
  await fs.ensureDir(dataDir);
  
  // Файл со списком городов
  const citiesFile = path.join(dataDir, 'cities.json');
  if (!await fs.pathExists(citiesFile)) {
    const initialCities = ['Москва', 'Санкт-Петербург', 'Казань'];
    await fs.writeJson(citiesFile, initialCities, { spaces: 2 });
    console.log('✅ Создан файл cities.json');
  }
  
  // Файл категорий (с проверкой)
  const categoriesFile = path.join(dataDir, 'categories.json');
  if (!await fs.pathExists(categoriesFile)) {
    const initialCategories = [
      {
        id: 16,
        name: "Пиццерии",
        emoji: "🍕",
        icon: "🍕",
        isCustom: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 17,
        name: "Суши-бары",
        emoji: "🍣",
        icon: "🍣",
        isCustom: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 18,
        name: "Кофейни",
        emoji: "☕",
        icon: "☕",
        isCustom: true,
        createdAt: new Date().toISOString()
      }
    ];
    await fs.writeJson(categoriesFile, initialCategories, { spaces: 2 });
    console.log('✅ Создан файл categories.json');
  } else {
    // Проверяем существующий файл
    try {
      const data = await fs.readJson(categoriesFile);
      if (!Array.isArray(data)) {
        console.warn('⚠️ categories.json поврежден, пересоздаем...');
        await fs.remove(categoriesFile);
        await initData(); // Рекурсивно вызываем создание
      }
    } catch (error) {
      console.warn('⚠️ Ошибка чтения categories.json, пересоздаем...', error.message);
      await fs.remove(categoriesFile);
      await initData();
    }
  }
  
  // Пример данных для города Валенсия
  const valenciaFile = path.join(dataDir, 'valencia.json');
  if (!await fs.pathExists(valenciaFile)) {
    const valenciaData = {
      city: 'Валенсия',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      places: [
        {
          id: 1,
          category_id: 1,
          category_name: 'Рестораны и кафе',
          category_emoji: '🍽️',
          name: 'Ресторан "Испанский дворик"',
          address: 'ул. Центральная, 10',
          working_hours: '12:00 - 23:00',
          average_price: '1500-2500 руб',
          description: 'Уютный ресторан с испанской кухней',
          website: '',
          phone: '+7 999 123-45-67',
          map_url: 'https://yandex.ru/maps/?text=ул. Центральная, 10',
          photos: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          category_id: 3,
          category_name: 'Парки и скверы',
          category_emoji: '🌳',
          name: 'Центральный парк',
          address: 'ул. Парковая, 25',
          working_hours: 'круглосуточно',
          average_price: 'бесплатно',
          description: 'Популярный парк для прогулок и отдыха',
          website: '',
          phone: '',
          map_url: 'https://yandex.ru/maps/?text=ул. Парковая, 25',
          photos: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          category_id: 13,
          category_name: 'Клубы',
          category_emoji: '🎉',
          name: 'Ночной клуб "Атмосфера"',
          address: 'ул. Вечерняя, 15',
          working_hours: '22:00 - 06:00 (чт-сб)',
          average_price: '1000 руб вход',
          description: 'Современный ночной клуб с живой музыкой',
          website: 'https://atmosphere-club.ru',
          phone: '+7 999 987-65-43',
          map_url: 'https://yandex.ru/maps/?text=ул. Вечерняя, 15',
          photos: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    
    await fs.writeJson(valenciaFile, valenciaData, { spaces: 2 });
    console.log('✅ Создан файл valencia.json');
  }
  
  // Создаем папки для загрузок
  const uploadsDir = path.join(__dirname, 'uploads');
  await fs.ensureDir(path.join(uploadsDir, 'photos'));
  await fs.ensureDir(path.join(uploadsDir, 'temp'));
  
  console.log('✅ Инициализация данных завершена!');
  console.log('📋 Для восстановления файла категорий используйте команду /fix_categories');
}

initData().catch(console.error);