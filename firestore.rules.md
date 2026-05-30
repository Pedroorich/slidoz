# Regras de Segurança do Firebase Firestore

Para garantir que a sua aplicação funcione de forma 100% segura e profissional (evitando que um cliente veja os dados de outro ou manipule sua própria assinatura), você deve configurar as **Regras de Segurança (Security Rules)** do Firestore.

### 🔒 Como Configurar:

1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Abra o seu projeto **slidoz**.
3. No menu lateral esquerdo, clique em **Firestore Database**.
4. Clique na aba **Rules (Regras)** no topo da página.
5. Substitua todo o conteúdo existente pelo bloco de código abaixo.
6. Clique em **Publish (Publicar)**.

---

### 📝 Código das Regras (Copie e Cole):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função utilitária para verificar se o usuário logado é o administrador
    function isAdmin() {
      return request.auth != null && 
        (request.auth.token.email.lower() == 'ph44608@gmail.com' ||
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Regras para a coleção de usuários
    match /users/{userId} {
      // Qualquer usuário logado pode ler seu próprio perfil, e o admin lê todos
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      
      // Permite criar o próprio documento (necessário para o admin no primeiro login) ou criação pelo admin
      allow create: if request.auth != null && (request.auth.uid == userId || isAdmin());
      
      // Apenas o administrador pode atualizar planos ou deletar usuários
      allow update, delete: if isAdmin();
    }

    // Regras para a coleção de logs de atividades (auditoria)
    match /activity_logs/{logId} {
      // Apenas o administrador pode ler ou listar os logs globais de uso
      allow read: if isAdmin();
      
      // Qualquer cliente autenticado pode gravar novos logs ao gerar ou exportar
      allow create: if request.auth != null;
      
      // Ninguém pode alterar ou apagar logs (auditoria imutável), exceto admin se necessário
      allow update, delete: if isAdmin();
    }
  }
}
```

---

### 🔑 Configuração Adicional Obrigatória (Firebase Authentication):

Para que você consiga criar os logins e senhas manualmente e seus clientes consigam logar, ative o método de Login por E-mail/Senha no Firebase:

1. No menu lateral esquerdo do Firebase Console, clique em **Authentication**.
2. Clique na aba **Sign-in method (Método de login)**.
3. Clique em **Add new provider (Adicionar novo provedor)** e selecione **Email/Password (E-mail/Senha)**.
4. **Ative (Enable)** a primeira opção ("Email/Password") e salve.
