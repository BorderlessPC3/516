import * as admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('FIREBASE_PROJECT_ID não definido. Configure .env antes de executar o seed.');
  process.exit(1);
}

admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function seed() {
  console.log('🌱 Iniciando seed do Firestore...\n');

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Cidades
  const cities = [
    { id: 'city-sp', name: 'São Paulo', state: 'SP', ibgeCode: '3550308' },
    { id: 'city-rj', name: 'Rio de Janeiro', state: 'RJ', ibgeCode: '3304557' },
    { id: 'city-bh', name: 'Belo Horizonte', state: 'MG', ibgeCode: '3106200' },
    { id: 'city-cwb', name: 'Curitiba', state: 'PR', ibgeCode: '4106902' },
    { id: 'city-poa', name: 'Porto Alegre', state: 'RS', ibgeCode: '4314902' },
  ];

  for (const city of cities) {
    batch.set(db.collection('cities').doc(city.id), {
      name: city.name,
      state: city.state,
      ibgeCode: city.ibgeCode,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ ${cities.length} cidades`);

  // Settings
  const settings = [
    { key: 'coinRewardAmount', value: 1 },
    { key: 'coinRequiredForReward', value: 10 },
    { key: 'videoCompletionThreshold', value: 0.9 },
    { key: 'maintenanceMode', value: false },
  ];

  for (const setting of settings) {
    batch.set(db.collection('settings').doc(setting.key), {
      key: setting.key,
      value: setting.value,
      updatedBy: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ ${settings.length} configurações`);

  // Prêmios exemplo
  const prizes = [
    { id: 'prize-airfryer', name: 'Air Fryer 5L', type: 'AIR_FRYER', quantity: 50 },
    { id: 'prize-fuel', name: 'Cartão Combustível R$100', type: 'FUEL', quantity: 100 },
    { id: 'prize-gift', name: 'Vale Compra R$50', type: 'GIFT_CARD', quantity: 200 },
  ];

  for (const prize of prizes) {
    batch.set(db.collection('prizes').doc(prize.id), {
      name: prize.name,
      type: prize.type,
      quantity: prize.quantity,
      isActive: true,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ ${prizes.length} prêmios`);

  // Super Admin placeholder (criar usuário no Firebase Auth manualmente)
  batch.set(db.collection('admins').doc('REPLACE_WITH_AUTH_UID'), {
    email: 'admin@heroisdospremios.com.br',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    isActive: true,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  });
  console.log(
    '⚠️  Admin placeholder criado - substitua REPLACE_WITH_AUTH_UID pelo UID do Firebase Auth',
  );

  await batch.commit();
  console.log('\n🎉 Seed concluído com sucesso!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
