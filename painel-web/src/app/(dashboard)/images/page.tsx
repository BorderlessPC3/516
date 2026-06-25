'use client';

import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import type { CampaignImage } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { auth, storage } from '@/services/firebase/client';
import { listDocuments, createDocument } from '@/services/firebase/firestore.service';

export default function ImagesPage() {
  const [uploading, setUploading] = useState(false);

  const { data: images = [], refetch } = useQuery({
    queryKey: ['images'],
    queryFn: () => listDocuments<CampaignImage>(FIRESTORE_COLLECTIONS.CAMPAIGN_IMAGES),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setUploading(true);
    try {
      const imageId = crypto.randomUUID();
      const storagePath = `campaigns/images/${imageId}/${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await createDocument(
        FIRESTORE_COLLECTIONS.CAMPAIGN_IMAGES,
        { title: file.name, originalFileName: file.name, url, storagePath },
        uid,
      );
      refetch();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestão de Imagens</h1>
        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild disabled={uploading}>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Upload Imagem'}
            </span>
          </Button>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <Card key={img.id}>
            <CardContent className="p-4">
              {img.url && (
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
              )}
              <p className="text-sm truncate">{img.title}</p>
              {img.campaignId && (
                <p className="text-xs text-muted-foreground">Campanha: {img.campaignId}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
