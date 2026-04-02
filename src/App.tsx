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
  AtSign
} from 'lucide-react';

interface User {
  fullName: string;
  nickname: string;
  email: string;
  login: string;
  password?: string;
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
  author: string;
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
    author: 'Atleticano_BH',
    likes: 2450,
    dislikes: 120,
    category: 'Infraestrutura',
    date: '2024-03-25',
    comments: [
      { id: 'c1', author: 'GaloDoido', text: 'Excelente ideia! A Arena precisa ser um caldeirão.', date: '2024-03-26' }
    ]
  },
  {
    id: '2',
    title: 'Galo na Veia: Categoria Popular',
    description: 'Criação de um plano de sócio-torcedor com valor reduzido para torcedores de baixa renda, com acesso garantido a setores específicos da Arena.',
    author: 'MassaForte',
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
    author: 'Conselheiro_Galo',
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
    author: 'HistóriaAlvinegra',
    likes: 850,
    dislikes: 15,
    category: 'Marketing',
    date: '2024-03-29',
    comments: []
  }
];

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>(MOCK_IDEAS);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState<Category>('Futebol');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todas'>('Todas');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // Voting & Comments State
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike' | null>>({});
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Form States
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    nickname: '',
    email: '',
    login: '',
    password: ''
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('galo_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('galo_users') || '[]');
    const user = users.find((u: any) => u.login === loginForm.login && u.password === loginForm.password);
    
    if (user) {
      const { password, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('galo_user', JSON.stringify(userWithoutPassword));
      setAuthError('');
    } else {
      setAuthError('Login ou senha incorretos.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.fullName || !registerForm.nickname || !registerForm.login || !registerForm.password) {
      setAuthError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('galo_users') || '[]');
    if (users.some((u: any) => u.login === registerForm.login)) {
      setAuthError('Este login já está em uso.');
      return;
    }

    const newUser = { ...registerForm };
    users.push(newUser);
    localStorage.setItem('galo_users', JSON.stringify(users));
    
    const { password, ...userWithoutPassword } = newUser;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem('galo_user', JSON.stringify(userWithoutPassword));
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('galo_user');
  };

  // Sort ideas by net score (likes - dislikes)
  const sortedIdeas = [...ideas].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));

  const handleLike = (id: string) => {
    const currentVote = userVotes[id];
    
    setIdeas(prev => prev.map(idea => {
      if (idea.id === id) {
        let newLikes = idea.likes;
        let newDislikes = idea.dislikes;
        
        if (currentVote === 'like') {
          // Toggle off
          newLikes -= 1;
          setUserVotes(v => ({ ...v, [id]: null }));
        } else if (currentVote === 'dislike') {
          // Switch from dislike to like
          newDislikes -= 1;
          newLikes += 1;
          setUserVotes(v => ({ ...v, [id]: 'like' }));
        } else {
          // New like
          newLikes += 1;
          setUserVotes(v => ({ ...v, [id]: 'like' }));
        }
        
        return { ...idea, likes: newLikes, dislikes: newDislikes };
      }
      return idea;
    }));
  };

  const handleDislike = (id: string) => {
    const currentVote = userVotes[id];
    
    setIdeas(prev => prev.map(idea => {
      if (idea.id === id) {
        let newLikes = idea.likes;
        let newDislikes = idea.dislikes;
        
        if (currentVote === 'dislike') {
          // Toggle off
          newDislikes -= 1;
          setUserVotes(v => ({ ...v, [id]: null }));
        } else if (currentVote === 'like') {
          // Switch from like to dislike
          newLikes -= 1;
          newDislikes += 1;
          setUserVotes(v => ({ ...v, [id]: 'dislike' }));
        } else {
          // New dislike
          newDislikes += 1;
          setUserVotes(v => ({ ...v, [id]: 'dislike' }));
        }
        
        return { ...idea, likes: newLikes, dislikes: newDislikes };
      }
      return idea;
    }));
  };

  const toggleComments = (id: string) => {
    setExpandedIdeas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddComment = (ideaId: string) => {
    const text = commentInputs[ideaId];
    if (!text || !currentUser) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      author: currentUser.nickname,
      text: text,
      date: new Date().toISOString().split('T')[0]
    };

    setIdeas(prev => prev.map(idea => 
      idea.id === ideaId ? { ...idea, comments: [...idea.comments, newComment] } : idea
    ));
    
    setCommentInputs(prev => ({ ...prev, [ideaId]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle || !newIdeaDesc || !currentUser) return;

    setIsProcessing(true);
    
    // Simulate AI processing/validation
    setTimeout(() => {
      const newIdea: Idea = {
        id: Date.now().toString(),
        title: newIdeaTitle,
        description: newIdeaDesc,
        author: currentUser.nickname,
        likes: 1,
        dislikes: 0,
        category: newIdeaCategory,
        date: new Date().toISOString().split('T')[0],
        comments: []
      };
      
      setIdeas(prev => [newIdea, ...prev]);
      setIsProcessing(false);
      setShowSuccess(true);
      setNewIdeaTitle('');
      setNewIdeaDesc('');
      setNewIdeaCategory('Futebol');
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 3000);
  };

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
                  type="text" 
                  placeholder="Login" 
                  value={loginForm.login}
                  onChange={(e) => setLoginForm({...loginForm, login: e.target.value})}
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
                  placeholder="E-mail" 
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-yellow-400 transition-all"
                />
              </div>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Login *" 
                  value={registerForm.login}
                  onChange={(e) => setRegisterForm({...registerForm, login: e.target.value})}
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
              <button type="submit" className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all uppercase tracking-tighter flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Criar Conta
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
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveCategory('Todas')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                  activeCategory === 'Todas' 
                    ? 'bg-yellow-400 border-yellow-400 text-black' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                Todas
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeCategory === cat 
                      ? 'bg-yellow-400 border-yellow-400 text-black' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {sortedIdeas
              .filter(idea => {
                const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    idea.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = activeCategory === 'Todas' || idea.category === activeCategory;
                return matchesSearch && matchesCategory;
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                        {idea.category}
                      </span>
                      <span className="text-xs text-zinc-600 font-medium">{idea.date}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{idea.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">{idea.description}</p>
                    
                    <div className="flex items-center gap-6 text-zinc-500">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Users className="w-4 h-4" />
                        {idea.author}
                      </div>
                      <button 
                        onClick={() => toggleComments(idea.id)}
                        className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                          expandedIdeas.has(idea.id) ? 'text-yellow-400' : 'hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {idea.comments.length} Comentários
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
                            {idea.comments.length > 0 ? (
                              idea.comments.map(comment => (
                                <div key={comment.id} className="flex gap-4">
                                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-black text-zinc-400 shrink-0">
                                    {comment.author.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-black text-white">@{comment.author}</span>
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
