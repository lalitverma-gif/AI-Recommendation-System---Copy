/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  UtensilsCrossed, 
  Search, 
  Star, 
  Sparkles, 
  Bot, 
  X, 
  Send, 
  Share2, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  UserPlus, 
  ShoppingBag, 
  ArrowLeft, 
  Flame, 
  Award, 
  Coffee, 
  Pizza, 
  Layers, 
  Heart,
  ChevronRight,
  ShieldCheck,
  Info,
  Upload,
  FolderArchive,
  PackagePlus,
  Folder
} from 'lucide-react';

interface Business {
  business_id: number;
  name: string;
  category: string;
  location: string;
  rating: number;
  description?: string;
  image?: string;
}

interface MenuItem {
  name: string;
  price: number;
  image: string;
  description?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  preferences?: string;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function App() {
  // Navigation & state
  const [currentView, setCurrentView] = useState<'home' | 'restaurants' | 'recommendations' | 'menu'>('home');
  const [selectedRestaurantName, setSelectedRestaurantName] = useState<string>('Pizza Palace');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Data
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<Business[]>([]);
  const [recommendations, setRecommendations] = useState<Business[]>([]);
  const [restaurantMenu, setRestaurantMenu] = useState<{ restaurant: Business; menu: MenuItem[] } | null>(null);
  
  // User Authentication
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    name: "Lalit Verma",
    email: "lalit@foodai.com",
    preferences: "Pizza, Cafe"
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Cart / Order feedback
  const [cartCount, setCartCount] = useState<number>(0);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Hello! I am your FoodAI Assistant. How can I help you find the best food today? 🍕' }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Share & Publish bar
  const [showShareBar, setShowShareBar] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Hosting Modal
  const [showHostingModal, setShowHostingModal] = useState<boolean>(false);
  const [hostingPlatform, setHostingPlatform] = useState<'cloudrun' | 'render' | 'railway' | 'pythonanywhere'>('cloudrun');

  // Upload Another Project Modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFolderName, setUploadFolderName] = useState<string>('imported_project_2');
  const [uploadingZip, setUploadingZip] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; count?: number; folder?: string } | null>(null);
  const [copiedUploadPrompt, setCopiedUploadPrompt] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadNewZip = async (file: File) => {
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
      alert('Please select a valid .zip file.');
      return;
    }
    setUploadingZip(true);
    setUploadResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const folder = uploadFolderName.trim() || 'imported_project_2';
      const res = await fetch(`/api/upload-zip?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: buffer,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({
          success: true,
          message: data.message,
          count: data.fileCount,
          folder: data.folder,
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.message || 'Failed to upload zip',
      });
    } finally {
      setUploadingZip(false);
    }
  };

  const sharedUrl = window.location.origin.includes('ais-dev-') 
    ? window.location.origin.replace('ais-dev-', 'ais-pre-')
    : window.location.origin;

  // Load initial data
  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages, isBotTyping]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      setBusinesses(data);
      setTopRestaurants(data.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const userId = currentUser ? currentUser.id : 1;
      const res = await fetch(`/api/recommend?user_id=${userId}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const openRestaurantMenu = async (name: string) => {
    setSelectedRestaurantName(name);
    try {
      const res = await fetch(`/api/restaurant-menu/${encodeURIComponent(name)}`);
      const data = await res.json();
      setRestaurantMenu(data);
      setCurrentView('menu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (businessId: number, rating: number) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          business_id: businessId,
          rating: rating
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Rated ${rating} ⭐! Recommendation matrix updated.`);
        fetchBusinesses();
        fetchRecommendations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setInputMessage('');
    setIsBotTyping(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_name: currentUser ? currentUser.name : "Foodie"
        })
      });
      const data = await res.json();
      setIsBotTyping(false);
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setIsBotTyping(false);
      setChatMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I had trouble processing that. Please try again!" }]);
    }
  };

  const handleOrder = (item: MenuItem) => {
    setCartCount(prev => prev + 1);
    showToast(`Added ${item.name} (₹${item.price}) to your order! 🍕`);
  };

  const showToast = (msg: string) => {
    setOrderToast(msg);
    setTimeout(() => setOrderToast(null), 3000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'login') {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setCurrentUser(data.user);
          setShowAuthModal(false);
          showToast(`Welcome back, ${data.user.name}!`);
        } else {
          setAuthError(data.message || 'Login failed');
        }
      } catch (err: any) {
        setAuthError(err.message || 'Error logging in');
      }
    } else {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, email: regEmail, password: regPassword })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setCurrentUser({ id: 99, name: regName, email: regEmail });
          setShowAuthModal(false);
          showToast(`Account created! Welcome, ${regName}!`);
        } else {
          setAuthError(data.message || 'Registration failed');
        }
      } catch (err: any) {
        setAuthError(err.message || 'Error registering');
      }
    }
  };

  const copyLiveLink = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filter businesses
  const filteredBusinesses = businesses.filter(b => {
    const matchesCategory = activeCategory === 'All' || b.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col font-sans">
      
      {/* Top Publish & Share Notification Bar */}
      {showShareBar && (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 text-[10px]">
              LIVE & DEPLOYED
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Your FoodAI application is published and running on Google Cloud!
            </span>
          </div>

          <div className="flex items-center space-x-2 mt-1 sm:mt-0">
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">
              {sharedUrl}
            </span>
            <button
              onClick={copyLiveLink}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-semibold flex items-center space-x-1 transition"
            >
              {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={sharedUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-[#ff6a00] hover:bg-[#e65f00] text-white rounded font-semibold flex items-center space-x-1 transition"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open</span>
            </a>
            <button 
              onClick={() => setShowShareBar(false)} 
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <nav className="bg-[#ff6a00] text-white px-6 py-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('home')}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="h-9 w-9 rounded-xl bg-white text-[#ff6a00] flex items-center justify-center font-black shadow-md">
              🍕
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight">FoodAI</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-1.5 py-0.5 rounded ml-2 text-white">
                ML Recs
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-6 text-sm font-bold">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-1.5 rounded-lg transition ${currentView === 'home' ? 'bg-white/25 text-white' : 'hover:bg-white/10 text-white'}`}
            >
              Home
            </button>

            <button
              onClick={() => setCurrentView('restaurants')}
              className={`px-3 py-1.5 rounded-lg transition ${currentView === 'restaurants' ? 'bg-white/25 text-white' : 'hover:bg-white/10 text-white'}`}
            >
              Restaurants
            </button>

            <button
              onClick={() => {
                fetchRecommendations();
                setCurrentView('recommendations');
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${currentView === 'recommendations' ? 'bg-white/25 text-white' : 'hover:bg-white/10 text-white'}`}
            >
              <Sparkles className="h-4 w-4 text-amber-200" />
              <span>Recommendations</span>
            </button>

            <button
              onClick={() => setShowHostingModal(true)}
              className="px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 bg-black/20 hover:bg-black/30 text-white shadow-sm"
            >
              <Globe className="h-4 w-4 text-emerald-300" />
              <span>Hosting</span>
            </button>

            <button
              onClick={() => {
                setUploadResult(null);
                setShowUploadModal(true);
              }}
              className="px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 bg-white text-[#ff6a00] hover:bg-orange-50 font-black shadow-md text-xs"
            >
              <Upload className="h-4 w-4 text-[#ff6a00]" />
              <span>Upload Project</span>
            </button>

            {/* User Session Info / Login */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-white/20">
                <span className="hidden md:inline text-xs font-semibold text-white/90">
                  {currentUser.name}
                </span>
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    showToast('Logged out successfully');
                  }}
                  className="p-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white text-xs transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="px-4 py-1.5 rounded-lg bg-white text-[#ff6a00] hover:bg-amber-50 font-bold text-xs shadow-md transition"
              >
                Login
              </button>
            )}

            {/* Shopping Bag Count */}
            {cartCount > 0 && (
              <div className="flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-full text-xs">
                <ShoppingBag className="h-3.5 w-3.5 text-white" />
                <span>{cartCount}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* VIEW 1: HOME */}
      {currentView === 'home' && (
        <div className="flex-1 space-y-12 pb-16">
          
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-[#ffe6d5] to-[#f4f6f9] py-16 px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              {currentUser && (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-sm">
                  <span>Welcome Back, {currentUser.name}! 👋</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Find the Best Restaurants Near You 🍽
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium">
                Discover amazing food with AI-powered collaborative recommendations & instant menu exploration
              </p>

              {/* Search Box */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-lg mx-auto">
                <div className="relative w-full">
                  <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search food or restaurant (e.g. Pizza, Burger, Aroma)..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00] text-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    setCurrentView('restaurants');
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-[#ff6a00] hover:bg-[#e65f00] text-white font-bold rounded-xl shadow-md transition text-sm shrink-0"
                >
                  Search
                </button>
              </div>
            </div>
          </section>

          {/* Food Categories */}
          <section className="max-w-6xl mx-auto px-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 text-center mb-6">
              Popular Food Categories
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {[
                { name: 'All', icon: '🍽' },
                { name: 'Pizza', icon: '🍕' },
                { name: 'Burger', icon: '🍔' },
                { name: 'Chinese', icon: '🍜' },
                { name: 'Cafe', icon: '☕' },
                { name: 'Desserts', icon: '🍰' }
              ].map(cat => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setActiveCategory(cat.name);
                    setCurrentView('restaurants');
                  }}
                  className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition hover:scale-105 ${
                    activeCategory === cat.name 
                      ? 'bg-[#ff6a00] text-white shadow-md' 
                      : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Top 5 Rated Restaurants Section */}
          <section className="max-w-6xl mx-auto px-6 space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#ff6a00] uppercase tracking-wider">
                <Award className="h-4 w-4" />
                <span>Indore's Favorites</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Top 5 Rated Restaurants 🏆
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRestaurants.map((r, index) => (
                <div 
                  key={r.business_id}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col group"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img 
                      src={r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500"} 
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                      <span>#{index + 1} Rated</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-white/95 text-slate-900 px-2.5 py-1 rounded-full text-xs font-black shadow-md flex items-center space-x-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{r.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-[#ff6a00] transition">
                          {r.name}
                        </h3>
                        <span className="text-xs font-bold text-[#ff6a00] bg-orange-50 px-2 py-0.5 rounded-md">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {r.description || `Delicious dishes in ${r.location}`}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-400 font-medium">
                        📍 {r.location}
                      </div>
                      <button
                        onClick={() => openRestaurantMenu(r.name)}
                        className="px-4 py-2 bg-[#ff6a00] hover:bg-[#e65f00] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1"
                      >
                        <span>View Menu</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Project Credits & Hackathon Team Banner */}
          <section className="max-w-6xl mx-auto px-6">
            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl border border-slate-800">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#ff6a00] uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Project Architecture & Credits</span>
                  </div>
                  <h3 className="text-xl font-black">FoodAI Recommendation Engine & Chatbot</h3>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Built by Lalit Verma, Ritesh, and Sourabh. Powered by Flask & Node.js architecture with User-Item Collaborative Filtering, cosine similarity matrices, and instant NLP keyword matching.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl">
                    <div className="text-[11px] text-[#ff6a00] font-bold">Lalit Verma</div>
                    <div className="text-xs text-slate-300">Backend & AI Lead</div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl">
                    <div className="text-[11px] text-cyan-400 font-bold">Ritesh</div>
                    <div className="text-xs text-slate-300">Database Lead</div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl">
                    <div className="text-[11px] text-pink-400 font-bold">Sourabh</div>
                    <div className="text-xs text-slate-300">Frontend Developer</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* VIEW 2: ALL RESTAURANTS & RATING INTERFACE */}
      {currentView === 'restaurants' && (
        <div className="max-w-6xl mx-auto px-6 py-10 flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Explore Restaurants 🍴
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Rate any restaurant from 1 to 5 stars to train the FoodAI recommendation engine for your account!
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {['All', 'Pizza', 'Burger', 'Cafe', 'Chinese', 'Desserts'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    activeCategory === cat 
                      ? 'bg-[#ff6a00] text-white shadow' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map(r => (
              <div 
                key={r.business_id}
                className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-4 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{r.name}</h3>
                      <div className="text-xs text-slate-500 font-medium">Cuisine: {r.category} • 📍 {r.location}</div>
                    </div>
                    <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{r.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    {r.description || `Great dining experience at ${r.name}.`}
                  </p>
                </div>

                {/* Rating Action (Exact replica of Lalit's interactive stars!) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Rate this restaurant:</span>
                    <button
                      onClick={() => openRestaurantMenu(r.name)}
                      className="text-xs font-bold text-[#ff6a00] hover:underline"
                    >
                      View Menu →
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-1 justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        key={starNum}
                        onClick={() => handleRate(r.business_id, starNum)}
                        className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition text-xs font-bold hover:scale-110 flex items-center"
                        title={`Rate ${starNum} Stars`}
                      >
                        {Array.from({ length: starNum }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: AI RECOMMENDATIONS (Cosine Similarity Engine) */}
      {currentView === 'recommendations' && (
        <div className="max-w-6xl mx-auto px-6 py-10 flex-1 space-y-8">
          <div className="bg-gradient-to-r from-orange-500 via-[#ff6a00] to-amber-500 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Collaborative Filtering Active</span>
              </div>
              <h1 className="text-3xl font-black">Recommended For You 🍽</h1>
              <p className="text-sm text-white/90 leading-relaxed">
                FoodAI matches your past ratings with other users using Cosine Similarity matrices to discover flavors you will love!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
              <div className="text-xs text-white/80 font-medium">Logged in as:</div>
              <div className="text-sm font-black text-white">{currentUser ? currentUser.name : "Guest User"}</div>
              <button
                onClick={fetchRecommendations}
                className="mt-2 px-3 py-1.5 bg-white text-[#ff6a00] font-bold text-xs rounded-xl shadow hover:bg-amber-50 transition"
              >
                Refresh Recs
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">
              Personalized Suggestions:
            </h2>

            {recommendations.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                <Pizza className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Custom Recs Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Rate a few restaurants on the "Restaurants" tab to train the Machine Learning engine on your taste!
                </p>
                <button
                  onClick={() => setCurrentView('restaurants')}
                  className="px-4 py-2 bg-[#ff6a00] text-white text-xs font-bold rounded-xl"
                >
                  Rate Some Places
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.map(r => (
                  <div 
                    key={r.business_id}
                    className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/90 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          AI Match
                        </span>
                        <div className="flex items-center space-x-1 text-xs font-black text-amber-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 mt-2">{r.name}</h3>
                      <p className="text-xs text-slate-500">{r.category} • 📍 {r.location}</p>
                      <p className="text-xs text-slate-600 mt-2">{r.description}</p>
                    </div>

                    <button
                      onClick={() => openRestaurantMenu(r.name)}
                      className="w-full py-2.5 bg-[#ff6a00] hover:bg-[#e65f00] text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      View Menu & Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: SPECIFIC RESTAURANT MENU (Pizza Palace, Burger Hub, Cafe Aroma, Dominos, Pizza Hut) */}
      {currentView === 'menu' && restaurantMenu && (
        <div className="max-w-5xl mx-auto px-6 py-10 flex-1 space-y-8">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#ff6a00] hover:text-[#e65f00] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Restaurants</span>
          </button>

          {/* Restaurant Header */}
          <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200/90 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 text-[#ff6a00] text-xs font-bold">
                <span>{restaurantMenu.restaurant.category}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
                {restaurantMenu.restaurant.name}
              </h1>
              <p className="text-sm text-slate-500">
                {restaurantMenu.restaurant.description || "Authentic recipes prepared fresh daily in Indore"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#ffe6d5] border border-orange-200 text-center shrink-0">
              <div className="text-xs text-[#ff6a00] font-bold">Overall Restaurant Rating</div>
              <div className="text-2xl font-black text-slate-900 flex items-center justify-center space-x-1.5 mt-0.5">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                <span>{restaurantMenu.restaurant.rating.toFixed(1)} / 5.0</span>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900">Popular Menu Items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {restaurantMenu.menu.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-xl transition"
                >
                  <div className="h-44 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-base font-black text-emerald-600">
                        ₹{item.price}
                      </span>
                      <button
                        onClick={() => handleOrder(item)}
                        className="px-4 py-2 bg-[#ff6a00] hover:bg-[#e65f00] text-white text-xs font-bold rounded-xl shadow transition"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-8 px-6 text-center mt-auto border-t border-slate-800">
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="text-sm font-semibold">
            © 2026 FoodAI | Restaurant Recommendation System
          </p>
          <p className="text-xs text-slate-400">
            Engineered by Lalit Verma (Backend & AI Lead), Ritesh (Database Lead), and Sourabh (Frontend Developer).
          </p>
        </div>
      </footer>

      {/* AI CHATBOT BUBBLE (Bottom Right Floating) */}
      <div 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#ff6a00] hover:bg-[#e65f00] text-white flex items-center justify-center text-2xl shadow-2xl cursor-pointer hover:scale-110 transition z-50 group border-2 border-white"
        title="Chat with FoodAI"
      >
        <span>🤖</span>
      </div>

      {/* AI CHATBOT WINDOW */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-[#ff6a00] text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <div>
                <h4 className="text-sm font-black">FoodAI Assistant</h4>
                <div className="text-[10px] text-white/80 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Online • NLP Engine</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-full hover:bg-black/10 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fbfbfb]">
            {chatMessages.map((msg, i) => (
              <div 
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#ff6a00] text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isBotTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl text-xs text-slate-400 flex items-center space-x-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:0.2s]">●</span>
                  <span className="animate-bounce [animation-delay:0.4s]">●</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies Chips */}
          <div className="p-2 border-t border-slate-100 bg-white flex space-x-1.5 overflow-x-auto no-scrollbar">
            {[
              "Suggest Pizza",
              "Top Rated Restaurants",
              "How does this app work?",
              "Who built you?"
            ].map(chip => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-[#ff6a00] border border-orange-200 text-[11px] font-semibold whitespace-nowrap transition shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask for recommendations, pizza..."
              className="flex-1 px-3 py-2 rounded-full border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#ff6a00]"
            />
            <button
              onClick={() => handleSendMessage()}
              className="h-8 w-8 rounded-full bg-[#ff6a00] hover:bg-[#e65f00] text-white flex items-center justify-center shrink-0 shadow transition"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* AUTH MODAL (Login & Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Lalit Verma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#ff6a00]"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  required
                  value={authMode === 'login' ? loginEmail : regEmail}
                  onChange={(e) => authMode === 'login' ? setLoginEmail(e.target.value) : setRegEmail(e.target.value)}
                  placeholder="lalit@foodai.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#ff6a00]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Password</label>
                <input
                  type="password"
                  required
                  value={authMode === 'login' ? loginPassword : regPassword}
                  onChange={(e) => authMode === 'login' ? setLoginPassword(e.target.value) : setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#ff6a00]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#ff6a00] hover:bg-[#e65f00] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500">
              {authMode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => { setAuthMode('register'); setAuthError(''); }} 
                    className="font-bold text-[#ff6a00] hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button 
                    onClick={() => { setAuthMode('login'); setAuthError(''); }} 
                    className="font-bold text-[#ff6a00] hover:underline"
                  >
                    Login
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOSTING & DEPLOYMENT MODAL */}
      {showHostingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Cloud Hosting Hub</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  How to Host & Publish FoodAI
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your project has multiple hosting options depending on whether you want instant hosting or custom servers.
                </p>
              </div>
              <button 
                onClick={() => setShowHostingModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'cloudrun', label: '1. AI Studio (Active)', sub: 'Google Cloud' },
                { id: 'render', label: '2. Render.com', sub: 'Free Flask / Node' },
                { id: 'railway', label: '3. Railway.app', sub: '1-Click GitHub' },
                { id: 'pythonanywhere', label: '4. PythonAnywhere', sub: 'Flask Hosting' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHostingPlatform(tab.id as any)}
                  className={`p-3 rounded-2xl text-left border transition ${
                    hostingPlatform === tab.id
                      ? 'border-[#ff6a00] bg-orange-50/70 text-slate-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs">{tab.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{tab.sub}</div>
                </button>
              ))}
            </div>

            {/* Active Platform Instructions */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              
              {hostingPlatform === 'cloudrun' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Current Hosting: Google Cloud Run (Already Live!)
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                      ● Active 24/7
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Good news! This application is <strong>already hosted</strong> on Google Cloud infrastructure. You do not need to buy any domain, server, or setup certificates.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-mono text-xs text-indigo-600">
                    <span className="truncate mr-2">{sharedUrl}</span>
                    <button
                      onClick={copyLiveLink}
                      className="px-3 py-1 bg-[#ff6a00] hover:bg-[#e65f00] text-white font-sans text-xs font-bold rounded-lg shrink-0 shadow transition"
                    >
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Anyone can open this link on their mobile or desktop browser to try the recommendation engine and chatbot.
                  </p>
                </div>
              )}

              {hostingPlatform === 'render' && (
                <div className="space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 text-sm">Deploying on Render.com (100% Free Tier)</h4>
                  <p>Render supports both Python Flask and Node.js web services with free automatic HTTPS.</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                    <li>Push your code or the <code className="text-[#ff6a00]">imported_project</code> folder to GitHub.</li>
                    <li>Sign up at <strong>render.com</strong> and click <strong>New → Web Service</strong>.</li>
                    <li>Connect your repository.</li>
                    <li>Set <strong>Environment</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded">Python 3</code></li>
                    <li>Set <strong>Build Command</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded">pip install -r requirements.txt</code></li>
                    <li>Set <strong>Start Command</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded">gunicorn app:app</code></li>
                    <li>Click <strong>Deploy Web Service</strong>. Your app will receive a free <code className="text-indigo-600">.onrender.com</code> URL!</li>
                  </ol>
                </div>
              )}

              {hostingPlatform === 'railway' && (
                <div className="space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 text-sm">Deploying on Railway.app</h4>
                  <p>Railway automatically recognizes the <code className="text-[#ff6a00]">Dockerfile</code> or <code className="text-[#ff6a00]">Procfile</code> we created for you.</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                    <li>Go to <strong>railway.app</strong> and log in with GitHub.</li>
                    <li>Click <strong>New Project → Deploy from GitHub repo</strong>.</li>
                    <li>Select your FoodAI repository.</li>
                    <li>Railway detects the build files and deploys automatically within 60 seconds!</li>
                  </ol>
                </div>
              )}

              {hostingPlatform === 'pythonanywhere' && (
                <div className="space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 text-sm">Deploying on PythonAnywhere (Popular for Flask + MySQL)</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                    <li>Create a free account on <strong>pythonanywhere.com</strong>.</li>
                    <li>Go to the <strong>Web</strong> tab and select <strong>Add a new web app</strong>.</li>
                    <li>Choose <strong>Flask</strong> and <strong>Python 3.10</strong>.</li>
                    <li>Upload your files into the <code className="text-slate-800">/home/yourusername/mysite</code> folder.</li>
                    <li>Set up your free MySQL database on the <strong>Databases</strong> tab and import <code className="text-[#ff6a00]">database.db</code>.</li>
                    <li>Click <strong>Reload</strong> to make your app live!</li>
                  </ol>
                </div>
              )}

            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Created pre-configured <code className="text-slate-700 font-mono">requirements.txt</code>, <code className="text-slate-700 font-mono">Procfile</code>, and <code className="text-slate-700 font-mono">Dockerfile</code>.
              </span>
              <button
                onClick={() => setShowHostingModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD ANOTHER PROJECT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 text-[#ff6a00] text-xs font-bold mb-2">
                  <PackagePlus className="h-3.5 w-3.5" />
                  <span>Multi-Project Manager</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  Upload Another Project
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a second ZIP file directly to the workspace server.
                </p>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Folder Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Destination Folder Name</label>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200">
                  /
                </span>
                <input
                  type="text"
                  value={uploadFolderName}
                  onChange={(e) => setUploadFolderName(e.target.value)}
                  placeholder="imported_project_2"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                All files from your ZIP will be extracted safely into this workspace directory.
              </p>
            </div>

            {/* Drag & Drop Upload Card */}
            <div
              onClick={() => newFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#ff6a00] bg-orange-50/30 hover:bg-orange-50/60 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
            >
              <input
                ref={newFileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadNewZip(e.target.files[0]);
                  }
                }}
              />
              <div className="h-14 w-14 mx-auto rounded-2xl bg-orange-100 text-[#ff6a00] flex items-center justify-center shadow-md">
                {uploadingZip ? (
                  <div className="animate-spin h-6 w-6 border-2 border-[#ff6a00] border-t-transparent rounded-full" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {uploadingZip ? 'Uploading & Extracting ZIP on Server...' : 'Click to Browse or Drag & Drop ZIP'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supports archives up to 100MB (React, Flask, Node, Vue, HTML/CSS).
                </p>
              </div>
            </div>

            {/* Upload Result Feedback */}
            {uploadResult && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                uploadResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                <div className="flex items-center space-x-2 text-xs font-bold">
                  {uploadResult.success ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-600" />}
                  <span>{uploadResult.message}</span>
                </div>

                {uploadResult.success && (
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-emerald-700">
                      Target: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">/{uploadResult.folder}</code> ({uploadResult.count} files)
                    </span>
                    <button
                      onClick={() => {
                        const prompt = `I uploaded another project into /${uploadResult.folder}. Please inspect the files in /${uploadResult.folder} and deploy it!`;
                        navigator.clipboard.writeText(prompt);
                        setCopiedUploadPrompt(true);
                        setTimeout(() => setCopiedUploadPrompt(false), 2500);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 shrink-0"
                    >
                      {copiedUploadPrompt ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedUploadPrompt ? 'Copied Prompt!' : 'Copy Deploy Command'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                You can choose to replace FoodAI or create a project switcher.
              </span>
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP TOAST FEEDBACK */}
      {orderToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold z-50 flex items-center space-x-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{orderToast}</span>
        </div>
      )}

    </div>
  );
}
