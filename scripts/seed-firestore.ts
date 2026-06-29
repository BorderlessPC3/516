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
    { key: 'coinRequiredForReward', value: 15 },
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

  batch.set(db.collection('settings').doc('coinSettings'), {
    key: 'coinSettings',
    value: {
      rewardAmount: 1,
      requiredForReward: 15,
      expirationDays: 365,
      campaignBonus: 0,
      referralBonus: 5,
      socialActionBonus: 1,
    },
    updatedBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.collection('settings').doc('scratchCard'), {
    key: 'scratchCard',
    value: {
      isActive: true,
      prizes: [
        { id: 'scratch-pizza-cutter', name: 'Cortador de Pizza', weight: 30 },
        { id: 'scratch-soda', name: 'Refrigerante 2L', weight: 40 },
        { id: 'scratch-gift', name: 'Brinde Promocional', weight: 30 },
      ],
    },
    updatedBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.collection('settings').doc('coinRewards'), {
    key: 'coinRewards',
    value: {
      rewards: [
        {
          id: 'reward-pizza-50',
          name: '50% de desconto em pizza',
          description: 'Válido em pizzarias parceiras',
          coinCost: 15,
          isActive: true,
        },
      ],
    },
    updatedBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  console.log(`✅ ${settings.length + 3} configurações`);

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

  const sponsors = [
    {
      id: 'sponsor-cocacola',
      name: 'Coca-Cola',
      prizeId: 'prize-gift',
      prizeName: 'Vale Compra R$50',
      socialLinks: { INSTAGRAM: 'https://instagram.com/cocacola_br' },
    },
    {
      id: 'sponsor-posto',
      name: 'Posto Parceiro',
      prizeId: 'prize-fuel',
      prizeName: 'Cartão Combustível R$100',
      socialLinks: { WHATSAPP: 'https://wa.me/5511999999999' },
    },
  ];

  for (const sponsor of sponsors) {
    batch.set(db.collection('sponsors').doc(sponsor.id), {
      name: sponsor.name,
      prizeId: sponsor.prizeId,
      prizeName: sponsor.prizeName,
      socialLinks: sponsor.socialLinks,
      isActive: true,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ ${sponsors.length} patrocinadores`);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  batch.set(db.collection('campaigns').doc('campaign-demo'), {
    name: 'Campanha Demo Heróis',
    description: 'Campanha de demonstração com patrocinadores',
    bannerUrl: '',
    scope: 'NATIONAL',
    status: 'ACTIVE',
    displayMode: 'EXPANDED',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    requiredSocialNetworks: ['INSTAGRAM'],
    coinReward: 1,
    viewCount: 0,
    conversionCount: 0,
    sponsorIds: sponsors.map((s) => s.id),
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  sponsors.forEach((sponsor, index) => {
    batch.set(db.collection('campaignSponsors').doc(`link-demo-${sponsor.id}`), {
      campaignId: 'campaign-demo',
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      sequenceOrder: index,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('campaignQrCodes').doc(`qr-${sponsor.id}`), {
      campaignId: 'campaign-demo',
      sponsorId: sponsor.id,
      payload: `HP:SPONSOR:${sponsor.id}`,
      status: 'ACTIVE',
      scanCount: 0,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    });
  });

  batch.set(db.collection('campaignQrCodes').doc('qr-campaign-demo'), {
    campaignId: 'campaign-demo',
    payload: 'HP:CAMPAIGN:campaign-demo',
    status: 'ACTIVE',
    scanCount: 0,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 1 campanha demo com patrocinadores');

  const banners = [
    {
      id: 'banner-national-1',
      title: 'Participe das campanhas',
      imageUrl: 'https://placehold.co/800x200/e94560/ffffff?text=Heróis+dos+Prêmios',
      scope: 'NATIONAL',
      rotationSeconds: 5,
      sequenceOrder: 0,
    },
  ];

  for (const banner of banners) {
    batch.set(db.collection('banners').doc(banner.id), {
      ...banner,
      isActive: true,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ ${banners.length} banners`);

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
