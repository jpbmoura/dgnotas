import { createAuthClient } from 'better-auth/react';

// baseURL é omitido de propósito: o client usa `window.location.origin`
// e o basePath padrão `/api/auth`, que o Vite proxy encaminha para o backend.
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
