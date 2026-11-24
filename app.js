/**
 * SMART GROCERY & BUDGET TRACKER (MOBILE PWA)
 * Daily Test 2 (DT2) Compliance Suite • SMA Mutiara Bangsa 2
 * 
 * Features:
 * - SRS F-01: Form Input Item, Lokasi Toko (Lotte Mart Puri Indah) & Selector Tanggal
 * - SRS F-02: Penggandaan Kuantitas Otomatis Tanpa Delay (0ms Reactive Stepper & Input)
 * - SRS F-03: Penanganan Diskon Bertingkat Kompound (50%+20% -> 40.000, NOT linear 30.000!)
 * - SRS F-04: Indikator Komparasi Fluktuasi Harga Realtime (↑ Merah, ↓ Hijau, = Abu-abu)
 * - SRS F-05: Sistem Pengendali Anggaran (Safety Cap: >=90% Kuning, >100% Merah Banner)
 * - SRS F-06A: Persistensi Data Lokal (LocalStorage & F5 Anti-Reset Guard)
 * - SRS F-06B: Sinkronisasi Realtime Cloud Multi-Device (Supabase WebSocket Broadcast)
 * - Dedicated Login Screen & Real Google OAuth via Supabase (Project maximal-zoo-512303-m3)
 * - Pink & White Theme, Touch-friendly UX (min 44px), Non-blocking Toast (No window.alert)
 */

(function () {
  'use strict';

  // =========================================================================
  // DETEKSI POPUP OAUTH CALLBACK (JIKA BERJALAN DI DALAM JENDELA POPUP LOGIN)
  // Menutup popup otomatis dan mengirim data ke tab utama (window.opener)
  // =========================================================================
  if (window.opener && window.opener !== window) {
    // 1. Cek token di hash (#access_token=... atau #id_token=...)
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token'))) {
      try {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          hash: window.location.hash
        }, '*');
      } catch (e) {
        console.warn('OAuth popup bridge notice:', e);
      }
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }

    // 2. Cek fresh user yang tersimpan di localStorage dari sesi popup ini
    const freshPopupUser = localStorage.getItem('smart_grocery_popup_fresh_user');
    if (freshPopupUser) {
      try {
        localStorage.removeItem('smart_grocery_popup_fresh_user');
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          user: JSON.parse(freshPopupUser)
        }, '*');
      } catch (e) {}
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }
  }

  // =========================================================================
  // SUPABASE CONFIGURATION (OAuth & Realtime WebSocket Broadcast)
  // =========================================================================
  const SUPABASE_CONFIG = {
    URL: 'https://jnluauwepczsglnzckdw.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubHVhdXdlcGN6c2dsbnpja2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDM1MDEsImV4cCI6MjEwODExOTUwMX0.VK1Qo2I3ePs_lhtnY08rRm7WEJd1tco7HSEagoUPmF8',
    CHANNEL: 'smart_grocery_live_sync',
    GOOGLE_PROJECT: 'maximal-zoo-512303-m3'
  };

  // =========================================================================
  // MASTER CATALOG & SUPERMARKET DATABASE
  // =========================================================================
  const MASTER_CATALOG = [
    {
      id: 'dt2_item_1',
      name: 'Beras Rojolele 5kg',
      category: 'Bahan Pokok',
      unit: 'karung/5kg',
      price: 74000,
      lastMonthPrice: 68000,
      discountStr: '',
      icon: '🌾',
      desc: 'Beras pulen kemasan 5kg kualitas pilihan super'
    },
    {
      id: 'dt2_item_2',
      name: 'Minyak Goreng 2L',
      category: 'Bahan Pokok',
      unit: 'pouch/2L',
      price: 43000,
      lastMonthPrice: 45000,
      discountStr: '',
      icon: '🌻',
      desc: 'Minyak kelapa sawit murni 2 kali penyaringan'
    },
    {
      id: 'dt2_item_3',
      name: 'Telur Ayam 1kg',
      category: 'Protein Tinggi',
      unit: 'kg',
      price: 28000,
      lastMonthPrice: 32000,
      discountStr: '',
      icon: '🥚',
      desc: 'Telur ayam negeri segar pilihan peternakan higienis'
    },
    {
      id: 'dt2_item_4',
      name: 'Garam Dapur 500g',
      category: 'Bahan Pokok',
      unit: 'bungkus/500g',
      price: 5000,
      lastMonthPrice: 5000,
      discountStr: '',
      icon: '🧂',
      desc: 'Garam beryodium gurih alami untuk masakan'
    },
    {
      id: 'dt2_item_5',
      name: 'Sabun Cuci Pakaian',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 20000,
      lastMonthPrice: 20000,
      discountStr: '25%',
      icon: '🧼',
      desc: 'Deterjen pembersih noda wangi tahan lama'
    },
    {
      id: 'dt2_item_6',
      name: 'Wajan Anti Lengket 24cm',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 100000,
      lastMonthPrice: 100000,
      discountStr: '50%+20%',
      icon: '🍳',
      desc: 'Wajan teflon anti gores hemat minyak'
    },
    {
      id: 'dt2_item_7',
      name: 'Sabun Mandi Cair',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 15000,
      lastMonthPrice: 15000,
      discountStr: '',
      icon: '🫧',
      desc: 'Sabun mandi cair wangi lembut melembapkan kulit'
    }
  ];

  // Supermarket Store Profiles (Used for Realistic Thermal Receipts)
  const STORE_DETAILS = {
    'Lotte Mart - Puri Indah': {
      name: 'LOTTE MART - PURI INDAH',
      address: 'Jl. Puri Indah Raya Blok U1, Kembangan, Jakarta Barat',
      cashier: 'SELF-CHECKOUT #04',
      pos: '#01',
      code: 'LM'
    },
    'Super Indo - Puri': {
      name: 'SUPER INDO - PURI INDAH',
      address: 'Jl. Pesanggrahan No. 8, Kembangan, Jakarta Barat',
      cashier: 'KASIR 02 - SITI',
      pos: '#03',
      code: 'SI'
    },
    'Grand Lucky - Superstore': {
      name: 'GRAND LUCKY SUPERSTORE',
      address: 'Kawasan Niaga Terpadu Sudirman, Jakarta',
      cashier: 'TERMINAL #11 - ANDI',
      pos: '#07',
      code: 'GL'
    },
    'Hypermart - Lippo Mall': {
      name: 'HYPERMART - LIPPO PURI',
      address: 'Lippo Mall Puri LG-12, Jakarta Barat',
      cashier: 'KASIR 06 - RINA',
      pos: '#02',
      code: 'HM'
    }
  };

  // =========================================================================
  // APPLICATION STATE
  // =========================================================================
  const state = {
    cart: [],
    catalog: [],
    budgetLimit: 100000,
    storeLocation: 'Lotte Mart - Puri Indah',
    shoppingDate: new Date().toISOString().split('T')[0],
    isLoggedIn: false,
    currentUser: {
      name: 'Pengguna',
      email: 'user@smartgrocery.app',
      avatar: 'U',
      provider: 'guest'
    },
    historySessions: [],
    soundEnabled: true,
    deviceId: 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    supabase: null,
    realtimeChannel: null,
    isRealtimeConnected: false,
    lastModified: Date.now(),
    pendingReceiptSession: null,
    pendingCartBackup: null,
    lastOverbudgetWarned: false
  };

  // High-performance cached currency formatter (eliminates Intl GC thrashing)
  const ID_CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID');
  function formatIDR(num) {
    return ID_CURRENCY_FORMATTER.format(Math.round(num || 0));
  }

  // Audio synthesizer with customized melodic frequencies
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    // Soft acoustic bubble pop for navigation and buttons
    playTap() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    },
    // Rising two-tone melodic chime for adding item to cart
    playAddItem() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [587.33, 880].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.08, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.12);
        });
      } catch (e) {}
    },
    // Soft wooden drop tone when removing an item
    playRemoveItem() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {}
    },
    // Cute bubbly sparkle when adding item into empty cart
    playEmptyCartAdd() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.09, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.14);
        });
      } catch (e) {}
    },
    // Overbudget buzzer / warning sound (dual-tone alert)
    playOverbudgetBuzzer() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [466.16, 440].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.12, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.12);
        });
      } catch (e) {}
    },
    // Celebratory cash register chime + arpeggio for completed checkout
    playCheckoutSuccess() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const ding = this.ctx.createOscillator();
        const dingGain = this.ctx.createGain();
        ding.type = 'sine';
        ding.frequency.setValueAtTime(1760, now);
        dingGain.gain.setValueAtTime(0.18, now);
        dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        ding.connect(dingGain);
        dingGain.connect(this.ctx.destination);
        ding.start(now);
        ding.stop(now + 0.45);

        [659.25, 830.61, 987.77, 1318.51].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.06);
          gain.gain.setValueAtTime(0.11, now + 0.08 + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + idx * 0.06 + 0.32);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + 0.08 + idx * 0.06);
          osc.stop(now + 0.08 + idx * 0.06 + 0.32);
        });
      } catch (e) {}
    },
    // Easter Egg: Cute anime mascot / sweet little girl voice greeting ("H-i!~") + cheerful chime
    playEasterEgg() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;

        // Vowel formant bandpass filter (formant F2 ~2450Hz for sweet "i" vowel)
        const formantFilter = this.ctx.createBiquadFilter();
        formantFilter.type = 'bandpass';
        formantFilter.frequency.setValueAtTime(2450, now);
        formantFilter.Q.setValueAtTime(3.2, now);

        const voiceOsc = this.ctx.createOscillator();
        const voiceGain = this.ctx.createGain();
        voiceOsc.type = 'triangle'; // triangle has pleasant voice-like harmonics

        // Cute sweet upward inflection: ~780Hz rising to 1260Hz with cheerful lilt
        voiceOsc.frequency.setValueAtTime(780, now);
        voiceOsc.frequency.exponentialRampToValueAtTime(1260, now + 0.16);
        voiceOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.30);

        voiceGain.gain.setValueAtTime(0.001, now);
        voiceGain.gain.linearRampToValueAtTime(0.24, now + 0.05);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        voiceOsc.connect(formantFilter);
        formantFilter.connect(voiceGain);
        voiceGain.connect(this.ctx.destination);

        // Fundamental body warmth (pure sweet sine)
        const bodyOsc = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(780, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(1260, now + 0.16);
        bodyOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.30);

        bodyGain.gain.setValueAtTime(0.001, now);
        bodyGain.gain.linearRampToValueAtTime(0.20, now + 0.05);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.ctx.destination);

        // Sweet sparkling fairy chimes right on the greeting peak
        [1567.98, 1975.53, 2349.32].forEach((freq, idx) => {
          const chimeOsc = this.ctx.createOscillator();
          const chimeGain = this.ctx.createGain();
          chimeOsc.type = 'sine';
          chimeOsc.frequency.setValueAtTime(freq, now + 0.14 + idx * 0.06);
          chimeGain.gain.setValueAtTime(0.08, now + 0.14 + idx * 0.06);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14 + idx * 0.06 + 0.28);
          chimeOsc.connect(chimeGain);
          chimeGain.connect(this.ctx.destination);
          chimeOsc.start(now + 0.14 + idx * 0.06);
          chimeOsc.stop(now + 0.14 + idx * 0.06 + 0.28);
        });

        voiceOsc.start(now);
        voiceOsc.stop(now + 0.38);
        bodyOsc.start(now);
        bodyOsc.stop(now + 0.38);
      } catch (e) {}
    }
  };

  // =========================================================================
  // GOOGLE OAUTH 2.0 (SESUAI PANDUAN RESMI MR. TIO • MUTIARA BANGSA 2)
  // Alur: Buka tab/popup -> Pilih Akun Google -> Callback /api/auth/callback/google -> Tutup & Kembali
  // =========================================================================
  const GOOGLE_OAUTH_CONFIG = {
    CLIENT_ID: '669779177636-77k3vg6sc2es3sd7roihmn6ffqgn2uc6.apps.googleusercontent.com',
    AUTH_URI: 'https://accounts.google.com/o/oauth2/v2/auth',
    SCOPES: 'openid email profile'
  };

  function getGoogleRedirectUri() {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/api/auth/callback/google`;
    }
    return 'https://shoppingstuff.vercel.app/api/auth/callback/google';
  }

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  async function initGoogleAuth() {
    // 1. Tangkap pesan dari jendela Popup Login Google (window.opener postMessage)
    window.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        if (event.data.user) {
          handleUserAuthenticated(event.data.user, 'google');
          return;
        }
        if (event.data.hash) {
          await processOAuthHash(event.data.hash);
        }
      }
    });

    // 2. Periksa apakah URL saat ini mengandung hash token dari Google OAuth
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token'))) {
      await processOAuthHash(window.location.hash);
      return;
    }

    // 3. Hanya pulihkan session jika pengguna memang sudah logged in (Anti-Reset F5 Guard)
    if (state.isLoggedIn) {
      const savedUserStr = localStorage.getItem('smart_grocery_user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser && (savedUser.email || savedUser.name)) {
            state.currentUser = savedUser;
            updateUserProfileUI();
          }
        } catch (e) {}
      }
    }
  }

  async function processOAuthHash(hashStr) {
    try {
      const hashParams = new URLSearchParams(hashStr.substring(1));
      const accessToken = hashParams.get('access_token');
      const idToken = hashParams.get('id_token');

      // Ambil profil dari Google UserInfo endpoint
      if (accessToken) {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const profile = await res.json();
          if (profile && (profile.name || profile.email)) {
            const cleanEmail = (profile.email || '').trim().toLowerCase();
            const cleanName = profile.name || profile.given_name || (cleanEmail ? cleanEmail.split('@')[0] : 'Pengguna Google');
            handleUserAuthenticated({
              name: cleanName,
              email: cleanEmail || 'pengguna@gmail.com',
              avatar: (cleanName.charAt(0) || 'G').toUpperCase(),
              avatarUrl: profile.picture || '',
              id: profile.sub || 'usr_' + Date.now()
            }, 'google');
            return;
          }
        } catch (e) {
          console.warn('Google userinfo fetch notice:', e);
        }
      }

      // Fallback: parse JWT ID Token
      if (idToken) {
        const p = parseJwt(idToken);
        if (p) {
          const cleanEmail = (p.email || '').trim().toLowerCase();
          const cleanName = p.name || p.given_name || (cleanEmail ? cleanEmail.split('@')[0] : 'Pengguna Google');
          handleUserAuthenticated({
            name: cleanName,
            email: cleanEmail || 'pengguna@gmail.com',
            avatar: (cleanName.charAt(0) || 'G').toUpperCase(),
            avatarUrl: p.picture || '',
            id: p.sub || 'usr_' + Date.now()
          }, 'google');
        }
      }
    } catch (err) {
      console.warn('OAuth hash processing error:', err);
    }
  }

  function handleUserAuthenticated(user, provider = 'google') {
    if (!user || (!user.email && !user.name)) return;

    const email = (user.email || 'pengguna@gmail.com').trim().toLowerCase();
    const fullName = user.name || user.user_metadata?.full_name || email.split('@')[0];
    const avatar = (user.avatar || fullName.charAt(0) || 'G').toUpperCase();
    const avatarUrl = user.avatarUrl || user.picture || user.user_metadata?.avatar_url || '';

    // Disconnect prior realtime channel so different accounts don't cross-sync
    if (state.realtimeChannel && state.supabase) {
      try {
        state.supabase.removeChannel(state.realtimeChannel);
        state.realtimeChannel = null;
        state.isRealtimeConnected = false;
      } catch (e) {}
    }

    state.isLoggedIn = true;
    state.currentUser = {
      name: fullName,
      email: email,
      avatar: avatar,
      avatarUrl: avatarUrl,
      provider: provider,
      themeColor: user.themeColor || 'pink',
      id: user.id || user.sub || 'usr_' + Date.now(),
      loginAt: Date.now()
    };

    // Save known account to device account list
    recordKnownAccount(state.currentUser);

    // CRITICAL: Load this user's isolated data (cart, catalog, budget, history)
    loadStateForUser(state.currentUser);

    // Persist current state under user key
    saveStateToStorage();

    // JIKA JENDELA INI DIBUKA SEBAGAI POPUP OLEH TAB UTAMA:
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          user: state.currentUser
        }, '*');
      } catch (e) {
        console.warn('postMessage to opener notice:', e);
      }
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }

    closeGoogleOAuthModal();
    hideLoginScreen();
    renderAll();
    renderGoogleAccountsChooser();
    showToast(`🟢 Selamat datang, ${fullName}! (${email})`);

    // Bersihkan hash token di address bar setelah berhasil login
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token') || window.location.hash.includes('error'))) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Connect user-isolated Supabase Realtime channel
    initSupabaseRealtime();
  }

  // =========================================================================
  // LOGIN GOOGLE OAUTH 2.0 (SESUAI PANDUAN MR. TIO • MULTI-ACCOUNT DYNAMIC CHOOSER)
  // =========================================================================
  function showGoogleAccountsSection() {
    AudioEngine.playTap();
    const defaultSection = document.getElementById('loginDefaultAuthSection');
    const googleSection = document.getElementById('loginGoogleAccountsSection');
    if (defaultSection && googleSection) {
      defaultSection.classList.add('hidden');
      googleSection.classList.remove('hidden');
    }
    renderGoogleAccountsChooser();
  }

  function showDefaultLoginSection() {
    AudioEngine.playTap();
    const defaultSection = document.getElementById('loginDefaultAuthSection');
    const googleSection = document.getElementById('loginGoogleAccountsSection');
    if (defaultSection && googleSection) {
      googleSection.classList.add('hidden');
      defaultSection.classList.remove('hidden');
    }
  }

  function loginWithGoogleOAuth() {
    AudioEngine.playTap();
    const screen = document.getElementById('loginScreen');
    const isLoginScreenVisible = screen && !screen.classList.contains('hidden') && screen.style.display !== 'none';

    if (isLoginScreenVisible) {
      showGoogleAccountsSection();
    } else {
      openGoogleOAuthModal();
    }
  }

  // Alias untuk kompatibilitas
  function triggerDirectGoogleRedirect() {
    return loginWithGoogleOAuth();
  }

  async function triggerGcpOAuthPopup() {
    AudioEngine.playTap();
    showToast('Membuka Google Sign-In Popup...', 'info');

    try {
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      localStorage.removeItem('smart_grocery_popup_fresh_user');

      const redirectUri = getGoogleRedirectUri();
      const stateNonce = 'st_' + Math.random().toString(36).substring(2, 10);
      const authUrl = new URL(GOOGLE_OAUTH_CONFIG.AUTH_URI);
      authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CONFIG.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token id_token');
      authUrl.searchParams.set('scope', GOOGLE_OAUTH_CONFIG.SCOPES);
      authUrl.searchParams.set('prompt', 'select_account');
      authUrl.searchParams.set('nonce', stateNonce);

      const popup = window.open(
        authUrl.toString(),
        'GoogleSignInPopup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      const popupWatcher = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(popupWatcher);
          const freshUserStr = localStorage.getItem('smart_grocery_popup_fresh_user');
          if (freshUserStr) {
            try {
              const u = JSON.parse(freshUserStr);
              localStorage.removeItem('smart_grocery_popup_fresh_user');
              if (u && u.email) {
                handleUserAuthenticated(u, 'google');
              }
            } catch (e) {}
          }
        }
      }, 400);

    } catch (err) {
      console.error('Google OAuth popup error:', err);
      showToast('Gagal memuat popup Google Sign-In.', 'danger');
    }
  }

  function handlePasswordLogin() {
    const userInp = document.getElementById('inputAuthLoginUsername');
    const val = userInp ? userInp.value.trim() : '';
    const name = val.includes('@') ? val.split('@')[0] : (val || 'Pengguna');
    const email = val.includes('@') ? val : `${val.toLowerCase() || 'pengguna'}@smartgrocery.app`;

    handleUserAuthenticated({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email,
      avatar: (name.charAt(0) || 'U').toUpperCase()
    }, 'credentials');
  }

  function handlePasswordRegister() {
    const nameInp = document.getElementById('inputAuthRegName');
    const emailInp = document.getElementById('inputAuthRegEmail');
    const name = nameInp ? nameInp.value.trim() : 'Pengguna Baru';
    const email = emailInp ? emailInp.value.trim() : 'pengguna@smartgrocery.app';

    handleUserAuthenticated({
      name: name,
      email: email,
      avatar: (name.charAt(0) || 'P').toUpperCase()
    }, 'registered');
  }

  function loginAsGuest() {
    handleUserAuthenticated({
      name: 'Pengguna Tamu',
      email: 'guest@smartgrocery.app',
      avatar: 'G'
    }, 'guest');
  }

  async function logoutToLoginScreen() {
    confirmLogout();
  }

  function showLoginScreen() {
    const screen = document.getElementById('loginScreen');
    if (screen) {
      screen.classList.remove('hidden');
      screen.style.removeProperty('display');
      screen.style.display = 'flex';
      screen.style.visibility = 'visible';
      screen.style.opacity = '1';
    }
  }

  function hideLoginScreen() {
    const screen = document.getElementById('loginScreen');
    if (screen) {
      screen.classList.add('hidden');
      screen.style.display = 'none';
      screen.style.visibility = 'hidden';
      screen.style.opacity = '0';
    }
    localStorage.setItem('smart_grocery_logged_in', 'true');
  }

  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  function toggleOAuthInfoBox() {
    const box = document.getElementById('oauthConfigInfoBox');
    if (box) box.classList.toggle('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getUserStorageKey(userOrEmail) {
    let email = '';
    if (typeof userOrEmail === 'string') {
      email = userOrEmail;
    } else if (userOrEmail && userOrEmail.email) {
      email = userOrEmail.email;
    } else if (state.currentUser && state.currentUser.email) {
      email = state.currentUser.email;
    }
    if (!email) return 'guest';
    return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  function getKnownAccounts() {
    try {
      const raw = localStorage.getItem('smart_grocery_known_accounts');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {}

    // Starter Google accounts ready to pick immediately
    const defaults = [
      { name: 'David', email: 'david@gmail.com', avatar: 'D', themeColor: 'pink', lastLogin: Date.now() },
      { name: 'Akun Google 2', email: 'user2@gmail.com', avatar: 'G', themeColor: 'blue', lastLogin: Date.now() - 1000 }
    ];
    localStorage.setItem('smart_grocery_known_accounts', JSON.stringify(defaults));
    return defaults;
  }

  function recordKnownAccount(user) {
    if (!user || !user.email) return;
    const cleanEmail = user.email.trim().toLowerCase();
    const list = getKnownAccounts();
    const existingIndex = list.findIndex(acc => acc.email.toLowerCase() === cleanEmail);
    const entry = {
      name: user.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar: user.avatar || (user.name ? user.name.charAt(0) : 'G').toUpperCase(),
      themeColor: user.themeColor || 'pink',
      lastLogin: Date.now()
    };
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    }
    list.unshift(entry); // Pin newly used account to the VERY TOP
    localStorage.setItem('smart_grocery_known_accounts', JSON.stringify(list.slice(0, 6)));
  }

  function removeKnownAccount(email, event) {
    if (event) event.stopPropagation();
    let list = getKnownAccounts();
    list = list.filter(acc => acc.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem('smart_grocery_known_accounts', JSON.stringify(list));
    renderGoogleAccountsChooser();
  }

  function renderGoogleAccountsChooser() {
    const listContainers = [
      document.getElementById('googleAccountsChooserList'),
      document.getElementById('loginScreenGoogleAccountsList')
    ].filter(Boolean);
    if (listContainers.length === 0) return;

    const accounts = getKnownAccounts();
    const activeEmail = (state.isLoggedIn && state.currentUser && state.currentUser.email) ? state.currentUser.email.toLowerCase() : '';

    let html = '';

    html += `
      <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>Pilih Akun Google:</span>
        <span class="text-[10px] text-pink-600 font-semibold">${accounts.length} Akun Tersedia</span>
      </div>
    `;

    html += `<div class="space-y-2 mb-3 max-h-60 overflow-y-auto pr-0.5">`;
    accounts.forEach(acc => {
      const isActive = activeEmail && acc.email.toLowerCase() === activeEmail;
      const initial = (acc.name ? acc.name.charAt(0) : (acc.email ? acc.email.charAt(0) : 'G')).toUpperCase();
      const safeName = escapeHtml(acc.name || acc.email.split('@')[0]);
      const safeEmail = escapeHtml(acc.email);

      html += `
        <div class="google-account-card ${isActive ? 'ring-2 ring-emerald-500/60 bg-emerald-50/40' : ''}"
             onclick="app.selectGoogleAccount('${safeName}', '${safeEmail}', '${initial}', 'pink')">
          <div class="w-10 h-10 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-gradient-to-br from-pink-500 to-rose-500'} text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
            ${initial}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-sm font-bold text-ink truncate">${safeName}</span>
              ${isActive ? '<span class="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold flex items-center gap-0.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Aktif</span>' : ''}
            </div>
            <div class="text-xs text-slate-500 truncate">${safeEmail}</div>
          </div>
          <div class="flex items-center gap-1">
            ${accounts.length > 1 ? `
              <button type="button" onclick="app.removeKnownAccount('${safeEmail}', event)" title="Hapus dari daftar" class="w-7 h-7 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            ` : ''}
            <span class="material-symbols-outlined ${isActive ? 'text-emerald-600' : 'text-pink-500'} text-[20px]">
              ${isActive ? 'check_circle' : 'login'}
            </span>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    // Collapsible for Adding Another Account
    html += `
      <div class="pt-2 border-t border-slate-100">
        <button type="button" onclick="app.toggleCustomGoogleInput()"
                class="w-full py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          <span>Gunakan Akun Google Lain</span>
        </button>

        <div id="customGoogleInputBox" class="hidden mt-2.5 p-3.5 rounded-2xl bg-white border border-pink-200 shadow-sm space-y-2.5">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Email Google</label>
            <input type="email" id="customGoogleEmail" placeholder="contoh: nama@gmail.com"
                   class="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold focus:outline-none focus:border-pink-500 bg-pink-50/20">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Nama Tampilan</label>
            <input type="text" id="customGoogleName" placeholder="Contoh: Budi Santoso"
                   class="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold focus:outline-none focus:border-pink-500 bg-pink-50/20">
          </div>
          <button type="button" onclick="app.submitCustomGoogleAccount()"
                  class="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-sm shadow-pink-500/20 cursor-pointer flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Masuk dengan Akun Ini &amp; Sinkronkan</span>
          </button>
        </div>
      </div>
    `;

    listContainers.forEach(c => {
      c.innerHTML = html;
    });
  }

  function openGoogleOAuthModal() {
    renderGoogleAccountsChooser();
    const modal = document.getElementById('modalOurGoogleOAuth');
    if (modal) modal.classList.add('show');
  }

  function closeGoogleOAuthModal() {
    const modal = document.getElementById('modalOurGoogleOAuth');
    if (modal) modal.classList.remove('show');
  }

  function selectGoogleAccount(name, email, avatarSymbol, themeColor) {
    if (!email || !email.includes('@')) {
      showToast('⚠️ Masukkan email yang valid!', 'danger');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name || cleanEmail.split('@')[0];
    const initial = avatarSymbol || (cleanName.charAt(0) || 'G').toUpperCase();

    // Close Google OAuth modal immediately
    closeGoogleOAuthModal();

    handleUserAuthenticated({
      name: cleanName,
      email: cleanEmail,
      avatar: initial,
      themeColor: themeColor || 'pink',
      provider: 'google',
      id: 'usr_' + btoa(cleanEmail).replace(/=/g, '').slice(0, 16)
    }, 'google');
  }

  function toggleCustomGoogleInput() {
    const box = document.getElementById('customGoogleInputBox');
    if (box) box.classList.toggle('hidden');
  }

  function submitCustomGoogleAccount() {
    const emailInput = document.getElementById('customGoogleEmail');
    const nameInput = document.getElementById('customGoogleName');
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    let name = nameInput ? nameInput.value.trim() : '';

    if (!email || !email.includes('@')) {
      showToast('⚠️ Masukkan Email Google yang valid!', 'danger');
      return;
    }

    if (!name) {
      name = email.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    selectGoogleAccount(name, email, name.charAt(0).toUpperCase(), 'pink');
  }

  function updateUserProfileUI() {
    const hAvatar = document.getElementById('headerUserAvatar');
    const hName = document.getElementById('headerUserName');
    const dAvatar = document.getElementById('dompetUserAvatar');
    const dName = document.getElementById('dompetUserName');
    const dEmail = document.getElementById('dompetUserEmail');
    const dBadge = document.getElementById('dompetUserStatusBadge');

    if (!state.currentUser) {
      if (hAvatar) hAvatar.textContent = 'U';
      if (hName) hName.textContent = 'Masuk';
      if (dAvatar) dAvatar.textContent = 'U';
      if (dName) dName.textContent = 'Belum Masuk';
      if (dEmail) dEmail.textContent = 'Silakan masuk dengan akun Google';
      if (dBadge) {
        dBadge.textContent = 'Belum Masuk';
        dBadge.className = 'inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase';
      }
      return;
    }

    const initial = state.currentUser.avatar || (state.currentUser.name ? state.currentUser.name.charAt(0) : 'G').toUpperCase();
    const shortName = (state.currentUser.name || 'Pengguna').split(' ')[0];

    if (hAvatar) hAvatar.textContent = initial;
    if (hName) hName.textContent = shortName;
    if (dAvatar) dAvatar.textContent = initial;
    if (dName) dName.textContent = state.currentUser.name || 'Pengguna';
    if (dEmail) dEmail.textContent = state.currentUser.email || '';
    if (dBadge) {
      dBadge.textContent = '● Akun Google Aktif';
      dBadge.className = 'inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase';
    }
  }

  // =========================================================================
  // SRS F-03: MATEMATIKA DISKON BERTINGKAT KOMPOUND
  // =========================================================================
  function calculateDiscount(originalPrice, discountStr) {
    if (!originalPrice || originalPrice <= 0) {
      return { finalUnitPrice: 0, discountAmount: 0, discountPercentTotal: 0, breakdownText: 'Tanpa Diskon' };
    }
    if (!discountStr || typeof discountStr !== 'string') {
      return { finalUnitPrice: originalPrice, discountAmount: 0, discountPercentTotal: 0, breakdownText: 'Tanpa Diskon' };
    }

    const cleanStr = discountStr.trim().replace(/\s+/g, '');
    if (!cleanStr) {
      return { finalUnitPrice: originalPrice, discountAmount: 0, discountPercentTotal: 0, breakdownText: 'Tanpa Diskon' };
    }

    // 1. DISKON BERTUMPUK / KOMPOUND (Contoh: "50%+20%")
    // Tahap 1: Rp 100.000 * 0.5 = Rp 50.000
    // Tahap 2: Rp 50.000 * 0.8 = Rp 40.000 (BUKAN 30.000 / 70%!)
    if (cleanStr.includes('+')) {
      const parts = cleanStr.split('+');
      let finalPrice = originalPrice;
      const steps = [];

      parts.forEach((p) => {
        const pct = parseFloat(p.replace(/[^0-9.]/g, ''));
        if (!isNaN(pct) && pct > 0) {
          finalPrice = finalPrice * (1 - pct / 100);
          steps.push(`Diskon ke-${steps.length + 1} (${pct}%): Rp ${formatIDR(finalPrice)}`);
        }
      });

      if (steps.length === 0) {
        return { finalUnitPrice: originalPrice, discountAmount: 0, discountPercentTotal: 0, breakdownText: 'Tanpa Diskon' };
      }

      const roundedFinal = Math.max(0, Math.round(finalPrice));
      const totalHemat = originalPrice - roundedFinal;
      const effectivePct = Math.min(100, Math.round((totalHemat / originalPrice) * 100));

      return {
        finalUnitPrice: roundedFinal,
        discountAmount: totalHemat,
        discountPercentTotal: effectivePct,
        breakdownText: `${steps.join(' → ')} (Total Hemat: ${effectivePct}%)`
      };
    }

    // 2. DISKON TUNGGAL (Contoh: "25%")
    if (cleanStr.includes('%') || (!isNaN(parseFloat(cleanStr)) && parseFloat(cleanStr) <= 100 && cleanStr.length <= 3)) {
      const pct = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        const roundedFinal = Math.round(originalPrice * (1 - pct / 100));
        const totalHemat = originalPrice - roundedFinal;
        return {
          finalUnitPrice: roundedFinal,
          discountAmount: totalHemat,
          discountPercentTotal: Math.round(pct),
          breakdownText: `Diskon ${pct}% (Hemat Rp ${formatIDR(totalHemat)})`
        };
      }
    }

    // 3. POTONGAN NOMINAL LANGSUNG (Contoh: "15000")
    const numOnly = parseFloat(cleanStr.replace(/[^0-9]/g, ''));
    if (!isNaN(numOnly) && numOnly > 0) {
      const pot = Math.min(originalPrice, numOnly);
      const roundedFinal = Math.round(originalPrice - pot);
      const effectivePct = Math.round((pot / originalPrice) * 100);
      return {
        finalUnitPrice: roundedFinal,
        discountAmount: pot,
        discountPercentTotal: effectivePct,
        breakdownText: `Potongan Langsung Rp ${formatIDR(pot)} (${effectivePct}%)`
      };
    }

    return { finalUnitPrice: originalPrice, discountAmount: 0, discountPercentTotal: 0, breakdownText: 'Tanpa Diskon' };
  }

  // =========================================================================
  // SRS F-04: INDIKATOR KOMPARASI FLUKTUASI HARGA REALTIME
  // =========================================================================
  function comparePriceWithLastMonth(finalUnitPrice, lastMonthPrice) {
    const lastNum = parseFloat(lastMonthPrice);
    if (isNaN(lastNum) || lastNum <= 0) {
      return {
        type: 'new',
        badgeClass: 'price-same',
        text: '✨ Barang Baru',
        diff: 0
      };
    }

    const currentNum = parseFloat(finalUnitPrice) || 0;
    const diff = currentNum - lastNum;
    const lastFormatted = formatIDR(lastNum);

    if (diff > 0) {
      // 1. KONDISI HARGA NAIK (Merah Tegas: Beras 5kg 68k -> 74k = +Rp 6.000)
      return {
        type: 'up',
        badgeClass: 'price-up',
        text: `↑ +Rp ${formatIDR(diff)} (Naik dari Rp ${lastFormatted})`,
        diff
      };
    } else if (diff < 0) {
      // 2. KONDISI HARGA TURUN (Hijau Tegas: Telur 1kg 32k -> 28k = -Rp 4.000)
      const absDiff = Math.abs(diff);
      return {
        type: 'down',
        badgeClass: 'price-down',
        text: `↓ -Rp ${formatIDR(absDiff)} (Turun dari Rp ${lastFormatted})`,
        diff
      };
    } else {
      // 3. KONDISI HARGA STABIL (Abu-abu Setara: Garam 500g 5k -> 5k = Stabil)
      return {
        type: 'same',
        badgeClass: 'price-same',
        text: `= Harga Stabil (Rp ${lastFormatted})`,
        diff: 0
      };
    }
  }

  // =========================================================================
  // SRS F-06A: PERSISTENSI DATA LOKAL TERISOLASI PER AKUN (Anti-Leak & F5 Guard)
  // =========================================================================
  function saveStateToStorage() {
    try {
      const userKey = getUserStorageKey(state.currentUser);
      localStorage.setItem(`sg_${userKey}_cart`, JSON.stringify(state.cart));
      localStorage.setItem(`sg_${userKey}_catalog`, JSON.stringify(state.catalog));
      localStorage.setItem(`sg_${userKey}_budget`, String(state.budgetLimit));
      localStorage.setItem(`sg_${userKey}_store`, state.storeLocation);
      localStorage.setItem(`sg_${userKey}_date`, state.shoppingDate);
      localStorage.setItem(`sg_${userKey}_history`, JSON.stringify(state.historySessions));

      if (state.isLoggedIn && state.currentUser) {
        localStorage.setItem('smart_grocery_user', JSON.stringify(state.currentUser));
        localStorage.setItem('smart_grocery_logged_in', 'true');
        recordKnownAccount(state.currentUser);
      } else {
        localStorage.removeItem('smart_grocery_user');
        localStorage.setItem('smart_grocery_logged_in', 'false');
      }
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }
  }

  function loadStateForUser(user) {
    const userKey = getUserStorageKey(user);

    // 1. Cart terisolasi: Akun baru selalu mulai dari keranjang kosong
    const savedCart = localStorage.getItem(`sg_${userKey}_cart`);
    if (savedCart) {
      try { state.cart = JSON.parse(savedCart); } catch (e) { state.cart = []; }
    } else {
      // Migrasi data lama jika ada
      const legacyCart = localStorage.getItem('smart_grocery_cart');
      if (legacyCart && userKey !== 'guest') {
        try {
          state.cart = JSON.parse(legacyCart);
          localStorage.setItem(`sg_${userKey}_cart`, legacyCart);
        } catch (e) { state.cart = []; }
      } else {
        state.cart = [];
      }
    }

    // 2. Katalog terisolasi
    const savedCatalog = localStorage.getItem(`sg_${userKey}_catalog`);
    if (savedCatalog) {
      try {
        const parsedCat = JSON.parse(savedCatalog);
        if (Array.isArray(parsedCat) && parsedCat.length > 0) state.catalog = parsedCat;
      } catch (e) {
        state.catalog = JSON.parse(JSON.stringify(MASTER_CATALOG));
      }
    } else {
      state.catalog = JSON.parse(JSON.stringify(MASTER_CATALOG));
    }

    // 3. Batas Anggaran terisolasi: default Rp 100.000 untuk akun baru
    const savedBudget = localStorage.getItem(`sg_${userKey}_budget`);
    if (savedBudget && !isNaN(parseFloat(savedBudget)) && parseFloat(savedBudget) > 0) {
      state.budgetLimit = parseFloat(savedBudget);
    } else {
      state.budgetLimit = 100000;
    }

    // 4. Toko & Tanggal
    const savedStore = localStorage.getItem(`sg_${userKey}_store`);
    if (savedStore) state.storeLocation = savedStore;
    const savedDate = localStorage.getItem(`sg_${userKey}_date`);
    if (savedDate) state.shoppingDate = savedDate;

    // 5. Riwayat transaksi & struk terisolasi
    const savedHistory = localStorage.getItem(`sg_${userKey}_history`);
    if (savedHistory) {
      try { state.historySessions = JSON.parse(savedHistory); } catch (e) { state.historySessions = []; }
    } else {
      state.historySessions = [];
    }

    // Render ulang seluruh komponen UI dengan data user ini
    renderAll();
  }

  function loadStateFromStorage() {
    try {
      const savedLoggedIn = localStorage.getItem('smart_grocery_logged_in');
      state.isLoggedIn = savedLoggedIn === 'true';

      if (state.isLoggedIn) {
        const savedUserStr = localStorage.getItem('smart_grocery_user');
        if (savedUserStr) {
          try {
            state.currentUser = JSON.parse(savedUserStr);
          } catch (e) {
            state.currentUser = null;
            state.isLoggedIn = false;
          }
        } else {
          state.isLoggedIn = false;
        }
      }

      if (state.isLoggedIn && state.currentUser && state.currentUser.email) {
        loadStateForUser(state.currentUser);
      } else {
        loadStateForUser({ email: 'guest@smartgrocery.app', name: 'Pengguna Tamu' });
      }
    } catch (e) {
      console.warn('LocalStorage load notice:', e);
    }
  }

  // =========================================================================
  // SRS F-06B: SINKRONISASI REALTIME CLOUD TERISOLASI PER AKUN (Supabase WebSocket)
  // =========================================================================
  async function initSupabaseRealtime() {
    if (!window.supabase) return;
    try {
      if (!state.supabase) {
        state.supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
      }

      // Channel name terisolasi strictly berdasarkan email akun pengguna
      const userKey = getUserStorageKey(state.currentUser);
      const channelName = state.isLoggedIn && state.currentUser?.email
        ? `sync_account_${userKey}`
        : 'sync_account_guest';

      // Hentikan langganan channel sebelumnya jika berganti akun
      if (state.realtimeChannel) {
        try { state.supabase.removeChannel(state.realtimeChannel); } catch (e) {}
      }

      // Subscribe ke Broadcast Channel terisolasi
      state.realtimeChannel = state.supabase.channel(channelName, {
        config: { broadcast: { ack: false } }
      });

      state.realtimeChannel
        .on('broadcast', { event: 'MULTIDEVICE_SYNC' }, ({ payload }) => {
          if (!payload || payload.senderId === state.deviceId) return;
          handleIncomingRealtimeSync(payload);
        })
        .on('broadcast', { event: 'REQUEST_SYNC' }, ({ payload }) => {
          if (!payload || payload.senderId === state.deviceId) return;
          if (state.cart.length > 0 || state.budgetLimit !== 100000 || state.historySessions.length > 0) {
            broadcastStateChange();
          }
        })
        .subscribe((status) => {
          const badge = document.getElementById('realtimeStatusText');
          if (status === 'SUBSCRIBED') {
            state.isRealtimeConnected = true;
            if (badge) badge.textContent = 'Cloud Realtime Sync Aktif';

            try {
              state.realtimeChannel.send({
                type: 'broadcast',
                event: 'REQUEST_SYNC',
                payload: {
                  senderId: state.deviceId,
                  accountEmail: state.currentUser?.email?.toLowerCase() || ''
                }
              });
            } catch (e) {}
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            state.isRealtimeConnected = false;
            if (badge) badge.textContent = 'Cloud Sync Menghubungkan...';
          }
        });
    } catch (err) {
      console.warn('Supabase Realtime setup notice:', err);
    }
  }

  function broadcastStateChange() {
    if (!state.realtimeChannel || !state.isRealtimeConnected) return;
    try {
      state.lastModified = Date.now();
      state.realtimeChannel.send({
        type: 'broadcast',
        event: 'MULTIDEVICE_SYNC',
        payload: {
          senderId: state.deviceId,
          accountEmail: state.currentUser?.email?.toLowerCase() || '',
          cart: state.cart,
          catalog: state.catalog,
          budgetLimit: state.budgetLimit,
          storeLocation: state.storeLocation,
          historySessions: state.historySessions,
          lastModified: state.lastModified
        }
      });
    } catch (e) {
      console.warn('Realtime broadcast notice:', e);
    }
  }

  function handleIncomingRealtimeSync(payload) {
    if (!payload) return;

    // Verifikasi kepemilikan akun: data hanya disinkronkan jika email akun sama persis!
    if (payload.accountEmail && state.currentUser && state.currentUser.email) {
      if (payload.accountEmail.toLowerCase() !== state.currentUser.email.toLowerCase()) {
        return; // Jangan campurkan data akun lain
      }
    }

    // Dominant peer conflict protection:
    // Jika data lokal lebih baru dan memiliki item, jangan timpa
    if (payload.lastModified && state.lastModified && payload.lastModified < state.lastModified && state.cart.length > 0) {
      return;
    }

    if (Array.isArray(payload.cart)) state.cart = payload.cart;
    if (Array.isArray(payload.catalog) && payload.catalog.length > 0) state.catalog = payload.catalog;
    if (payload.budgetLimit && !isNaN(payload.budgetLimit) && payload.budgetLimit > 0) {
      state.budgetLimit = payload.budgetLimit;
    }
    if (payload.storeLocation) state.storeLocation = payload.storeLocation;
    if (Array.isArray(payload.historySessions)) state.historySessions = payload.historySessions;
    if (payload.lastModified) state.lastModified = payload.lastModified;

    saveStateToStorage();
    renderAll();
  }

  // =========================================================================
  // SRS F-05: SISTEM PENGENDALI ANGGARAN & SAFETY CAP (Budget Warning)
  // =========================================================================
  function updateBudgetAndSafetyCap() {
    let grandTotal = 0;
    let totalDiscountSaved = 0;

    state.cart.forEach(item => {
      const disc = calculateDiscount(item.originalPrice, item.discountStr);
      grandTotal += disc.finalUnitPrice * item.qty;
      totalDiscountSaved += (item.originalPrice - disc.finalUnitPrice) * item.qty;
    });

    const remaining = state.budgetLimit - grandTotal;
    const usagePercent = state.budgetLimit > 0 ? Math.round((grandTotal / state.budgetLimit) * 100) : 0;

    // Update HUD elements
    const hudLimit = document.getElementById('hudBudgetLimit');
    const hudSpend = document.getElementById('hudTotalSpend');
    const hudRemaining = document.getElementById('hudRemaining');
    const hudProgressBar = document.getElementById('budgetProgressBar');
    const hudHealthPill = document.getElementById('budgetHealthPill');
    const hudPercentText = document.getElementById('budgetUsagePercentText');
    const hudHematText = document.getElementById('budgetHematText');
    const bannerEl = document.getElementById('budgetAlertBanner');

    if (hudLimit) hudLimit.textContent = `Rp ${formatIDR(state.budgetLimit)}`;
    if (hudSpend) hudSpend.textContent = `Rp ${formatIDR(grandTotal)}`;
    if (hudRemaining) hudRemaining.textContent = `Rp ${formatIDR(remaining)}`;
    if (hudPercentText) hudPercentText.textContent = `${usagePercent}% Terpakai`;
    if (hudHematText) hudHematText.textContent = `Total Hemat Promo: Rp ${formatIDR(totalDiscountSaved)}`;

    // Progress Bar Fill & Color
    if (hudProgressBar) {
      const clampedWidth = Math.min(100, Math.max(0, usagePercent));
      hudProgressBar.style.width = `${clampedWidth}%`;

      if (usagePercent > 100) {
        hudProgressBar.className = 'h-full bg-rose-600 rounded-full transition-all duration-300';
      } else if (usagePercent >= 90) {
        hudProgressBar.className = 'h-full bg-amber-500 rounded-full transition-all duration-300';
      } else {
        hudProgressBar.className = 'h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-300';
      }
    }

    // EXACT EVALUATION CONDITIONS FOR SRS F-05
    if (bannerEl && hudHealthPill) {
      if (grandTotal > state.budgetLimit) {
        // OVER BUDGET (> 100%)
        hudHealthPill.textContent = '🚨 OVER BUDGET';
        hudHealthPill.className = 'text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300';

        bannerEl.classList.remove('hidden');
        bannerEl.innerHTML = `
          <div class="budget-warning-banner budget-warning-red">
            <span class="material-symbols-outlined text-[24px] text-rose-600 shrink-0">report</span>
            <div class="flex-1 text-xs font-bold leading-snug">
              Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder.
            </div>
          </div>
        `;
      } else if (usagePercent >= 90) {
        // WASPADA (>= 90%)
        hudHealthPill.textContent = '⚠️ WASPADA (≥90%)';
        hudHealthPill.className = 'text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300';

        bannerEl.classList.remove('hidden');
        bannerEl.innerHTML = `
          <div class="budget-warning-banner budget-warning-yellow">
            <span class="material-symbols-outlined text-[22px] text-amber-600 shrink-0">warning</span>
            <div class="flex-1 text-xs font-bold leading-snug">
              Peringatan Waspada: Belanjaan Anda telah mencapai ${usagePercent}% dari batas saldo dompet!
            </div>
          </div>
        `;
      } else {
        // AMAN (< 90%)
        hudHealthPill.textContent = '● AMAN';
        hudHealthPill.className = 'text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
        bannerEl.classList.add('hidden');
        bannerEl.innerHTML = '';
      }
    }
  }

  // =========================================================================
  // KERANJANG BELANJA (CART RENDERING & REACTIVE STEPPER)
  // =========================================================================
  function renderCart() {
    const container = document.getElementById('cartItemsList');
    const badge = document.getElementById('navCartBadge');
    if (badge) badge.textContent = String(state.cart.length);

    if (!container) return;

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 px-4 bg-white rounded-3xl border border-pink-100 shadow-sm">
          <div class="w-48 h-auto mx-auto mb-2 flex items-center justify-center">
            <img src="empty_cart_owl.svg" alt="Pink Owl Santai Samping Keranjang" class="w-full h-auto object-contain">
          </div>
          <h3 class="font-display text-sm font-bold text-ink">Keranjang Belanja Masih Kosong</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Burung santai menunggu belanjaanmu! Yuk pilih kebutuhan pokok dari katalog atau tekan tombol tambah barang.
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    state.cart.forEach(item => {
      const disc = calculateDiscount(item.originalPrice, item.discountStr);
      const lineSubtotal = disc.finalUnitPrice * item.qty;
      const fluc = comparePriceWithLastMonth(disc.finalUnitPrice, item.lastMonthPrice);

      html += `
        <div class="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm space-y-2.5 transition-all" data-id="${item.id}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-display text-sm font-bold text-ink leading-tight">${escapeHtml(item.name)}</span>
                <span class="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 font-mono text-[9px] font-bold border border-pink-200">
                  ${escapeHtml(item.category)}
                </span>
                <span class="text-[10px] text-slate-400 font-medium">(${escapeHtml(item.unit)})</span>
              </div>

              <div class="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <span class="font-mono font-bold text-ink">Rp ${formatIDR(disc.finalUnitPrice)}</span>
                ${item.originalPrice !== disc.finalUnitPrice ? `
                  <span class="line-through text-slate-400 font-mono text-[11px]">Rp ${formatIDR(item.originalPrice)}</span>
                  <span class="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold text-[9px]">${escapeHtml(item.discountStr)}</span>
                ` : ''}
              </div>
            </div>

            <button type="button" class="w-8 h-8 rounded-lg bg-pink-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0" onclick="app.promptDeleteCartItem('${item.id}')" title="Hapus dari troli" aria-label="Hapus ${escapeHtml(item.name)} dari troli">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>

          <div class="pt-0.5">
            <span class="price-indicator-badge ${fluc.badgeClass}">
              ${fluc.text}
            </span>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-pink-50">
            <div class="flex items-center gap-1.5 bg-pink-50/60 p-1 rounded-xl border border-pink-100">
              <button type="button" class="stepper-btn shrink-0" onclick="app.updateItemQty('${item.id}', ${item.qty - 1})" aria-label="Kurangi kuantitas ${escapeHtml(item.name)}">&minus;</button>
              <input type="number" inputmode="numeric" value="${item.qty}" min="1" class="w-12 text-center py-1 bg-white rounded-lg border border-pink-200 font-mono font-bold text-xs text-ink focus:outline-none" oninput="app.updateItemQty('${item.id}', parseInt(this.value) || 1)" onchange="app.updateItemQty('${item.id}', parseInt(this.value) || 1)">
              <button type="button" class="stepper-btn shrink-0" onclick="app.updateItemQty('${item.id}', ${item.qty + 1})" aria-label="Tambah kuantitas ${escapeHtml(item.name)}">&plus;</button>
            </div>

            <div class="text-right">
              <span class="block text-[10px] text-slate-400 font-bold uppercase">Subtotal</span>
              <strong class="font-mono text-sm font-extrabold text-pink-600">Rp ${formatIDR(lineSubtotal)}</strong>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // KATALOG PRODUK DENGAN FITUR EDIT HARGA & FLUKTUASI (TAB 2)
  // =========================================================================
  function renderCatalog() {
    const container = document.getElementById('masterCatalogList');
    if (!container) return;

    if (!Array.isArray(state.catalog) || state.catalog.length === 0) {
      state.catalog = JSON.parse(JSON.stringify(MASTER_CATALOG));
    }

    let html = '';
    state.catalog.forEach(item => {
      const disc = calculateDiscount(item.price, item.discountStr);
      const fluc = comparePriceWithLastMonth(disc.finalUnitPrice, item.lastMonthPrice);

      html += `
        <div class="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-pink-300">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="text-2xl p-2 rounded-xl bg-pink-50 shrink-0">${item.icon || '🛍️'}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-display text-xs sm:text-sm font-bold text-ink truncate">${escapeHtml(item.name)}</span>
                <span class="px-1.5 py-0.2 rounded bg-pink-50 text-pink-700 font-mono text-[9px] font-bold border border-pink-200">${escapeHtml(item.unit || 'pcs')}</span>
              </div>
              <div class="text-[10px] text-pink-600 font-semibold line-clamp-1">${escapeHtml(item.desc || 'Kebutuhan belanja pokok')}</div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="font-mono text-xs font-bold text-ink">Rp ${formatIDR(disc.finalUnitPrice)}</span>
                ${item.discountStr ? `<span class="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">${escapeHtml(item.discountStr)}</span>` : ''}
                <span class="price-indicator-badge ${fluc.badgeClass} text-[9px] py-0.5 px-1.5">${fluc.text}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Tombol Edit Harga Produk -->
            <button type="button" class="w-8 h-8 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 flex items-center justify-center cursor-pointer transition-colors" onclick="app.openEditCatalogModal('${item.id}')" title="Edit Harga Barang" aria-label="Edit Harga ${escapeHtml(item.name)}">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <!-- Tombol Hapus dari Katalog -->
            <button type="button" class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors" onclick="app.promptDeleteCatalogItem('${item.id}')" title="Hapus dari Katalog" aria-label="Hapus ${escapeHtml(item.name)} dari Katalog">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
            <!-- Tombol Tambah ke Troli -->
            <button type="button" class="stepper-btn bg-pink-500 hover:bg-pink-600 text-white border-pink-500 shadow-sm" onclick="app.addCatalogItemToCart('${item.id}')" title="Tambah ke Troli" aria-label="Tambah ${escapeHtml(item.name)} ke Troli">
              &plus;
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // RIWAYAT & STRUK RENDERING (TAB 3)
  // =========================================================================
  function renderHistory() {
    const container = document.getElementById('historySessionsList');
    if (!container) return;

    if (!Array.isArray(state.historySessions) || state.historySessions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 px-4 bg-white rounded-3xl border border-pink-100 shadow-sm">
          <span class="material-symbols-outlined text-[32px] text-pink-300 mb-1">receipt</span>
          <p class="text-xs text-slate-500 font-semibold">Belum ada struk belanja yang diarsipkan.</p>
          <p class="text-[11px] text-slate-400 mt-1">Selesaikan pembelanjaan di troli untuk membuat struk resmi.</p>
        </div>
      `;
      return;
    }

    let html = '';
    state.historySessions.forEach((s) => {
      html += `
        <div class="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm space-y-2.5 transition-all hover:border-pink-200">
          <div class="flex items-center justify-between pb-2 border-b border-pink-50">
            <div>
              <span class="font-mono text-xs font-bold text-ink">${escapeHtml(s.date)}</span>
              <span class="block text-[10px] text-slate-500 font-semibold">${escapeHtml(s.store || state.storeLocation)}</span>
            </div>
            <strong class="font-mono text-sm font-black text-pink-600">Rp ${formatIDR(s.totalCost)}</strong>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span class="font-medium">${s.items ? s.items.length : 0} Barang Belanja &bull; Hemat: Rp ${formatIDR(s.totalSaved || 0)}</span>
            <button type="button" class="py-1 px-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs flex items-center gap-1 border border-pink-200 cursor-pointer transition-colors" onclick="app.viewArchivedReceipt('${s.id}')">
              <span class="material-symbols-outlined text-[15px]">receipt</span>
              <span>Lihat Struk</span>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // ACTIONS & HANDLERS (F-01 s/d F-06)
  // =========================================================================
  function getCategoryIcon(category) {
    switch (category) {
      case 'Bahan Pokok': return '🌾';
      case 'Protein Tinggi': return '🥚';
      case 'Kebutuhan Rumah': return '🧼';
      case 'Minuman': return '🧃';
      default: return '🛍️';
    }
  }

  function submitItemForm() {
    const idInput = document.getElementById('inputItemId');
    const nameInput = document.getElementById('inputItemName');
    const catInput = document.getElementById('inputItemCategory');
    const unitInput = document.getElementById('inputItemUnit');
    const priceInput = document.getElementById('inputItemPrice');
    const qtyInput = document.getElementById('inputItemQty');
    const discInput = document.getElementById('inputItemDiscount');
    const lastPriceInput = document.getElementById('inputItemLastMonthPrice');

    const name = nameInput ? nameInput.value.trim() : '';
    const category = catInput ? catInput.value : 'Bahan Pokok';
    const unit = unitInput ? unitInput.value : 'pcs';
    const price = parseFloat(priceInput ? priceInput.value : 0);
    const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    const discountStr = discInput ? discInput.value.trim() : '';
    const lastMonthPrice = parseFloat(lastPriceInput ? lastPriceInput.value : 0) || 0;

    // VALIDASI FORM AKTIF (SRS F-01 KKTP):
    if (!name) {
      showToast('⚠️ Nama barang wajib diisi!', 'danger');
      if (nameInput) nameInput.focus();
      return;
    }

    if (isNaN(price) || price <= 0) {
      showToast('⚠️ Harga barang tidak boleh kosong atau negatif!', 'danger');
      if (priceInput) priceInput.focus();
      return;
    }

    if (qty <= 0) {
      showToast('⚠️ Kuantitas barang minimal 1!', 'danger');
      if (qtyInput) qtyInput.focus();
      return;
    }

    const newItem = {
      id: idInput && idInput.value ? idInput.value : 'item_' + Date.now(),
      name,
      category,
      unit,
      originalPrice: price,
      qty,
      discountStr,
      lastMonthPrice: lastMonthPrice || price,
      updatedAt: new Date().toISOString()
    };

    const wasCartEmpty = state.cart.length === 0;

    // 1. TAMBAH/UPDATE KE KERANJANG
    const existingIdx = state.cart.findIndex(i => i.id === newItem.id);
    if (existingIdx !== -1) {
      state.cart[existingIdx] = newItem;
      showToast(`✏️ "${name}" berhasil diperbarui!`);
    } else {
      state.cart.unshift(newItem);
      showToast(`🛒 "${name}" berhasil ditambahkan ke keranjang!`);
    }

    // 2. TAMBAH KE KATALOG DI POSISI PALING ATAS
    const catIdx = state.catalog.findIndex(c => c.name.toLowerCase() === name.toLowerCase() || c.id === newItem.id);
    if (catIdx !== -1) {
      state.catalog[catIdx].price = price;
      state.catalog[catIdx].lastMonthPrice = lastMonthPrice || state.catalog[catIdx].price;
      state.catalog[catIdx].discountStr = discountStr;
    } else {
      const newCatItem = {
        id: 'cat_' + Date.now(),
        name,
        category,
        unit,
        price,
        lastMonthPrice: lastMonthPrice || price,
        discountStr,
        icon: getCategoryIcon(category),
        desc: 'Produk kebutuhan belanja baru',
        priceHistory: [{ date: new Date().toISOString(), price }]
      };
      state.catalog.unshift(newCatItem); // Terlihat di bagian paling atas katalog!
    }

    if (wasCartEmpty) AudioEngine.playEmptyCartAdd();
    else AudioEngine.playAddItem();

    if (isCartOverbudget()) {
      setTimeout(() => AudioEngine.playOverbudgetBuzzer(), 130);
    }

    closeItemModal();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  function isCartOverbudget() {
    let grandTotal = 0;
    state.cart.forEach(item => {
      const disc = calculateDiscount(item.originalPrice, item.discountStr);
      grandTotal += disc.finalUnitPrice * item.qty;
    });
    return grandTotal > state.budgetLimit;
  }

  function updateItemQty(itemId, newQty) {
    const item = state.cart.find(i => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      promptDeleteCartItem(itemId);
      return;
    }

    const isIncreasing = newQty > item.qty;
    item.qty = newQty;
    AudioEngine.playTap();
    if (isIncreasing && isCartOverbudget()) {
      setTimeout(() => AudioEngine.playOverbudgetBuzzer(), 100);
    }

    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  // Pending target for delete confirmation modal: { type: 'cart'|'catalog', id: string, name: string }
  let pendingDeleteTarget = null;

  function promptDeleteCartItem(itemId) {
    const item = state.cart.find(i => i.id === itemId);
    if (!item) return;

    pendingDeleteTarget = { type: 'cart', id: itemId, name: item.name };
    const modal = document.getElementById('modalConfirmDeleteItem');
    const titleEl = document.getElementById('deleteItemModalTitle');
    const descEl = document.getElementById('deleteItemModalDesc');
    const confirmBtn = document.getElementById('btnExecuteConfirmDelete');

    if (titleEl) titleEl.textContent = 'Hapus dari Troli?';
    if (descEl) descEl.textContent = `Yakin ingin menghapus "${item.name}" dari keranjang belanja?`;
    if (confirmBtn) {
      confirmBtn.onclick = () => executeDeleteItem();
    }

    AudioEngine.playTap();
    if (modal) modal.classList.add('show');
  }

  function promptDeleteCatalogItem(catalogId) {
    const item = state.catalog.find(c => c.id === catalogId);
    if (!item) return;

    pendingDeleteTarget = { type: 'catalog', id: catalogId, name: item.name };
    const modal = document.getElementById('modalConfirmDeleteItem');
    const titleEl = document.getElementById('deleteItemModalTitle');
    const descEl = document.getElementById('deleteItemModalDesc');
    const confirmBtn = document.getElementById('btnExecuteConfirmDelete');

    if (titleEl) titleEl.textContent = 'Hapus dari Katalog?';
    if (descEl) descEl.textContent = `Yakin ingin menghapus "${item.name}" dari daftar katalog?`;
    if (confirmBtn) {
      confirmBtn.onclick = () => executeDeleteItem();
    }

    AudioEngine.playTap();
    if (modal) modal.classList.add('show');
  }

  function closeDeleteItemModal() {
    pendingDeleteTarget = null;
    const modal = document.getElementById('modalConfirmDeleteItem');
    if (modal) modal.classList.remove('show');
  }

  function executeDeleteItem() {
    if (!pendingDeleteTarget) return;
    const target = { ...pendingDeleteTarget };
    closeDeleteItemModal();

    if (target.type === 'cart') {
      deleteCartItem(target.id);
    } else if (target.type === 'catalog') {
      deleteCatalogItem(target.id);
    }
  }

  function deleteCartItem(itemId) {
    const idx = state.cart.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      const removedName = state.cart[idx].name;
      state.cart.splice(idx, 1);
      AudioEngine.playRemoveItem();
      saveStateToStorage();
      broadcastStateChange();
      renderAll();
      showToast(`🗑️ "${removedName}" dihapus dari keranjang.`);
    }
  }

  function addCatalogItemToCart(catalogId) {
    const catItem = state.catalog.find(i => i.id === catalogId);
    if (!catItem) return;

    const wasCartEmpty = state.cart.length === 0;
    const existing = state.cart.find(i => i.name.toLowerCase() === catItem.name.toLowerCase());
    if (existing) {
      existing.qty += 1;
      showToast(`🛒 Kuantitas ${catItem.name} bertambah jadi ${existing.qty}!`);
    } else {
      state.cart.unshift({
        id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: catItem.name,
        category: catItem.category,
        unit: catItem.unit,
        originalPrice: catItem.price,
        qty: 1,
        discountStr: catItem.discountStr,
        lastMonthPrice: catItem.lastMonthPrice,
        updatedAt: new Date().toISOString()
      });
      showToast(`🛒 ${catItem.name} masuk ke troli!`);
    }

    if (wasCartEmpty) AudioEngine.playEmptyCartAdd();
    else AudioEngine.playAddItem();

    if (isCartOverbudget()) {
      setTimeout(() => AudioEngine.playOverbudgetBuzzer(), 130);
    }

    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  function deleteCatalogItem(catalogId) {
    const idx = state.catalog.findIndex(c => c.id === catalogId);
    if (idx !== -1) {
      const name = state.catalog[idx].name;
      state.catalog.splice(idx, 1);
      AudioEngine.playRemoveItem();
      saveStateToStorage();
      broadcastStateChange();
      renderCatalog();
      showToast(`🗑️ "${name}" dihapus dari katalog.`);
    }
  }

  function openEditCatalogModal(catalogId) {
    const item = state.catalog.find(c => c.id === catalogId);
    if (!item) return;

    const modal = document.getElementById('modalEditCatalogPrice');
    const idEl = document.getElementById('editCatalogItemId');
    const nameEl = document.getElementById('editCatalogItemName');
    const priceEl = document.getElementById('editCatalogItemPrice');
    const discEl = document.getElementById('editCatalogItemDiscount');

    if (idEl) idEl.value = item.id;
    if (nameEl) nameEl.value = item.name;
    if (priceEl) priceEl.value = item.price;
    if (discEl) discEl.value = item.discountStr || '';

    AudioEngine.playTap();
    if (modal) modal.classList.add('show');
  }

  function closeEditCatalogModal() {
    const modal = document.getElementById('modalEditCatalogPrice');
    if (modal) modal.classList.remove('show');
  }

  function submitEditCatalogPrice() {
    const idEl = document.getElementById('editCatalogItemId');
    const priceEl = document.getElementById('editCatalogItemPrice');
    const discEl = document.getElementById('editCatalogItemDiscount');

    if (!idEl) return;
    const item = state.catalog.find(c => c.id === idEl.value);
    if (!item) return;

    const newPrice = parseFloat(priceEl ? priceEl.value : 0);
    const newDiscount = discEl ? discEl.value.trim() : '';

    if (isNaN(newPrice) || newPrice < 0) {
      showToast('⚠️ Masukkan harga yang valid!', 'danger');
      return;
    }

    // Previous price is automatically preserved as the last month price!
    const oldPrice = item.price;
    item.lastMonthPrice = oldPrice;
    item.price = newPrice;
    item.discountStr = newDiscount;
    if (!Array.isArray(item.priceHistory)) item.priceHistory = [];
    item.priceHistory.push({ date: new Date().toISOString(), price: newPrice, lastPrice: oldPrice });

    // Sinkronkan ke keranjang aktif jika barang sedang ada di troli
    state.cart.forEach(cartItem => {
      if (cartItem.name.toLowerCase() === item.name.toLowerCase()) {
        cartItem.originalPrice = newPrice;
        cartItem.lastMonthPrice = oldPrice;
        cartItem.discountStr = newDiscount;
      }
    });

    closeEditCatalogModal();
    AudioEngine.playTap();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
    showToast(`✏️ Harga "${item.name}" berhasil diubah ke Rp ${formatIDR(newPrice)}!`);
  }

  function openLogoutModal() {
    const modal = document.getElementById('modalConfirmLogout');
    AudioEngine.playTap();
    if (modal) modal.classList.add('show');
  }

  function closeLogoutModal() {
    const modal = document.getElementById('modalConfirmLogout');
    if (modal) modal.classList.remove('show');
  }

  function confirmLogout() {
    closeLogoutModal();
    AudioEngine.playTap();

    // 1. Reset memory state
    state.isLoggedIn = false;
    state.currentUser = null;
    state.cart = [];

    // 2. Clear persisted login session
    localStorage.removeItem('smart_grocery_logged_in');
    localStorage.removeItem('smart_grocery_auth_token');
    localStorage.removeItem('smart_grocery_current_user');

    // 3. Close any active modals
    closeGoogleOAuthModal();
    closeEditCatalogModal();
    closeClearCartModal();
    closeReceiptModal();
    closeDeleteItemModal();

    // 4. Reset to Cart tab
    switchTab('tabCart');

    // 5. Update user profile display to guest/empty
    updateUserProfileUI();

    // 6. Reset login screen view to default auth form
    showDefaultLoginSection();

    // 7. Instantly show login screen
    showLoginScreen();

    // 8. Re-render chooser for next login
    renderGoogleAccountsChooser();

    showToast('👋 Berhasil keluar dari akun.', 'info');
  }

  function openClearCartModal() {
    if (state.cart.length === 0) {
      AudioEngine.playTap();
      showToast('Keranjang belanja sudah kosong, tidak ada barang yang bisa dihapus.', 'info');
      return;
    }
    const modal = document.getElementById('modalConfirmClearCart');
    if (modal) modal.classList.add('show');
  }

  function confirmClearCart() {
    state.cart = [];
    closeClearCartModal();
    AudioEngine.playRemoveItem();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
    showToast('🧹 Keranjang belanja telah dikosongkan!');
  }

  function completeCheckout() {
    if (state.cart.length === 0) {
      showToast('⚠️ Keranjang belanja masih kosong, silakan tambah barang!', 'danger');
      return;
    }

    let totalCost = 0;
    let totalSaved = 0;
    let subtotalGross = 0;
    const itemsSnapshot = state.cart.map(i => {
      const disc = calculateDiscount(i.originalPrice, i.discountStr);
      const subtotal = disc.finalUnitPrice * i.qty;
      totalCost += subtotal;
      subtotalGross += i.originalPrice * i.qty;
      totalSaved += (i.originalPrice - disc.finalUnitPrice) * i.qty;
      return {
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        originalPrice: i.originalPrice,
        discountStr: i.discountStr,
        finalUnitPrice: disc.finalUnitPrice,
        subtotal
      };
    });

    // JANGAN BOLEHKAN BELI JIKA MELEBIHI ANGGARAN (SAFETY CAP ENFORCEMENT)
    if (totalCost > state.budgetLimit) {
      AudioEngine.playOverbudgetBuzzer();
      showToast('⚠️ Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sebelum checkout.', 'danger');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const storeInfo = STORE_DETAILS[state.storeLocation] || STORE_DETAILS['Lotte Mart - Puri Indah'];
    const randomTxNum = Math.floor(1000 + Math.random() * 9000);
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const txNumber = `${storeInfo.code}-${dateCode}-${randomTxNum}`;

    const newSession = {
      id: 'trx_' + Date.now(),
      date: formattedDate,
      store: state.storeLocation,
      storeInfo,
      txNumber,
      subtotalGross,
      totalCost,
      totalSaved,
      items: itemsSnapshot,
      createdAt: now.toISOString()
    };

    // Staging receipt session for cancel/edit option
    state.pendingReceiptSession = newSession;
    state.pendingCartBackup = JSON.parse(JSON.stringify(state.cart));

    openReceiptModal(newSession, false);
  }

  function openReceiptModal(session, isViewingArchived = false) {
    const modal = document.getElementById('modalReceiptBackdrop');
    if (!modal) return;

    const storeInfo = session.storeInfo || STORE_DETAILS[session.store] || STORE_DETAILS['Lotte Mart - Puri Indah'];
    const storeNameEl = document.getElementById('receiptStoreNameDisplay');
    const storeAddressEl = document.getElementById('receiptStoreAddressDisplay');
    const txNumEl = document.getElementById('receiptTxNumberDisplay');
    const timeEl = document.getElementById('receiptTimestampDisplay');
    const cashierEl = document.getElementById('receiptCashierDisplay');
    const container = document.getElementById('receiptItemsContainer');
    const subtotalEl = document.getElementById('receiptSubtotalDisplay');
    const savedEl = document.getElementById('receiptSavedDisplay');
    const limitEl = document.getElementById('receiptLimitDisplay');
    const totalEl = document.getElementById('receiptGrandTotalDisplay');
    const cancelBtn = document.getElementById('btnReceiptCancelEdit');
    const confirmText = document.getElementById('btnReceiptConfirmText');

    if (storeNameEl) storeNameEl.textContent = storeInfo.name;
    if (storeAddressEl) storeAddressEl.textContent = storeInfo.address;
    if (txNumEl) txNumEl.textContent = `BON: ${session.txNumber || 'LM-20261124-8841'}`;
    if (timeEl) timeEl.textContent = session.date;
    if (cashierEl) cashierEl.textContent = `KASIR: ${storeInfo.cashier}`;
    if (subtotalEl) subtotalEl.textContent = `Rp ${formatIDR(session.subtotalGross || session.totalCost)}`;
    if (savedEl) savedEl.textContent = `-Rp ${formatIDR(session.totalSaved || 0)}`;
    if (limitEl) limitEl.textContent = `Rp ${formatIDR(state.budgetLimit)}`;
    if (totalEl) totalEl.textContent = `Rp ${formatIDR(session.totalCost)}`;

    if (isViewingArchived) {
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (confirmText) confirmText.textContent = 'Tutup Struk';
    } else {
      if (cancelBtn) cancelBtn.style.display = 'flex';
      if (confirmText) confirmText.textContent = 'Selesai & Simpan';
    }

    if (container) {
      let html = '';
      session.items.forEach(i => {
        html += `
          <div class="py-1 border-b border-dashed border-slate-200">
            <div class="flex justify-between font-bold text-slate-800">
              <span class="truncate pr-2">${escapeHtml(i.name)}</span>
              <span>Rp ${formatIDR(i.subtotal)}</span>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>${i.qty} x Rp ${formatIDR(i.finalUnitPrice)}</span>
              ${i.discountStr ? `<span class="text-rose-600 font-bold">Disc ${escapeHtml(i.discountStr)}</span>` : ''}
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    AudioEngine.playTap();
    modal.classList.add('show');
  }

  function cancelAndEditReceipt() {
    const modal = document.getElementById('modalReceiptBackdrop');
    if (modal) modal.classList.remove('show');

    if (state.pendingCartBackup) {
      state.cart = JSON.parse(JSON.stringify(state.pendingCartBackup));
    }
    state.pendingReceiptSession = null;
    state.pendingCartBackup = null;

    switchTab('tabCart');
    renderAll();
    showToast('✏️ Pembayaran dibatalkan, silakan edit barang di troli.', 'info');
  }

  function closeReceiptModal() {
    const modal = document.getElementById('modalReceiptBackdrop');
    if (modal) modal.classList.remove('show');

    if (state.pendingReceiptSession) {
      state.historySessions.unshift(state.pendingReceiptSession);
      state.cart = [];
      state.pendingReceiptSession = null;
      state.pendingCartBackup = null;
      AudioEngine.playCheckoutSuccess();
      saveStateToStorage();
      broadcastStateChange();
      renderAll();
      showToast('🎉 Struk berhasil disimpan ke riwayat belanja!');
    } else {
      renderAll();
    }
  }

  function viewArchivedReceipt(sessionId) {
    const session = state.historySessions.find(s => s.id === sessionId);
    if (!session) return;
    openReceiptModal(session, true);
  }

  // =========================================================================
  // MODALS & INPUT MANAGEMENT
  // =========================================================================
  function openItemModal(itemId = null) {
    const modal = document.getElementById('modalItemBackdrop');
    const titleEl = document.getElementById('modalItemHeaderTitle');
    const idInput = document.getElementById('inputItemId');
    const nameInput = document.getElementById('inputItemName');
    const catInput = document.getElementById('inputItemCategory');
    const unitInput = document.getElementById('inputItemUnit');
    const priceInput = document.getElementById('inputItemPrice');
    const qtyInput = document.getElementById('inputItemQty');
    const discInput = document.getElementById('inputItemDiscount');
    const lastPriceInput = document.getElementById('inputItemLastMonthPrice');

    if (!modal) return;

    if (itemId) {
      const item = state.cart.find(i => i.id === itemId);
      if (item) {
        if (titleEl) titleEl.innerHTML = '<span class="material-symbols-outlined text-pink-500">edit</span><span>Edit Barang Belanja</span>';
        if (idInput) idInput.value = item.id;
        if (nameInput) nameInput.value = item.name;
        if (catInput) catInput.value = item.category;
        if (unitInput) unitInput.value = item.unit;
        if (priceInput) priceInput.value = item.originalPrice;
        if (qtyInput) qtyInput.value = item.qty;
        if (discInput) discInput.value = item.discountStr || '';
        if (lastPriceInput) lastPriceInput.value = item.lastMonthPrice || '';
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<span class="material-symbols-outlined text-pink-500">add_shopping_cart</span><span>Input Barang Belanjaan</span>';
      if (idInput) idInput.value = '';
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (qtyInput) qtyInput.value = '1';
      if (discInput) discInput.value = '';
      if (lastPriceInput) lastPriceInput.value = '';
    }

    updateModalLiveCalculations();
    modal.classList.add('show');
    if (nameInput) setTimeout(() => nameInput.focus(), 150);
  }

  function closeItemModal() {
    const modal = document.getElementById('modalItemBackdrop');
    if (modal) modal.classList.remove('show');
  }

  function adjustModalQty(delta) {
    const qtyInput = document.getElementById('inputItemQty');
    if (!qtyInput) return;
    const cur = parseInt(qtyInput.value) || 1;
    const updated = Math.max(1, cur + delta);
    qtyInput.value = updated;
    updateModalLiveCalculations();
  }

  function updateModalLiveCalculations() {
    const priceInput = document.getElementById('inputItemPrice');
    const qtyInput = document.getElementById('inputItemQty');
    const discInput = document.getElementById('inputItemDiscount');
    const lastPriceInput = document.getElementById('inputItemLastMonthPrice');

    const discBox = document.getElementById('previewDiscountText');
    const finalPriceBox = document.getElementById('previewFinalUnitPrice');
    const flucBox = document.getElementById('previewFluctuationText');
    const subtotalBox = document.getElementById('previewSubtotal');

    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;
    const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    const discStr = discInput ? discInput.value : '';
    const lastPrice = parseFloat(lastPriceInput ? lastPriceInput.value : 0) || 0;

    const disc = calculateDiscount(price, discStr);
    const fluc = comparePriceWithLastMonth(disc.finalUnitPrice, lastPrice);
    const subtotal = disc.finalUnitPrice * qty;

    if (discBox) discBox.textContent = disc.breakdownText;
    if (finalPriceBox) finalPriceBox.textContent = `Rp ${formatIDR(disc.finalUnitPrice)}`;
    if (flucBox) {
      flucBox.textContent = fluc.text;
      flucBox.className = `font-mono font-semibold ${fluc.badgeClass} text-[11px] py-0.5 px-1.5 rounded`;
    }
    if (subtotalBox) subtotalBox.textContent = `Rp ${formatIDR(subtotal)}`;
  }

  function closeClearCartModal() {
    const modal = document.getElementById('modalConfirmClearCart');
    if (modal) modal.classList.remove('show');
  }

  // =========================================================================
  // TOAST NOTIFICATION (Non-blocking UX Feedback)
  // =========================================================================
  let toastTimer = null;
  function showToast(message, type = 'success') {
    const toast = document.getElementById('appToast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    if (iconEl) {
      if (type === 'danger') iconEl.textContent = '⚠️';
      else if (type === 'info') iconEl.textContent = 'ℹ️';
      else iconEl.textContent = '🛒';
    }

    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // =========================================================================
  // NAVIGATION SETUP (4 Clean Tabs & Floating Cart Summary)
  // =========================================================================
  function switchTab(targetId) {
    const tabs = document.querySelectorAll('.dock-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === targetId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    panes.forEach(p => {
      if (p.id === targetId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    updateFloatingCartVisibility(targetId);
  }

  function updateFloatingCartVisibility(currentTabId) {
    const bar = document.getElementById('floatingCartSummaryBar');
    const countEl = document.getElementById('floatingCartCountText');
    const totalEl = document.getElementById('floatingCartTotalText');
    if (!bar) return;

    let totalItems = 0;
    let grandTotal = 0;
    state.cart.forEach(item => {
      totalItems += item.qty;
      const disc = calculateDiscount(item.originalPrice, item.discountStr);
      grandTotal += disc.finalUnitPrice * item.qty;
    });

    const activePane = document.querySelector('.tab-pane.active');
    const activeTab = currentTabId || (activePane ? activePane.id : 'tabCart');

    if (totalItems > 0 && activeTab !== 'tabCart' && state.isLoggedIn) {
      if (countEl) countEl.textContent = `${totalItems} Barang di Troli`;
      if (totalEl) totalEl.textContent = `Total: Rp ${formatIDR(grandTotal)}`;
      bar.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
    }
  }

  function setupNavigation() {
    const tabs = document.querySelectorAll('.dock-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        if (!targetId) return;
        AudioEngine.playTap();
        switchTab(targetId);
      });
    });
  }

  function setupEasterEgg() {
    const indicator = document.getElementById('indicator4G');
    const owl = document.getElementById('owlEasterEgg');
    if (!indicator || !owl) return;

    let clickCount = 0;
    let clickTimer = null;

    indicator.addEventListener('click', () => {
      clickCount++;
      if (clickTimer) clearTimeout(clickTimer);

      if (clickCount >= 4) {
        clickCount = 0;
        AudioEngine.playEasterEgg();
        owl.classList.remove('active');
        // Force browser reflow to restart CSS animation cleanly
        void owl.offsetWidth;
        owl.classList.add('active');
        setTimeout(() => {
          owl.classList.remove('active');
        }, 2600);
      } else {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 1200);
      }
    });
  }

  function setupClock() {
    const clockEl = document.getElementById('liveClockDisplay');
    function updateClock() {
      if (!clockEl) return;
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 30000);
  }

  function setupEventListeners() {
    // Auth Tab Switcher (Masuk vs Daftar)
    const tabLoginBtn = document.getElementById('tabAuthLoginBtn');
    const tabRegBtn = document.getElementById('tabAuthRegisterBtn');
    const formLogin = document.getElementById('formAuthLogin');
    const formReg = document.getElementById('formAuthRegister');

    if (tabLoginBtn && tabRegBtn && formLogin && formReg) {
      tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.className = 'py-2.5 rounded-xl bg-pink-500 text-white shadow-sm transition-all cursor-pointer';
        tabRegBtn.className = 'py-2.5 rounded-xl text-slate-600 hover:text-pink-600 transition-all cursor-pointer';
        formLogin.classList.remove('hidden');
        formReg.classList.add('hidden');
      });

      tabRegBtn.addEventListener('click', () => {
        tabRegBtn.className = 'py-2.5 rounded-xl bg-pink-500 text-white shadow-sm transition-all cursor-pointer';
        tabLoginBtn.className = 'py-2.5 rounded-xl text-slate-600 hover:text-pink-600 transition-all cursor-pointer';
        formReg.classList.remove('hidden');
        formLogin.classList.add('hidden');
      });
    }

    // Header store selector
    const storeSelect = document.getElementById('storeLocationSelect');
    if (storeSelect) {
      storeSelect.value = state.storeLocation;
      storeSelect.addEventListener('change', (e) => {
        state.storeLocation = e.target.value;
        saveStateToStorage();
        broadcastStateChange();
        showToast(`📍 Lokasi toko disetel ke ${state.storeLocation}`);
      });
    }

    // Header date picker
    const dateInput = document.getElementById('shoppingDateInput');
    if (dateInput) {
      dateInput.value = state.shoppingDate;
      dateInput.addEventListener('change', (e) => {
        state.shoppingDate = e.target.value;
        saveStateToStorage();
      });
    }

    // Sound toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        soundBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
        showToast(state.soundEnabled ? 'Suara efek aktif' : 'Suara efek dimatikan');
      });
    }

    // Open Add Modal
    const btnAdd = document.getElementById('btnOpenAddModal');
    if (btnAdd) btnAdd.addEventListener('click', () => openItemModal());

    // Open Clear Cart Modal
    const btnClear = document.getElementById('btnOpenClearCartModal');
    if (btnClear) btnClear.addEventListener('click', openClearCartModal);

    // Checkout trigger
    const btnCheckout = document.getElementById('btnCheckoutTrigger');
    if (btnCheckout) btnCheckout.addEventListener('click', completeCheckout);

    // Budget settings in Dompet tab
    const inputBudget = document.getElementById('inputSettingBudget');
    const btnSaveBudget = document.getElementById('btnSaveSettingBudget');
    if (btnSaveBudget && inputBudget) {
      inputBudget.value = state.budgetLimit;
      btnSaveBudget.addEventListener('click', () => {
        const val = parseFloat(inputBudget.value);
        if (!isNaN(val) && val > 0) {
          state.budgetLimit = val;
          saveStateToStorage();
          broadcastStateChange();
          renderAll();
          showToast(`💰 Batas saldo dompet disimpan: Rp ${formatIDR(val)}`);
        } else {
          showToast('⚠️ Masukkan nominal batas anggaran yang valid!', 'danger');
        }
      });
    }

    // Preset budget buttons
    document.querySelectorAll('.btn-preset-budget').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseFloat(btn.getAttribute('data-preset'));
        if (!isNaN(p)) {
          state.budgetLimit = p;
          if (inputBudget) inputBudget.value = p;
          saveStateToStorage();
          broadcastStateChange();
          renderAll();
          showToast(`💰 Batas saldo dompet disetel: Rp ${formatIDR(p)}`);
        }
      });
    });

    // Setup 4G Easter Egg (Duolingo Pink Owl Peek)
    setupEasterEgg();

    // Live calculation listener on input modal
    ['inputItemPrice', 'inputItemQty', 'inputItemDiscount', 'inputItemLastMonthPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateModalLiveCalculations);
      }
    });
  }

  function renderAll() {
    renderCart();
    renderCatalog();
    renderHistory();
    updateBudgetAndSafetyCap();
    updateUserProfileUI();
    updateFloatingCartVisibility();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(
          reg => console.log('ServiceWorker registered:', reg.scope),
          err => console.warn('ServiceWorker registration error:', err)
        );
      });
    }
  }

  // =========================================================================
  // CUTE PINK CLICK PARTICLE EFFECT (Mikro-Interaksi Partikel Bulat Pink)
  // =========================================================================
  const PARTICLE_COLORS = [
    'rgba(244, 114, 182, 0.7)',   // pink-400
    'rgba(236, 72, 153, 0.6)',    // pink-500
    'rgba(251, 182, 206, 0.75)',  // pastel soft pink
    'rgba(249, 168, 212, 0.7)'    // rose-300
  ];

  function spawnParticles(x, y) {
    if (x === undefined || y === undefined || !document.body) return;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('span');
      bubble.className = 'click-particle-bubble';
      const size = Math.floor(Math.random() * 5) + 5; // 5px to 9px
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = 14 + Math.random() * 22; // 14px to 36px
      const destX = Math.cos(angle) * distance;
      const destY = Math.sin(angle) * distance;

      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.backgroundColor = color;
      bubble.style.left = `${x - size / 2}px`;
      bubble.style.top = `${y - size / 2}px`;

      document.body.appendChild(bubble);

      if (typeof bubble.animate === 'function') {
        const anim = bubble.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 0.8 },
          { transform: `translate(${destX}px, ${destY}px) scale(0.2)`, opacity: 0 }
        ], {
          duration: 380 + Math.random() * 120, // 380ms - 500ms
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });
        anim.onfinish = () => bubble.remove();
      } else {
        setTimeout(() => bubble.remove(), 450);
      }
    }
  }

  function initClickParticleEffect() {
    window.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      spawnParticles(e.clientX, e.clientY);
    }, { passive: true });
    window.spawnParticles = spawnParticles;
  }

  // Initializing App
  async function init() {
    loadStateFromStorage();
    setupNavigation();
    setupClock();
    setupEventListeners();
    initClickParticleEffect();
    renderAll();

    // Check login state
    if (state.isLoggedIn) {
      hideLoginScreen();
    } else {
      showLoginScreen();
    }

    await initGoogleAuth();
    await initSupabaseRealtime();
    registerPWA();
  }

  // Global methods for inline HTML event handlers
  window.app = {
    openItemModal,
    closeItemModal,
    submitItemForm,
    adjustModalQty,
    updateItemQty,
    deleteCartItem,
    addCatalogItemToCart,
    openEditCatalogModal,
    closeEditCatalogModal,
    submitEditCatalogPrice,
    deleteCatalogItem,
    openClearCartModal,
    closeClearCartModal,
    confirmClearCart,
    openLogoutModal,
    closeLogoutModal,
    confirmLogout,
    promptDeleteCartItem,
    promptDeleteCatalogItem,
    closeDeleteItemModal,
    executeDeleteItem,
    isCartOverbudget,
    openReceiptModal,
    closeReceiptModal,
    cancelAndEditReceipt,
    viewArchivedReceipt,
    openGoogleOAuthModal,
    closeGoogleOAuthModal,
    selectGoogleAccount,
    toggleCustomGoogleInput,
    submitCustomGoogleAccount,
    completeCheckout,
    calculateDiscount,
    comparePriceWithLastMonth,
    loginWithGoogleOAuth,
    showGoogleAccountsSection,
    showDefaultLoginSection,
    triggerDirectGoogleRedirect,
    handlePasswordLogin,
    handlePasswordRegister,
    loginAsGuest,
    logoutToLoginScreen,
    togglePasswordVisibility,
    toggleOAuthInfoBox,
    switchTab,
    updateFloatingCartVisibility,
    renderGoogleAccountsChooser,
    removeKnownAccount,
    triggerGcpOAuthPopup,
    getUserStorageKey,
    loadStateForUser,
    getKnownAccounts,
    spawnParticles
  };

  initClickParticleEffect();

  document.addEventListener('DOMContentLoaded', init);

})();
