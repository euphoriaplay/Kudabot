// ============ ИСПРАВЛЕННАЯ ГЕНЕРАЦИЯ ССЫЛКИ UBER ============

// Замените эти методы в вашем CityGuideBot классе:

// 1. Основной метод генерации ссылки Uber
generateUberLink(place) {
  if (!place.latitude || !place.longitude) {
    console.log('🚗 Нет координат для Uber');
    return null;
  }
  
  console.log('🚗 [DEBUG Uber] Генерирую ссылку с данными:', {
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    google_place_id: place.google_place_id
  });
  
  // ✅ ФОРМАТ 1: Uber Deeplink (открывает приложение напрямую)
  // Этот формат работает на мобильных устройствах и открывает приложение Uber
  const encodedName = encodeURIComponent(place.name || 'Место назначения');
  const encodedAddress = encodeURIComponent(place.address || '');
  
  // Если есть Google Place ID - используем его (самый надежный вариант)
  if (place.google_place_id) {
    const deeplink = `uber://?action=setPickup&pickup=my_location` +
                    `&dropoff[latitude]=${place.latitude}` +
                    `&dropoff[longitude]=${place.longitude}` +
                    `&dropoff[nickname]=${encodedName}` +
                    `&dropoff[formatted_address]=${encodedAddress}` +
                    `&dropoff[place_id]=${place.google_place_id}`;
    
    console.log(`🚗 Deeplink с Place ID: ${deeplink}`);
    return deeplink;
  }
  
  // Если нет Place ID - используем координаты
  const deeplink = `uber://?action=setPickup&pickup=my_location` +
                  `&dropoff[latitude]=${place.latitude}` +
                  `&dropoff[longitude]=${place.longitude}` +
                  `&dropoff[nickname]=${encodedName}` +
                  `&dropoff[formatted_address]=${encodedAddress}`;
  
  console.log(`🚗 Deeplink без Place ID: ${deeplink}`);
  return deeplink;
}

// 2. Универсальный метод с fallback на веб-версию
generateSmartUberLink(place) {
  if (!place.latitude || !place.longitude) {
    return null;
  }
  
  // Возвращаем deeplink - Telegram на мобильных устройствах откроет приложение
  // На десктопе можно добавить кнопку с веб-версией отдельно
  return this.generateUberLink(place);
}

// 3. Веб-версия Uber (для десктопа)
generateUberWebLink(place) {
  if (!place.latitude || !place.longitude) {
    return null;
  }
  
  const encodedName = encodeURIComponent(place.name || 'Место');
  
  // Универсальная веб-ссылка Uber
  const webLink = `https://m.uber.com/ul/?action=setPickup` +
                 `&pickup=my_location` +
                 `&dropoff[latitude]=${place.latitude}` +
                 `&dropoff[longitude]=${place.longitude}` +
                 `&dropoff[nickname]=${encodedName}`;
  
  return webLink;
}

// 4. Метод для получения правильной ссылки
getUberLinkForPlace(place) {
  try {
    // Генерируем deeplink - он будет работать на мобильных устройствах
    const link = this.generateUberLink(place);
    
    if (!link) {
      console.log('🚗 Не удалось создать ссылку Uber');
      return null;
    }
    
    return link;
    
  } catch (error) {
    console.error('🚗 Ошибка при создании ссылки Uber:', error);
    return null;
  }
}

// ============ ОБНОВЛЕННЫЙ МЕТОД showPlaceDetails ============
// Замените секцию с кнопками такси на эту:

// В методе showPlaceDetails найдите секцию "КНОПКИ ТАКСИ" и замените на:

// ✅ КНОПКА UBER (одна кнопка с deeplink)
if (place.latitude && place.longitude) {
  const uberLink = this.getUberLinkForPlace(place);
  
  if (uberLink) {
    // Одна кнопка Uber с deeplink
    inlineKeyboard.inline_keyboard.push([
      {
        text: '🚗 Вызвать Uber',
        url: uberLink
      }
    ]);
    
    console.log(`🚗 Добавлена кнопка Uber с deeplink`);
  }
}

// ============ ТЕСТОВАЯ ФУНКЦИЯ ============

async testUberDeeplink(chatId, place) {
  if (!place.latitude || !place.longitude) {
    await this.sendAdminMessage(chatId, '❌ Нет координат для теста Uber');
    return;
  }
  
  const deeplink = this.generateUberLink(place);
  const webLink = this.generateUberWebLink(place);
  
  let message = `🚗 *Тест Uber deeplink*\n\n`;
  message += `📍 *Место:* ${place.name}\n`;
  message += `🌍 *Координаты:* ${place.latitude}, ${place.longitude}\n`;
  message += `📌 *Адрес:* ${place.address || 'нет'}\n`;
  message += `🏷️ *Google Place ID:* ${place.google_place_id || 'нет'}\n\n`;
  
  message += `*Deeplink (для приложения):*\n`;
  message += `\`${deeplink}\`\n\n`;
  
  message += `*Веб-ссылка (для браузера):*\n`;
  message += `\`${webLink}\`\n\n`;
  
  message += `📱 *На мобильном устройстве* deeplink откроет приложение Uber.\n`;
  message += `💻 *На десктопе* можно использовать веб-версию.`;
  
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '🚗 Открыть в приложении', url: deeplink }
      ],
      [
        { text: '🌐 Открыть в браузере', url: webLink }
      ],
      [
        { text: '🔙 Назад', callback_data: 'admin_action:back_to_panel' }
      ]
    ]
  };
  
  await this.sendAdminMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard
  });
}

// ============ КОМАНДА ДЛЯ ТЕСТА ============
// Добавьте в setupHandlers():

this.bot.onText(/\/testuber/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!this.isUserAdmin(userId)) {
    await this.sendAdminMessage(chatId, '❌ У вас нет доступа к этой команде.');
    return;
  }
  
  await this.deleteLastMessage(chatId);
  
  const cities = await cityManager.getAllCities();
  if (cities.length === 0) {
    await this.sendAdminMessage(chatId, '📭 Нет городов для теста.');
    return;
  }
  
  const cityName = cities[0];
  const places = await placeManager.getPlacesByCity(cityName);
  
  const testPlace = places.find(p => p.latitude && p.longitude);
  
  if (!testPlace) {
    await this.sendAdminMessage(chatId, '❌ Нет мест с координатами для теста Uber.');
    return;
  }
  
  await this.testUberDeeplink(chatId, testPlace);
});

// ============ ВАЖНЫЕ ЗАМЕЧАНИЯ ============

/*
1. DEEPLINK ФОРМАТ:
   uber://?action=setPickup&pickup=my_location
   &dropoff[latitude]=LAT
   &dropoff[longitude]=LON
   &dropoff[nickname]=NAME
   &dropoff[formatted_address]=ADDRESS
   &dropoff[place_id]=PLACE_ID

2. КАК РАБОТАЕТ:
   - На мобильных устройствах (iOS/Android) deeplink автоматически откроет приложение Uber
   - Если приложение не установлено, откроется App Store/Google Play
   - На десктопе можно предложить веб-версию

3. ПАРАМЕТРЫ:
   - pickup=my_location - автоматически использует текущую локацию пользователя
   - dropoff[latitude] и dropoff[longitude] - координаты места назначения
   - dropoff[nickname] - название места (показывается в приложении)
   - dropoff[formatted_address] - адрес места
   - dropoff[place_id] - Google Place ID (опционально, но рекомендуется)

4. ПРЕИМУЩЕСТВА ЭТОГО ПОДХОДА:
   ✅ Открывает приложение напрямую
   ✅ Автоматически подставляет текущую локацию как точку отправления
   ✅ Заполняет все данные о месте назначения
   ✅ Использует данные из Google Maps (координаты и Place ID)
   ✅ Работает на всех платформах

5. АЛЬТЕРНАТИВНЫЙ ФОРМАТ (если первый не работает):
   uber://?client_id=YOUR_CLIENT_ID
   &action=setPickup
   &pickup[latitude]=USER_LAT
   &pickup[longitude]=USER_LON
   &dropoff[latitude]=DEST_LAT
   &dropoff[longitude]=DEST_LON
   &dropoff[nickname]=NAME
   
   Но этот требует регистрации приложения в Uber

6. РЕКОМЕНДАЦИЯ:
   - Используйте первый вариант (с pickup=my_location)
   - Он не требует регистрации и работает из коробки
   - Telegram на мобильных устройствах автоматически обработает deeplink
*/
