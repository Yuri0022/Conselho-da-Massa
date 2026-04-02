# 🐔 Conselho da Massa - Clube Atlético Mineiro

O **Conselho da Massa** é uma plataforma digital inovadora projetada para dar voz ao torcedor do **Clube Atlético Mineiro**. Através desta aplicação, os atleticanos podem sugerir melhorias, votar em ideias da comunidade e debater o futuro do clube de forma organizada e transparente.

![Galo Logo](https://upload.wikimedia.org/wikipedia/pt/e/e4/Atletico_mineiro_galo.png)

## 🚀 Funcionalidades

- **Autenticação Segura:** Login e registro via E-mail/Senha ou **Google Sign-In**, com perfis persistentes no Firebase.
- **Sugestão de Ideias:** Envio de propostas detalhadas com categorização e validação de segurança.
- **Edição de Sugestões:** Autores podem editar suas próprias ideias (título, descrição e categoria) a qualquer momento.
- **Votação Democrática:** Sistema de "Gostei" e "Não Gostei" com transações atômicas e trava de voto único por usuário.
- **Filtros Avançados:** 
  - Menu suspenso (picklist) para categorias.
  - Filtro **"Minhas Sugestões"** para acompanhar suas próprias propostas.
- **Debate Ativo:** Seção de comentários em tempo real para cada ideia.
- **Busca em Tempo Real:** Localize sugestões rapidamente por palavras-chave.
- **Interface Premium:** Design moderno em preto, branco e dourado, com animações fluidas utilizando Framer Motion.

## 🛠️ Tecnologias Utilizadas

- **React 18** com **Vite** para performance superior.
- **Firebase (Auth & Firestore):** Backend as a Service para autenticação e banco de dados em tempo real.
- **TypeScript** para garantir a robustez e segurança do código.
- **Tailwind CSS** para uma estilização moderna e responsiva.
- **Framer Motion** para micro-interações e animações de interface.
- **Lucide React** para um conjunto de ícones consistente e elegante.

## 📦 Como Executar o Projeto

1.  **Clone o repositório:**
    ```bash
    git clone <url-do-repositorio>
    ```
2.  **Configuração do Firebase:**
    Certifique-se de que o arquivo `firebase-applet-config.json` contenha as credenciais válidas do seu projeto Firebase.
3.  **Instale as dependências:**
    ```bash
    npm install
    ```
4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
5.  **Acesse no navegador:**
    O projeto estará disponível em `http://localhost:3000`.

## 🛡️ Segurança e Privacidade

O sistema utiliza **Firebase Security Rules** para garantir que:
- Apenas o autor possa editar sua própria sugestão.
- Votos sejam únicos e vinculados ao UID do usuário.
- Dados sensíveis de perfil sejam protegidos contra acesso não autorizado.

---

*Desenvolvido com paixão pela Massa Atleticana. **Galo Sempre!***
