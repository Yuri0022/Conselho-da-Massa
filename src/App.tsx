/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare, 
  Search, 
  Trophy, 
  Users, 
  Zap, 
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Mail,
  Lock,
  AtSign,
  Edit,
  X
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  getDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  runTransaction,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

interface User {
  uid: string;
  fullName: string;
  nickname: string;
  email: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  authorUid: string;
  authorNickname: string;
  likes: number;
  dislikes: number;
  comments: Comment[];
  category: 'Infraestrutura' | 'Futebol' | 'Marketing' | 'Sócio-Torcedor' | 'Outros';
  date: string;
}

const CATEGORIES = ['Futebol', 'Marketing', 'Infraestrutura', 'Sócio-Torcedor', 'Outros'] as const;
type Category = typeof CATEGORIES[number];

const MOCK_IDEAS: Idea[] = [
  {
    id: '1',
    title: 'Melhoria na Acústica da Arena MRV',
    description: 'Sugiro a instalação de painéis refletores no teto para que o som da Massa seja direcionado ao campo, aumentando a pressão sonora sobre o adversário.',
    authorUid: 'mock-1',
    authorNickname: 'Atleticano_BH',
    likes: 2450,
    dislikes: 120,
    category: 'Infraestrutura',
    date: '2024-03-25',
    comments: []
  },
  {
    id: '2',
    title: 'Galo na Veia: Categoria Popular',
    description: 'Criação de um plano de sócio-torcedor com valor reduzido para torcedores de baixa renda, com acesso garantido a setores específicos da Arena.',
    authorUid: 'mock-2',
    authorNickname: 'MassaForte',
    likes: 3100,
    dislikes: 45,
    category: 'Sócio-Torcedor',
    date: '2024-03-20',
    comments: []
  },
  {
    id: '3',
    title: 'Integração Base-Profissional',
    description: 'Implementar um sistema de intercâmbio onde jogadores do Sub-20 treinam semanalmente com o elenco principal para acelerar a transição.',
    authorUid: 'mock-3',
    authorNickname: 'Conselheiro_Galo',
    likes: 1200,
    dislikes: 80,
    category: 'Futebol',
    date: '2024-03-28',
    comments: []
  },
  {
    id: '4',
    title: 'Museu Interativo na Cidade do Galo',
    description: 'Transformar parte do CT em um espaço visitável para sócios, com realidade virtual revivendo a conquista da Libertadores de 2013.',
    authorUid: 'mock-4',
    authorNickname: 'HistóriaAlvinegra',
    likes: 850,
    dislikes: 15,
    category: 'Marketing',
    date: '2024-03-29',
    comments: []
  }
];

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState<Category>('Futebol');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todas'>('Todas');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnlyMyIdeas, setShowOnlyMyIdeas] = useState(false);
  
  // Edit State
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'Futebol' as Category });
  const [isEditing, setIsEditing] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // Voting & Comments State
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike' | null>>({});
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Form States
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const passwordCriteria = {
    length: (registerForm.password?.length || 0) >= 8,
    uppercase: /[A-Z]/.test(registerForm.password || ''),
    lowercase: /[a-z]/.test(registerForm.password || ''),
    number: /[0-9]/.test(registerForm.password || ''),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(registerForm.password || ''),
    match: registerForm.password === registerForm.confirmPassword && (registerForm.password?.length || 0) > 0
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({
              uid: firebaseUser.uid,
              fullName: userData.fullName,
              nickname: userData.nickname,
              email: firebaseUser.email || '',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'ideas'), orderBy('date', 'desc'));
    const unsubscribeIdeas = onSnapshot(q, (snapshot) => {
      const ideasData = snapshot.docs.map(doc => ({
        id: doc.id,
        comments: [], // Initialize comments array
        ...doc.data()
      })) as Idea[];
      setIdeas(ideasData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ideas');
    });

    return () => unsubscribeIdeas();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserVotes({});
      return;
    }

    const q = query(collection(db, 'votes'), where('userId', '==', currentUser.uid));
    const unsubscribeVotes = onSnapshot(q, (snapshot) => {
      const votes: Record<string, 'like' | 'dislike' | null> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        votes[data.ideaId] = data.type;
      });
      setUserVotes(votes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'votes');
    });

    return () => unsubscribeVotes();
  }, [currentUser]);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    expandedIdeas.forEach(ideaId => {
      const q = query(collection(db, 'ideas', ideaId, 'comments'), orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        
        setIdeas(prev => prev.map(idea => 
          idea.id === ideaId ? { ...idea, comments: commentsData } : idea
        ));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `ideas/${ideaId}/comments`);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [expandedIdeas]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create profile for new Google user
        await setDoc(doc(db, 'users', user.uid), {
          fullName: user.displayName || 'Torcedor do Galo',
          nickname: user.displayName?.split(' ')[0].toLowerCase() || 'galo_fan',
          email: user.email || '',
          role: 'user'
        });
        
        setCurrentUser({
          uid: user.uid,
          fullName: user.displayName || 'Torcedor do Galo',
          nickname: user.displayName?.split(' ')[0].toLowerCase() || 'galo_fan',
          email: user.email || ''
        });
      }
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('Erro ao entrar com Google. Tente novamente.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
    } catch (error: any) {
      setAuthError('E-mail ou senha incorretos.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!registerForm.fullName || !registerForm.nickname || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setAuthError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
    if (!allCriteriaMet) {
      setAuthError('A senha não atende a todos os critérios de segurança.');
      return;
    }

    setIsRegistering(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      const user = userCredential.user;

      try {
        await setDoc(doc(db, 'users', user.uid), {
          fullName: registerForm.fullName,
          nickname: registerForm.nickname,
          email: registerForm.email,
          role: 'user'
        });
      } catch (firestoreError: any) {
        console.error("Firestore error during registration:", firestoreError);
        // If firestore fails, we still have the user in Auth, but the profile is missing.
        // We should probably delete the user or handle it.
        // For now, let's just log it and show a specific error.
        setAuthError('Conta criada, mas houve um erro ao salvar seu perfil. Por favor, contate o suporte.');
        setIsRegistering(false);
        return;
      }

      setCurrentUser({
        uid: user.uid,
        fullName: registerForm.fullName,
        nickname: registerForm.nickname,
        email: registerForm.email
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('E-mail inválido.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('A senha é muito fraca.');
      } else {
        setAuthError(`Erro ao criar conta: ${error.message}`);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Sort ideas by net score (likes - dislikes)
  const sortedIdeas = [...ideas].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));

  const handleLike = async (id: string) => {
    if (!currentUser) return;
    const currentVote = userVotes[id];
    const voteId = `${currentUser.uid}_${id}`;
    const voteRef = doc(db, 'votes', voteId);
    const ideaRef = doc(db, 'ideas', id);

    try {
      await runTransaction(db, async (transaction) => {
        const ideaDoc = await transaction.get(ideaRef);
        if (!ideaDoc.exists()) return;

        if (currentVote === 'like') {
          transaction.update(ideaRef, { likes: increment(-1) });
          transaction.delete(voteRef);
        } else if (currentVote === 'dislike') {
          transaction.update(ideaRef, { likes: increment(1), dislikes: increment(-1) });
          transaction.set(voteRef, { userId: currentUser.uid, ideaId: id, type: 'like' });
        } else {
          transaction.update(ideaRef, { likes: increment(1) });
          transaction.set(voteRef, { userId: currentUser.uid, ideaId: id, type: 'like' });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ideas/${id}`);
    }
  };

  const handleDislike = async (id: string) => {
    if (!currentUser) return;
    const currentVote = userVotes[id];
    const voteId = `${currentUser.uid}_${id}`;
    const voteRef = doc(db, 'votes', voteId);
    const ideaRef = doc(db, 'ideas', id);

    try {
      await runTransaction(db, async (transaction) => {
        const ideaDoc = await transaction.get(ideaRef);
        if (!ideaDoc.exists()) return;

        if (currentVote === 'dislike') {
          transaction.update(ideaRef, { dislikes: increment(-1) });
          transaction.delete(voteRef);
        } else if (currentVote === 'like') {
          transaction.update(ideaRef, { dislikes: increment(1), likes: increment(-1) });
          transaction.set(voteRef, { userId: currentUser.uid, ideaId: id, type: 'dislike' });
        } else {
          transaction.update(ideaRef, { dislikes: increment(1) });
          transaction.set(voteRef, { userId: currentUser.uid, ideaId: id, type: 'dislike' });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ideas/${id}`);
    }
  };

  const handleEditIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea || !currentUser) return;
    
    setIsEditing(true);
    try {
      const ideaRef = doc(db, 'ideas', editingIdea.id);
      await updateDoc(ideaRef, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        updatedAt: serverTimestamp()
      });
      setEditingIdea(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ideas/${editingIdea.id}`);
    } finally {
      setIsEditing(false);
    }
  };

  const startEditing = (idea: Idea) => {
    setEditingIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description,
      category: idea.category
    });
  };

  const toggleComments = (id: string) => {
    setExpandedIdeas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddComment = async (ideaId: string) => {
    const text = commentInputs[ideaId];
    if (!text || !currentUser) return;

    try {
      const commentRef = collection(db, 'ideas', ideaId, 'comments');
      await addDoc(commentRef, {
        authorUid: currentUser.uid,
        authorNickname: currentUser.nickname,
        text: text,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      setCommentInputs(prev => ({ ...prev, [ideaId]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `ideas/${ideaId}/comments`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle || !newIdeaDesc || !currentUser) return;

    setIsProcessing(true);
    
    // Simulate AI processing/validation
    setTimeout(async () => {
      try {
        await addDoc(collection(db, 'ideas'), {
          title: newIdeaTitle,
          description: newIdeaDesc,
          authorUid: currentUser.uid,
          authorNickname: currentUser.nickname,
          likes: 1,
          dislikes: 0,
          category: newIdeaCategory,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        });

        setIsProcessing(false);
        setShowSuccess(true);
        setNewIdeaTitle('');
        setNewIdeaDesc('');
        setNewIdeaCategory('Futebol');
        
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        setIsProcessing(false);
        handleFirestoreError(error, OperationType.CREATE, 'ideas');
      }
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Watermark (Text) */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <h2 className="text-[10vw] font-black text-white/5 uppercase tracking-tighter text-center leading-none select-none">
            Clube Atlético Mineiro
          </h2>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl z-10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tighter mb-2">
              CONSELHO DA <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">MASSA</span>
            </h1>
            <p className="text-zinc-400 text-sm">Acesse o portal para sugerir ideias ao Galo</p>
          </div>

          <div className="flex bg-black p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setIsLoginView(true); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLoginView ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setIsLoginView(false); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLoginView ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              Cadastro
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold rounded-lg text-center">
              {authError}
            </div>
          )}

          {isLoginView ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  placeholder="Senha" 
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all uppercase tracking-tighter flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                Entrar no Portal
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500 font-bold">Ou continue com</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-tighter flex items-center justify-center gap-2"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                Entrar com Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Nome Completo *" 
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Apelido (como aparecerá na ideia) *" 
                  value={registerForm.nickname}
                  onChange={(e) => setRegisterForm({...registerForm, nickname: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  placeholder="E-mail *" 
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  placeholder="Senha *" 
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  placeholder="Confirmar Senha *" 
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>

              {/* Password Criteria */}
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.length ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.length ? 'opacity-100' : 'opacity-20'}`} />
                  Mín. 8 caracteres
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.uppercase ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.uppercase ? 'opacity-100' : 'opacity-20'}`} />
                  Letra maiúscula
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.lowercase ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.lowercase ? 'opacity-100' : 'opacity-20'}`} />
                  Letra minúscula
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.number ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.number ? 'opacity-100' : 'opacity-20'}`} />
                  Número
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.special ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.special ? 'opacity-100' : 'opacity-20'}`} />
                  Caractere especial
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${passwordCriteria.match ? 'text-green-400' : 'text-zinc-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${passwordCriteria.match ? 'opacity-100' : 'opacity-20'}`} />
                  Senhas coincidem
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isRegistering}
                className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all uppercase tracking-tighter flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRegistering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                {isRegistering ? 'Criando Conta...' : 'Criar Conta'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500 font-bold">Ou continue com</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-tighter flex items-center justify-center gap-2"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                Entrar com Google
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black relative">
      {/* Background Watermark (Text) */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <h2 className="text-[10vw] font-black text-white/5 uppercase tracking-tighter text-center leading-none select-none">
          Clube Atlético Mineiro
        </h2>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 text-white">
                CONSELHO DA <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">MASSA</span>
              </h1>
              <p className="text-zinc-400 text-sm font-medium">Portal de Sugestões da Massa Atleticana</p>
            </div>
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-zinc-800">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black">
                {currentUser.nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-white leading-none">{currentUser.fullName}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">@{currentUser.nickname}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-2 p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-yellow-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar ideias..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 w-full md:w-64 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-sm"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Mobile User Info */}
        <div className="lg:hidden mb-8 flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black">
              {currentUser.nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">{currentUser.fullName}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">@{currentUser.nickname}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Input Section */}
        <section className="mb-16">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Sugerir Nova Ideia
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Título da Sugestão</label>
                  <input 
                    type="text" 
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                    placeholder="Ex: Melhoria no acesso à Arena"
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-yellow-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Categoria</label>
                  <select 
                    value={newIdeaCategory}
                    onChange={(e) => setNewIdeaCategory(e.target.value as Category)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer"
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Descrição Detalhada</label>
                <textarea 
                  value={newIdeaDesc}
                  onChange={(e) => setNewIdeaDesc(e.target.value)}
                  placeholder="Descreva sua ideia para o conselho de futebol..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-yellow-400 transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-tighter"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando Insights...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Enviar para o Conselho
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Processing/Success States */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Ideia enviada com sucesso! Ela já está disponível para votação.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Ideias em Destaque
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                <span className="text-[10px] font-black uppercase text-zinc-500">Filtrar:</span>
                <select 
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value as Category | 'Todas')}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="Todas" className="bg-zinc-900">Todas as Categorias</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setShowOnlyMyIdeas(!showOnlyMyIdeas)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                  showOnlyMyIdeas 
                    ? 'bg-yellow-400 border-yellow-400 text-black' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <UserIcon className="w-3 h-3" />
                Minhas Sugestões
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {sortedIdeas
              .filter(idea => {
                const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    idea.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = activeCategory === 'Todas' || idea.category === activeCategory;
                const matchesUser = !showOnlyMyIdeas || idea.authorUid === currentUser?.uid;
                return matchesSearch && matchesCategory && matchesUser;
              })
              .map((idea, index) => (
              <motion.div 
                layout
                key={idea.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-zinc-900/30 border border-zinc-800 hover:border-yellow-400/50 transition-all rounded-2xl p-6 group"
              >
                <div className="flex gap-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <button 
                        onClick={() => handleLike(idea.id)}
                        className={`p-3 rounded-xl transition-all group/vote ${
                          userVotes[idea.id] === 'like' 
                            ? 'bg-green-500 text-black' 
                            : 'bg-zinc-800 hover:bg-green-500 hover:text-black text-zinc-400'
                        }`}
                        title="Gostei"
                      >
                        <ThumbsUp className="w-5 h-5" />
                      </button>
                      <span className={`text-sm font-black ${userVotes[idea.id] === 'like' ? 'text-green-500' : 'text-zinc-500'}`}>
                        {idea.likes}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button 
                        onClick={() => handleDislike(idea.id)}
                        className={`p-3 rounded-xl transition-all group/vote ${
                          userVotes[idea.id] === 'dislike' 
                            ? 'bg-red-500 text-black' 
                            : 'bg-zinc-800 hover:bg-red-500 hover:text-black text-zinc-400'
                        }`}
                        title="Não gostei"
                      >
                        <ThumbsDown className="w-5 h-5" />
                      </button>
                      <span className={`text-sm font-black ${userVotes[idea.id] === 'dislike' ? 'text-red-500' : 'text-zinc-500'}`}>
                        {idea.dislikes}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          {idea.category}
                        </span>
                        {idea.authorUid === currentUser?.uid && (
                          <button 
                            onClick={() => startEditing(idea)}
                            className="text-[10px] font-black uppercase tracking-widest text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            Editar
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600 font-medium">{idea.date}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{idea.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">{idea.description}</p>
                    
                    <div className="flex items-center gap-6 text-zinc-500">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Users className="w-4 h-4" />
                        {idea.authorNickname}
                      </div>
                      <button 
                        onClick={() => toggleComments(idea.id)}
                        className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                          expandedIdeas.has(idea.id) ? 'text-yellow-400' : 'hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {idea.comments?.length || 0} Comentários
                      </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {expandedIdeas.has(idea.id) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-8 pt-8 border-t border-zinc-800 overflow-hidden"
                        >
                          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Comentários</h4>
                          
                          <div className="space-y-6 mb-8">
                            {(idea.comments?.length || 0) > 0 ? (
                              idea.comments?.map(comment => (
                                <div key={comment.id} className="flex gap-4">
                                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-black text-zinc-400 shrink-0">
                                    {comment.author?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-black text-white">@{comment.author || 'anonimo'}</span>
                                      <span className="text-[10px] text-zinc-600">{comment.date}</span>
                                    </div>
                                    <p className="text-sm text-zinc-400">{comment.text}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-zinc-600 italic">Nenhum comentário ainda. Seja o primeiro a opinar!</p>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              placeholder="Escreva um comentário..." 
                              value={commentInputs[idea.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [idea.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(idea.id)}
                              className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-400 transition-all"
                            />
                            <button 
                              onClick={() => handleAddComment(idea.id)}
                              className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-yellow-300 transition-all"
                            >
                              Postar
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingIdea && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingIdea(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Editar Sugestão</h2>
                <button 
                  onClick={() => setEditingIdea(null)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditIdea} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Título da Ideia</label>
                    <input 
                      type="text" 
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-yellow-400 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select 
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value as Category})}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer"
                      required
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Descrição</label>
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-yellow-400 transition-all"
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingIdea(null)}
                    className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-xl hover:bg-zinc-700 transition-all uppercase tracking-tighter"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isEditing}
                    className="flex-2 bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-tighter"
                  >
                    {isEditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit className="w-5 h-5" />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 mt-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-2xl font-black text-white">13k+</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sugestões</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">450k+</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Interações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">100%</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Galo</p>
            </div>
          </div>
          <p className="text-zinc-600 text-xs font-medium">© 2024 Conselho de Futebol - Clube Atlético Mineiro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
