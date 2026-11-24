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

    // 2. Cek user yang tersimpan di localStorage dari sesi popup ini
    const savedPopupUser = localStorage.getItem('smart_grocery_user');
    if (savedPopupUser) {
      try {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          user: JSON.parse(savedPopupUser)
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
  // MASTER CATALOG LOTTE MART PURI INDAH (DT2 Ujian Skenario 1 - 7)
  // =========================================================================
  const MASTER_CATALOG = [
    {
      id: 'dt2_item_1',
      name: 'Beras Rojolele',
      category: 'Bahan Pokok',
      unit: 'karung/5kg',
      price: 74000,
      lastMonthPrice: 68000,
      discountStr: '',
      icon: '🌾',
      desc: 'Skenario 1 & 4 (Harga Naik ↑ Merah +Rp 6.000)'
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
      desc: 'Skenario 2 (Uji Qty 1 -> 3 = Rp 129.000) & Skenario 4 (Harga Turun ↓ Hijau)'
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
      desc: 'Skenario 4 (Harga Turun ↓ Hijau -Rp 4.000)'
    },
    {
      id: 'dt2_item_4',
      name: 'Garam 500g',
      category: 'Bahan Pokok',
      unit: 'bungkus/500g',
      price: 5000,
      lastMonthPrice: 5000,
      discountStr: '',
      icon: '🧂',
      desc: 'Skenario 4 (Harga Stabil = Abu-abu Rp 5.000)'
    },
    {
      id: 'dt2_item_5',
      name: 'Sabun Cuci',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 20000,
      lastMonthPrice: 20000,
      discountStr: '25%',
      icon: '🧼',
      desc: 'Skenario 3 (Diskon Tunggal 25% -> Rp 15.000)'
    },
    {
      id: 'dt2_item_6',
      name: 'Wajan Anti Lengket',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 100000,
      lastMonthPrice: 100000,
      discountStr: '50%+20%',
      icon: '🍳',
      desc: 'Skenario 3 (Diskon Kompound 50%+20% -> Rp 40.000)'
    },
    {
      id: 'dt2_item_7',
      name: 'Sabun Mandi',
      category: 'Kebutuhan Rumah',
      unit: 'pcs',
      price: 15000,
      lastMonthPrice: 15000,
      discountStr: '',
      icon: '🫧',
      desc: 'Skenario 7 (Uji Sinkronisasi Realtime HP & PC)'
    }
  ];

  // =========================================================================
  // APPLICATION STATE
  // =========================================================================
  const state = {
    cart: [],
    budgetLimit: 100000, // Default Rp 100.000 for DT2 evaluation
    storeLocation: 'Lotte Mart Grocery - Puri Indah',
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
    isRealtimeConnected: false
  };

  // High-performance cached currency formatter (eliminates Intl GC thrashing)
  const ID_CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID');
  function formatIDR(num) {
    return ID_CURRENCY_FORMATTER.format(Math.round(num || 0));
  }

  // Audio synthesizer for non-blocking feedback
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playTap() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
      } catch (e) {}
    },
    playSuccess() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
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
            handleUserAuthenticated({
              name: profile.name || profile.given_name || (profile.email ? profile.email.split('@')[0] : 'Pengguna Google'),
              email: profile.email || 'freerobuxreal303@gmail.com',
              avatar: (profile.name ? profile.name.charAt(0) : 'G').toUpperCase(),
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
          handleUserAuthenticated({
            name: p.name || p.given_name || (p.email ? p.email.split('@')[0] : 'Pengguna Google'),
            email: p.email || 'freerobuxreal303@gmail.com',
            avatar: (p.name ? p.name.charAt(0) : 'G').toUpperCase(),
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
    const fullName = user.name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Freerobuxreal');
    const email = user.email || 'freerobuxreal303@gmail.com';
    const avatar = (fullName.charAt(0) || 'F').toUpperCase();
    const avatarUrl = user.avatarUrl || user.picture || user.user_metadata?.avatar_url || '';

    state.isLoggedIn = true;
    state.currentUser = {
      name: fullName,
      email: email,
      avatar: avatar,
      avatarUrl: avatarUrl,
      provider: provider,
      id: user.id || user.sub || 'usr_' + Date.now(),
      loginAt: Date.now()
    };

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

    hideLoginScreen();
    updateUserProfileUI();
    showToast(`🟢 Selamat datang, ${fullName}! Masuk dengan Google.`);

    // Bersihkan hash token di address bar setelah berhasil login
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('id_token') || window.location.hash.includes('error'))) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Pastikan Multi-Device Realtime Sync terhubung
    if (!state.isRealtimeConnected) {
      initSupabaseRealtime();
    }
  }

  // =========================================================================
  // LOGIN GOOGLE OAUTH 2.0 (SESUAI PANDUAN MR. TIO • POPUP OTOMATIS)
  // =========================================================================
  async function loginWithGoogleOAuth() {
    AudioEngine.playTap();
    showToast('Membuka Google Sign-In...', 'info');

    try {
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // 1. Langsung buka popup window saat tombol ditekan
      const popup = window.open(
        'about:blank',
        'GoogleSignInPopup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Menghubungkan ke Google...</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff0f5; color: #db2777; text-align: center; }
              .spinner { width: 36px; height: 36px; border: 4px solid #fce7f3; border-top-color: #ec4899; border-radius: 50%; animation: spin 0.8s linear infinite; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <p style="margin-top: 14px; font-weight: 700; font-size: 13px;">Menghubungkan ke Google Cloud Platform...</p>
          </body>
          </html>
        `);
      }

      // 2. Susun URL Google OAuth 2.0 resmi (Panduan Mr. Tio Step 5 & 6)
      const redirectUri = getGoogleRedirectUri();
      const stateNonce = 'st_' + Math.random().toString(36).substring(2, 10);
      const authUrl = new URL(GOOGLE_OAUTH_CONFIG.AUTH_URI);
      authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CONFIG.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token id_token');
      authUrl.searchParams.set('scope', GOOGLE_OAUTH_CONFIG.SCOPES);
      authUrl.searchParams.set('prompt', 'select_account');
      authUrl.searchParams.set('nonce', stateNonce);

      if (popup) {
        popup.location.href = authUrl.toString();
      } else {
        window.location.href = authUrl.toString();
        return;
      }

      // 3. Monitor penutupan popup (Fallback jika postMessage terblokir)
      const popupWatcher = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(popupWatcher);
          const isMarkedLoggedIn = localStorage.getItem('smart_grocery_logged_in') === 'true';
          const savedUserStr = localStorage.getItem('smart_grocery_user');
          if (isMarkedLoggedIn && savedUserStr) {
            try {
              const u = JSON.parse(savedUserStr);
              if (u && !state.isLoggedIn) {
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

  // Alias untuk kompatibilitas
  async function triggerDirectGoogleRedirect() {
    return loginWithGoogleOAuth();
  }

  function handlePasswordLogin() {
    const userInp = document.getElementById('inputAuthLoginUsername');
    const val = userInp ? userInp.value.trim() : '';
    const name = val.includes('@') ? val.split('@')[0] : (val || 'Pengguna');
    const email = val.includes('@') ? val : `${val.toLowerCase() || 'pengguna'}@smartgrocery.app`;

    state.isLoggedIn = true;
    state.currentUser = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email,
      avatar: (name.charAt(0) || 'U').toUpperCase(),
      provider: 'credentials',
      loginAt: Date.now()
    };

    saveStateToStorage();

    // JIKA JENDELA INI DIBUKA SEBAGAI POPUP OLEH TAB UTAMA:
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_POPUP_SUCCESS',
          user: state.currentUser,
          token: null
        }, '*');
        localStorage.setItem('smart_grocery_popup_user', JSON.stringify(state.currentUser));
      } catch (e) {
        console.warn('postMessage to opener notice:', e);
      }
      setTimeout(() => {
        window.close();
      }, 150);
      return;
    }

    hideLoginScreen();
    updateUserProfileUI();
    showToast(`🟢 Selamat datang, ${state.currentUser.name}!`);
  }

  function handlePasswordRegister() {
    const nameInp = document.getElementById('inputAuthRegName');
    const emailInp = document.getElementById('inputAuthRegEmail');
    const name = nameInp ? nameInp.value.trim() : 'Siswa Mutiara Bangsa';
    const email = emailInp ? emailInp.value.trim() : 'siswa@mutiarabangsa.sch.id';

    state.isLoggedIn = true;
    state.currentUser = {
      name: name,
      email: email,
      avatar: (name.charAt(0) || 'S').toUpperCase(),
      provider: 'registered',
      loginAt: Date.now()
    };

    saveStateToStorage();

    // JIKA JENDELA INI DIBUKA SEBAGAI POPUP OLEH TAB UTAMA:
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_POPUP_SUCCESS',
          user: state.currentUser,
          token: user.access_token || null
        }, '*');
        localStorage.setItem('smart_grocery_popup_user', JSON.stringify(state.currentUser));
      } catch (e) {
        console.warn('postMessage to opener notice:', e);
      }
      setTimeout(() => {
        window.close();
      }, 150);
      return;
    }

    hideLoginScreen();
    updateUserProfileUI();
    showToast(`🎉 Akun ${name} berhasil dibuat!`);
  }

  function loginAsGuest() {
    state.isLoggedIn = true;
    state.currentUser = {
      name: 'Pengguna Tamu',
      email: 'guest@smartgrocery.app',
      avatar: 'G',
      provider: 'guest',
      loginAt: Date.now()
    };
    saveStateToStorage();

    // JIKA JENDELA INI DIBUKA SEBAGAI POPUP OLEH TAB UTAMA:
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_POPUP_SUCCESS',
          user: state.currentUser,
          token: null
        }, '*');
        localStorage.setItem('smart_grocery_popup_user', JSON.stringify(state.currentUser));
      } catch (e) {
        console.warn('postMessage to opener notice:', e);
      }
      setTimeout(() => {
        window.close();
      }, 150);
      return;
    }

    hideLoginScreen();
    updateUserProfileUI();
    showToast('🟢 Masuk sebagai Pengguna Tamu!');
  }

  async function logoutToLoginScreen() {
    state.isLoggedIn = false;
    localStorage.removeItem('smart_grocery_logged_in');
    localStorage.removeItem('smart_grocery_user');
    if (state.supabase) {
      try {
        await state.supabase.auth.signOut();
      } catch (e) {}
    }
    showLoginScreen();
    showToast('Anda telah keluar dari aplikasi.');
  }

  function showLoginScreen() {
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.remove('hidden');
  }

  function hideLoginScreen() {
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.add('hidden');
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

  function openGoogleOAuthModal() {
    const modal = document.getElementById('modalOurGoogleOAuth');
    if (modal) modal.classList.add('show');
  }

  function closeGoogleOAuthModal() {
    const modal = document.getElementById('modalOurGoogleOAuth');
    if (modal) modal.classList.remove('show');
  }

  function selectGoogleAccount(name, email, avatarSymbol, themeColor) {
    state.isLoggedIn = true;
    state.currentUser = {
      name,
      email,
      avatar: avatarSymbol || name.charAt(0).toUpperCase(),
      provider: 'google',
      themeColor: themeColor || 'pink',
      loginAt: Date.now()
    };

    saveStateToStorage();
    closeGoogleOAuthModal();
    hideLoginScreen();
    updateUserProfileUI();
    showToast(`🟢 Berhasil masuk sebagai ${name} (${email})!`);
  }

  function toggleCustomGoogleInput() {
    const box = document.getElementById('customGoogleInputBox');
    if (box) box.classList.toggle('hidden');
  }

  function submitCustomGoogleAccount() {
    const nameInput = document.getElementById('customGoogleName');
    const emailInput = document.getElementById('customGoogleEmail');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!name || !email || !email.includes('@')) {
      showToast('⚠️ Masukkan Nama dan Email Google yang valid!', 'danger');
      return;
    }

    selectGoogleAccount(name, email, name.charAt(0).toUpperCase(), 'pink');
  }

  function updateUserProfileUI() {
    const hAvatar = document.getElementById('headerUserAvatar');
    const hName = document.getElementById('headerUserName');
    const dAvatar = document.getElementById('dompetUserAvatar');
    const dName = document.getElementById('dompetUserName');
    const dEmail = document.getElementById('dompetUserEmail');

    if (hAvatar) hAvatar.textContent = state.currentUser.avatar;
    if (hName) hName.textContent = state.currentUser.name.split(' ')[0];
    if (dAvatar) dAvatar.textContent = state.currentUser.avatar;
    if (dName) dName.textContent = state.currentUser.name;
    if (dEmail) dEmail.textContent = state.currentUser.email;
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
  // SRS F-06A: PERSISTENSI DATA LOKAL (LocalStorage & F5 Protection)
  // =========================================================================
  function saveStateToStorage() {
    try {
      localStorage.setItem('smart_grocery_cart', JSON.stringify(state.cart));
      localStorage.setItem('smart_grocery_budget', String(state.budgetLimit));
      localStorage.setItem('smart_grocery_store', state.storeLocation);
      localStorage.setItem('smart_grocery_date', state.shoppingDate);
      if (state.isLoggedIn && state.currentUser) {
        localStorage.setItem('smart_grocery_user', JSON.stringify(state.currentUser));
      } else {
        localStorage.removeItem('smart_grocery_user');
      }
      localStorage.setItem('smart_grocery_history', JSON.stringify(state.historySessions));
      localStorage.setItem('smart_grocery_logged_in', state.isLoggedIn ? 'true' : 'false');
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }
  }

  function loadStateFromStorage() {
    try {
      const savedLoggedIn = localStorage.getItem('smart_grocery_logged_in');
      state.isLoggedIn = savedLoggedIn === 'true';

      const savedCart = localStorage.getItem('smart_grocery_cart');
      if (savedCart) {
        try { state.cart = JSON.parse(savedCart); } catch (e) { state.cart = []; }
      }

      const savedBudget = localStorage.getItem('smart_grocery_budget');
      if (savedBudget && !isNaN(parseFloat(savedBudget))) {
        state.budgetLimit = parseFloat(savedBudget);
      }

      const savedStore = localStorage.getItem('smart_grocery_store');
      if (savedStore) state.storeLocation = savedStore;

      const savedDate = localStorage.getItem('smart_grocery_date');
      if (savedDate) state.shoppingDate = savedDate;

      if (state.isLoggedIn) {
        const savedUser = localStorage.getItem('smart_grocery_user');
        if (savedUser) {
          try { state.currentUser = JSON.parse(savedUser); } catch (e) {}
        }
      }

      const savedHistory = localStorage.getItem('smart_grocery_history');
      if (savedHistory) {
        try { state.historySessions = JSON.parse(savedHistory); } catch (e) { state.historySessions = []; }
      }
    } catch (e) {
      console.warn('LocalStorage load notice:', e);
    }
  }

  // =========================================================================
  // SRS F-06B: SINKRONISASI REALTIME CLOUD MULTI-DEVICE (Supabase WebSocket)
  // =========================================================================
  async function initSupabaseRealtime() {
    if (!window.supabase) return;
    try {
      if (!state.supabase) {
        state.supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
      }

      // Subscribe to Realtime Broadcast Channel
      state.realtimeChannel = state.supabase.channel(SUPABASE_CONFIG.CHANNEL, {
        config: { broadcast: { ack: false } }
      });

      state.realtimeChannel
        .on('broadcast', { event: 'MULTIDEVICE_SYNC' }, ({ payload }) => {
          if (!payload || payload.senderId === state.deviceId) return;
          handleIncomingRealtimeSync(payload);
        })
        .subscribe((status) => {
          const badge = document.getElementById('realtimeStatusText');
          if (status === 'SUBSCRIBED') {
            state.isRealtimeConnected = true;
            if (badge) badge.textContent = '🟢 Cloud Realtime Sync Aktif (Live Multi-Device)';
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            state.isRealtimeConnected = false;
            if (badge) badge.textContent = '🟡 Cloud Sync Menghubungkan...';
          }
        });
    } catch (err) {
      console.warn('Supabase Realtime setup notice:', err);
    }
  }

  function broadcastStateChange() {
    if (!state.realtimeChannel || !state.isRealtimeConnected) return;
    try {
      state.realtimeChannel.send({
        type: 'broadcast',
        event: 'MULTIDEVICE_SYNC',
        payload: {
          senderId: state.deviceId,
          cart: state.cart,
          budgetLimit: state.budgetLimit,
          storeLocation: state.storeLocation,
          timestamp: Date.now()
        }
      });
    } catch (e) {
      console.warn('Realtime broadcast notice:', e);
    }
  }

  function handleIncomingRealtimeSync(payload) {
    if (!payload) return;
    if (Array.isArray(payload.cart)) state.cart = payload.cart;
    if (payload.budgetLimit) state.budgetLimit = payload.budgetLimit;
    if (payload.storeLocation) state.storeLocation = payload.storeLocation;

    saveStateToStorage();
    renderAll();
    showToast('⚡ Sinkronisasi realtime diterima dari perangkat lain!', 'info');
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
  // SRS F-01 & F-02: KERANJANG BELANJA (CART RENDERING & REACTIVE STEPPER)
  // =========================================================================
  function renderCart() {
    const container = document.getElementById('cartItemsList');
    const badge = document.getElementById('navCartBadge');
    if (badge) badge.textContent = String(state.cart.length);

    if (!container) return;

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 px-4 bg-white rounded-2xl border border-pink-100 shadow-sm">
          <div class="w-14 h-14 rounded-full bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-[32px]">remove_shopping_cart</span>
          </div>
          <h3 class="font-display text-sm font-bold text-ink">Keranjang Belanja Masih Kosong</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Keranjang belanja masih kosong, silakan tambahkan kebutuhan pokok pertamamu dari katalog atau tombol di atas.
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

            <button type="button" class="w-8 h-8 rounded-lg bg-pink-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0" onclick="app.deleteCartItem('${item.id}')" title="Hapus dari troli" aria-label="Hapus ${escapeHtml(item.name)} dari troli">
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
  // MASTER CATALOG RENDERING (TAB 2)
  // =========================================================================
  function renderCatalog() {
    const container = document.getElementById('masterCatalogList');
    if (!container) return;

    let html = '';
    MASTER_CATALOG.forEach(item => {
      const disc = calculateDiscount(item.price, item.discountStr);
      const fluc = comparePriceWithLastMonth(disc.finalUnitPrice, item.lastMonthPrice);

      html += `
        <div class="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-2xl p-2 rounded-xl bg-pink-50 shrink-0">${item.icon}</span>
            <div class="min-w-0">
              <div class="font-display text-xs sm:text-sm font-bold text-ink truncate">${escapeHtml(item.name)}</div>
              <div class="text-[10px] text-pink-600 font-semibold">${escapeHtml(item.desc)}</div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="font-mono text-xs font-bold text-ink">Rp ${formatIDR(disc.finalUnitPrice)}</span>
                ${item.discountStr ? `<span class="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">${item.discountStr}</span>` : ''}
                <span class="price-indicator-badge ${fluc.badgeClass} text-[9px] py-0.5 px-1.5">${fluc.text}</span>
              </div>
            </div>
          </div>

          <button type="button" class="stepper-btn bg-pink-500 hover:bg-pink-600 text-white border-pink-500 shrink-0 shadow-sm" onclick="app.addCatalogItemToCart('${item.id}')" title="Tambah ke Troli" aria-label="Tambah ${escapeHtml(item.name)} ke Troli">
            &plus;
          </button>
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

    if (state.historySessions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 px-4 bg-white rounded-2xl border border-pink-100">
          <span class="material-symbols-outlined text-[28px] text-slate-300 mb-1">receipt</span>
          <p class="text-xs text-slate-500">Belum ada struk belanja yang diarsipkan.</p>
        </div>
      `;
      return;
    }

    let html = '';
    state.historySessions.forEach((s) => {
      html += `
        <div class="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm space-y-2">
          <div class="flex items-center justify-between pb-2 border-b border-pink-50">
            <div>
              <span class="font-mono text-xs font-bold text-ink">${escapeHtml(s.date)}</span>
              <span class="block text-[10px] text-slate-400 font-medium">${escapeHtml(s.store || state.storeLocation)}</span>
            </div>
            <strong class="font-mono text-sm font-black text-pink-600">Rp ${formatIDR(s.totalCost)}</strong>
          </div>
          <div class="text-xs text-slate-600 font-medium">
            ${s.items.length} Barang Belanja &bull; Hemat Promo: Rp ${formatIDR(s.totalSaved || 0)}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // ACTIONS & HANDLERS (F-01 s/d F-06)
  // =========================================================================
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
      lastMonthPrice,
      updatedAt: new Date().toISOString()
    };

    const existingIdx = state.cart.findIndex(i => i.id === newItem.id);
    if (existingIdx !== -1) {
      state.cart[existingIdx] = newItem;
      showToast(`✏️ "${name}" berhasil diperbarui!`);
    } else {
      state.cart.unshift(newItem);
      showToast(`🛒 "${name}" berhasil ditambahkan ke keranjang!`);
    }

    AudioEngine.playSuccess();
    closeItemModal();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  function updateItemQty(itemId, newQty) {
    const item = state.cart.find(i => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      deleteCartItem(itemId);
      return;
    }

    item.qty = newQty;
    AudioEngine.playTap();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  function deleteCartItem(itemId) {
    const idx = state.cart.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      const removedName = state.cart[idx].name;
      state.cart.splice(idx, 1);
      AudioEngine.playTap();
      saveStateToStorage();
      broadcastStateChange();
      renderAll();
      showToast(`🗑️ "${removedName}" dihapus dari keranjang.`);
    }
  }

  function addCatalogItemToCart(catalogId) {
    const catItem = MASTER_CATALOG.find(i => i.id === catalogId);
    if (!catItem) return;

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
      showToast(`🛒 ${catItem.name} masuk ke keranjang!`);
    }

    AudioEngine.playSuccess();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
  }

  function confirmClearCart() {
    state.cart = [];
    closeClearCartModal();
    saveStateToStorage();
    broadcastStateChange();
    renderAll();
    showToast('🧹 Keranjang belanja berhasil dikosongkan!');
  }

  function completeCheckout() {
    if (state.cart.length === 0) {
      showToast('⚠️ Keranjang belanja masih kosong!', 'danger');
      return;
    }

    let totalCost = 0;
    let totalSaved = 0;
    const itemsSnapshot = state.cart.map(i => {
      const disc = calculateDiscount(i.originalPrice, i.discountStr);
      const subtotal = disc.finalUnitPrice * i.qty;
      totalCost += subtotal;
      totalSaved += (i.originalPrice - disc.finalUnitPrice) * i.qty;
      return {
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        finalUnitPrice: disc.finalUnitPrice,
        subtotal
      };
    });

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const newSession = {
      id: 'trx_' + Date.now(),
      date: formattedDate,
      store: state.storeLocation,
      totalCost,
      totalSaved,
      items: itemsSnapshot,
      createdAt: now.toISOString()
    };

    state.historySessions.unshift(newSession);
    saveStateToStorage();
    AudioEngine.playSuccess();
    openReceiptModal(newSession);
  }

  function openReceiptModal(session) {
    const modal = document.getElementById('modalReceiptBackdrop');
    const container = document.getElementById('receiptItemsContainer');
    const timeEl = document.getElementById('receiptTimestampDisplay');
    const limitEl = document.getElementById('receiptLimitDisplay');
    const savedEl = document.getElementById('receiptSavedDisplay');
    const totalEl = document.getElementById('receiptGrandTotalDisplay');

    if (!modal) return;

    if (timeEl) timeEl.textContent = session.date;
    if (limitEl) limitEl.textContent = `Rp ${formatIDR(state.budgetLimit)}`;
    if (savedEl) savedEl.textContent = `Rp ${formatIDR(session.totalSaved || 0)}`;
    if (totalEl) totalEl.textContent = `Rp ${formatIDR(session.totalCost)}`;

    if (container) {
      let html = '';
      session.items.forEach(i => {
        html += `
          <div class="flex items-center justify-between text-xs font-mono py-1 border-b border-pink-50">
            <div>
              <span class="font-bold text-ink">${escapeHtml(i.name)}</span>
              <span class="text-slate-400 text-[10px]"> x${i.qty}</span>
            </div>
            <span class="font-bold text-pink-600">Rp ${formatIDR(i.subtotal)}</span>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    modal.classList.add('show');
  }

  function closeReceiptModal() {
    const modal = document.getElementById('modalReceiptBackdrop');
    if (modal) modal.classList.remove('show');
    renderAll();
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

  function openClearCartModal() {
    const modal = document.getElementById('modalConfirmClearCart');
    if (modal) modal.classList.add('show');
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
  // NAVIGATION SETUP (4 Clean Tabs)
  // =========================================================================
  function setupNavigation() {
    const tabs = document.querySelectorAll('.dock-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        if (!targetId) return;

        AudioEngine.playTap();
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const activePane = document.getElementById(targetId);
        if (activePane) activePane.classList.add('active');
      });
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

    // Cloud Ping test button
    const btnPing = document.getElementById('btnTestCloudPing');
    if (btnPing) {
      btnPing.addEventListener('click', () => {
        broadcastStateChange();
        showToast('📡 Sinyal broadcast sinkronisasi dikirim ke cloud!');
      });
    }

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

  // Initializing App
  async function init() {
    loadStateFromStorage();
    setupNavigation();
    setupClock();
    setupEventListeners();
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
    openClearCartModal,
    closeClearCartModal,
    confirmClearCart,
    openReceiptModal,
    closeReceiptModal,
    openGoogleOAuthModal,
    closeGoogleOAuthModal,
    selectGoogleAccount,
    toggleCustomGoogleInput,
    submitCustomGoogleAccount,
    completeCheckout,
    calculateDiscount,
    comparePriceWithLastMonth,
    loginWithGoogleOAuth,
    triggerDirectGoogleRedirect,
    handlePasswordLogin,
    handlePasswordRegister,
    loginAsGuest,
    logoutToLoginScreen,
    togglePasswordVisibility,
    toggleOAuthInfoBox
  };

  document.addEventListener('DOMContentLoaded', init);

})();
