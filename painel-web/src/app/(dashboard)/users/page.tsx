'use client';

import { FIRESTORE_COLLECTIONS, formatPhone, formatDate, toDate } from '@herois/shared';
import type { User } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';

import { listDocuments } from '@/services/firebase/firestore.service';

export default function UsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listDocuments<User>(FIRESTORE_COLLECTIONS.USERS),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Usuários</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Nome</th>
                <th className="text-left p-4 text-sm font-medium">WhatsApp</th>
                <th className="text-left p-4 text-sm font-medium">E-mail</th>
                <th className="text-left p-4 text-sm font-medium">Moedas</th>
                <th className="text-left p-4 text-sm font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="p-4">{user.name}</td>
                  <td className="p-4">{formatPhone(user.phone)}</td>
                  <td className="p-4">{user.email || '—'}</td>
                  <td className="p-4">{user.coinBalance}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatDate(toDate(user.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-8 text-muted-foreground text-center">Nenhum usuário</p>
          )}
        </div>
      )}
    </div>
  );
}
