import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { authService } from '@/services/firebase/auth.service';
import { env } from '@/core/config/env';

export function FirebaseRecaptchaProvider({ children }: { children: ReactNode }) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { FirebaseRecaptchaVerifierModal } = await import('expo-firebase-recaptcha');
        // O modal é montado via ref no render abaixo quando o módulo está disponível
        void FirebaseRecaptchaVerifierModal;
      } catch {
        // Emulador/dev sem recaptcha
      }
    };

    init();
    return () => {
      mountedRef.current = false;
      authService.setRecaptchaVerifier(null);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <RecaptchaModal />
    </View>
  );
}

function RecaptchaModal() {
  const ref = useRef<{ verify: () => Promise<string> } | null>(null);

  useEffect(() => {
    let verifier: { verify: () => Promise<string> } | null = null;

    import('expo-firebase-recaptcha')
      .then(({ FirebaseRecaptchaVerifierModal }) => {
        // Componente dinâmico — registrado quando montado
        void FirebaseRecaptchaVerifierModal;
      })
      .catch(() => undefined);

    return () => authService.setRecaptchaVerifier(verifier);
  }, []);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FirebaseRecaptchaVerifierModal } = require('expo-firebase-recaptcha');
    return (
      <FirebaseRecaptchaVerifierModal
        ref={(instance: unknown) => {
          if (instance) authService.setRecaptchaVerifier(instance as never);
        }}
        firebaseConfig={env.firebase}
        attemptInvisibleVerification
      />
    );
  } catch {
    return null;
  }
}
