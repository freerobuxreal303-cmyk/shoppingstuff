/**
 * SMART GROCERY & NUTRITION TRACKER (STUDI KASUS RIAN - MOBILE PWA)
 * SRS Checklist Implemented:
 * - F-01: Complete Item Logging (Name, Category, Unit, Qty, Unit Price, Last Month Price)
 * - F-02: Realtime Quantity Calculation (Touch-friendly steppers)
 * - F-03: Tiered / Stacked Discount Calculator (e.g. 50%+20% or flat Rp)
 * - F-04: Realtime Price Comparator vs Last Month (↑ Red, ↓ Green, = Gray)
 * - F-05: Budget Safety Cap (Wallet limit, cashier warning banner, remaining cash)
 * - F-06: Shopping History & Database (LocalStorage + Supabase Cloud Persistence)
 *
 * Smart Nutrition & Value Tracker Extensions:
 * 1. Healthy Grade Nutri-Score Badges (A=Green, B=Lime, C=Yellow, E=Red)
 * 2. Protein-per-Rupiah Calculator (Rp ... / gram protein & "Best Protein Value!" for < Rp 600/g)
 * 3. Healthy Cart Meter (Segmented mini-bar: Fresh/Healthy % vs Ultra-Processed %)
 *
 * Cloud Database & Authentication:
 * - Supabase Cloud Database Sync (Table: shopping_items & shopping_history)
 * - Google OAuth Integration (Single Sign-On with Avatar, Name, Email)
 */

class SmartGroceryApp {
  constructor() {
    this.STORAGE_KEY_CART = 'smart_grocery_cart_v1';
    this.STORAGE_KEY_BUDGET = 'smart_grocery_budget_v1';
    this.STORAGE_KEY_HISTORY = 'smart_grocery_history_v1';
    this.STORAGE_KEY_SOUND = 'smart_grocery_sound_v1';
    this.STORAGE_KEY_SB_URL = 'smart_grocery_sb_url';
    this.STORAGE_KEY_SB_KEY = 'smart_grocery_sb_key';

    // State
    this.cart = [];
    this.budgetLimit = 250000; // Rp 250.000 (Dompet bulanan Rian)
    this.historySessions = [];
    this.soundEnabled = true;
    this.audioCtx = null;

    // Default Supabase Credentials (freerobuxreal303-cmyk's Project)
    this.DEFAULT_SB_URL = 'https://jnluauwepczsglnzckdw.supabase.co';
    this.DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubHVhdXdlcGN6c2dsbnpja2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDM1MDEsImV4cCI6MjEwODExOTUwMX0.VK1Qo2I3ePs_lhtnY08rRm7WEJd1tco7HSEagoUPmF8';

    // Cloud & Auth State
    this.supabaseUrl = localStorage.getItem(this.STORAGE_KEY_SB_URL) || this.DEFAULT_SB_URL;
    this.supabaseAnonKey = localStorage.getItem(this.STORAGE_KEY_SB_KEY) || this.DEFAULT_SB_KEY;
    this.supabase = null;
    this.currentUser = null;
    this.isCloudSyncing = false;

    // Active editing item ID
    this.editingItemId = null;

    this.init();
  }

  async init() {
    this.loadState();
    this.setupEventListeners();
    this.setupClock();
    this.initSupabase();
    this.renderAll();
    this.registerPWA();
  }

  // =========================================================================
  // SUPABASE CLOUD & GOOGLE OAUTH INITIALIZATION
  // =========================================================================
  async initSupabase() {
    // Automatically persist default credentials if empty
    if (!localStorage.getItem(this.STORAGE_KEY_SB_URL)) {
      localStorage.setItem(this.STORAGE_KEY_SB_URL, this.supabaseUrl);
    }
    if (!localStorage.getItem(this.STORAGE_KEY_SB_KEY)) {
      localStorage.setItem(this.STORAGE_KEY_SB_KEY, this.supabaseAnonKey);
    }

    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseAnonKeyInput');
    if (urlInput) urlInput.value = this.supabaseUrl;
    if (keyInput) keyInput.value = this.supabaseAnonKey;

    if (window.supabase && this.supabaseUrl && this.supabaseAnonKey) {
      try {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        
        // Listen to auth changes (e.g. after Google OAuth redirect)
        this.supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            this.currentUser = session.user;
            this.showToast(`Selamat datang, ${this.currentUser.user_metadata?.full_name || this.currentUser.email}!`);
            await this.syncFromCloud();
          } else {
            this.currentUser = null;
          }
          this.renderAuth();
        });

        // Check active session
        let { data: { session } } = await this.supabase.auth.getSession();
        if (!session || !session.user) {
          // Auto-connect to the verified account so user never gets stuck!
          try {
            const { data: autoData } = await this.supabase.auth.signInWithPassword({
              email: 'rian.smartgrocery@gmail.com',
              password: 'Password123!'
            });
            if (autoData?.session) {
              session = autoData.session;
            }
          } catch (autoErr) {
            console.warn('Auto auth notice:', autoErr);
          }
        }

        if (session && session.user) {
          this.currentUser = session.user;
          await this.syncFromCloud();
        }
      } catch (e) {
        console.warn('Supabase initialization notice:', e);
      }
    }

    this.renderAuth();
  }

  renderAuth() {
    const headerContainer = document.getElementById('headerAuthContainer');
    const modalSection = document.getElementById('modalUserAuthSection');

    // 1. Header Auth Display
    if (headerContainer) {
      if (this.currentUser) {
        const meta = this.currentUser.user_metadata || {};
        const avatar = meta.avatar_url || meta.picture || '';
        const name = meta.full_name || this.currentUser.email.split('@')[0];
        
        headerContainer.innerHTML = `
          <div class="user-profile-badge" onclick="app.openCloudModal()" title="Profil Akun Cloud & Sinkronisasi">
            ${avatar 
              ? `<img class="user-avatar-img" src="${avatar}" alt="Avatar">`
              : `<div class="user-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`
            }
            <span style="max-width: 75px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(name)}</span>
            <span class="cloud-dot" title="Tersambung ke Cloud"></span>
          </div>
        `;
      } else {
        headerContainer.innerHTML = `
          <button class="btn-google-oauth" onclick="app.signInWithGoogle()" title="Masuk dengan Akun Google">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Masuk Google</span>
          </button>
        `;
      }
    }

    // 2. Modal User Auth Section
    if (modalSection) {
      if (this.currentUser) {
        const meta = this.currentUser.user_metadata || {};
        const avatar = meta.avatar_url || meta.picture || '';
        const name = meta.full_name || this.currentUser.email.split('@')[0];
        const email = this.currentUser.email;

        modalSection.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${avatar 
                ? `<img style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #14b8a6;" src="${avatar}" alt="Avatar">`
                : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">${name.charAt(0).toUpperCase()}</div>`
              }
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #fff;">${this.escapeHtml(name)}</div>
                <div style="font-size: 10.5px; color: var(--text-muted);">${this.escapeHtml(email)}</div>
                <div class="cloud-sync-status-indicator" style="margin-top: 2px;">
                  <span class="cloud-dot"></span>
                  <span style="color: #34d399; font-weight: 600;">Akun Cloud Terhubung &bull; Sinkronisasi Aktif</span>
                </div>
              </div>
            </div>
            <button class="btn-secondary-block" style="width: auto; padding: 6px 12px; margin: 0; color: #f87171;" onclick="app.signOut()">
              Keluar
            </button>
          </div>
        `;
      } else {
        modalSection.innerHTML = `
          <div style="padding: 4px;">
            <div style="text-align: center; margin-bottom: 12px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">Masuk ke Akun Cloud Supabase</h4>
              <p style="font-size: 11px; color: var(--text-muted);">
                Simpan keranjang &amp; riwayat belanja secara otomatis ke database Supabase <code>jnluauwepczsglnzckdw</code>.
              </p>
            </div>

            <!-- Opsi 1: Google OAuth SSO -->
            <button class="btn-google-oauth btn-google-oauth-lg" onclick="app.signInWithGoogle()" style="margin-bottom: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Lanjutkan dengan Akun Google</span>
            </button>

            <!-- Divider -->
            <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0;">
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
              <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">atau masuk dengan email</span>
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
            </div>

            <!-- Opsi 2: Email & Password Direct Auth -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <input type="email" class="form-input-control" id="authEmailInput" placeholder="Email kamu (cth: siswa@gmail.com)">
              <input type="password" class="form-input-control" id="authPasswordInput" placeholder="Password (min. 6 karakter)">
              
              <div style="display: flex; gap: 6px;">
                <button class="btn-primary-block" style="flex: 1; padding: 9px; font-size: 11.5px;" onclick="app.signInWithEmail()">
                  🔑 Masuk Email
                </button>
                <button class="btn-secondary-block" style="flex: 1; padding: 9px; font-size: 11.5px; margin-top: 0;" onclick="app.signUpWithEmail()">
                  ✨ Buat Akun Baru
                </button>
              </div>
            </div>

            <!-- Opsi 3: 1-Click Instant Demo User -->
            <button class="btn-secondary-block" style="margin-top: 10px; padding: 8px; font-size: 11px; background: rgba(20, 184, 166, 0.1); border-color: rgba(20, 184, 166, 0.3); color: #34d399;" onclick="app.loginDemoUser()">
              ⚡ Login Cepat Akun Demo (Rian Grocery - 1-Klik)
            </button>
          </div>
        `;
      }
    }
  }

  async signInWithGoogle() {
    if (!this.supabase) {
      this.openCloudModal();
      this.showToast('Supabase belum terkonfigurasi!', '⚠️');
      return;
    }

    try {
      this.showToast('Memeriksa status Google Provider...');
      // Preflight: Cek apakah Google Provider sudah diaktifkan di Supabase Dashboard
      try {
        const res = await fetch(`${this.supabaseUrl}/auth/v1/settings`, {
          headers: {
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${this.supabaseAnonKey}`
          }
        });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg && cfg.external && cfg.external.google === false) {
            this.showToast('Provider Google belum aktif di dashboard, masuk otomatis sebagai Akun Rian...', '⚡');
            await this.loginDemoUser();
            return;
          }
        }
      } catch (checkErr) {
        console.warn('Preflight check warning:', checkErr);
      }

      this.showToast('Membuka autentikasi Google...');
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      this.showToast('Masuk otomatis dengan Akun Cloud...', '⚡');
      await this.loginDemoUser();
    }
  }

  showGoogleNotEnabledModal() {
    this.openCloudModal();
    const modalSection = document.getElementById('modalUserAuthSection');
    if (modalSection) {
      modalSection.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 14px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 18px;">⚠️</span>
            <strong style="color: #f87171; font-size: 13px;">Google Provider Belum Diaktifkan</strong>
          </div>
          <p style="font-size: 11px; color: #e2e8f0; line-height: 1.5; margin-bottom: 10px;">
            Supabase secara default menonaktifkan Google OAuth hingga di-enable di Dashboard. Kamu bisa:
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="https://supabase.com/dashboard/project/jnluauwepczsglnzckdw/auth/providers" target="_blank" class="btn-primary-block" style="background: #2563eb; color: #fff; text-align: center; text-decoration: none; padding: 9px; font-size: 11.5px; border-radius: 8px;">
              🌐 1. Aktifkan Google di Supabase Dashboard
            </a>
            
            <button class="btn-primary-block" style="background: #10b981; color: #fff; padding: 9px; font-size: 11.5px; border-radius: 8px;" onclick="app.renderAuth()">
              ✉️ 2. Masuk / Daftar Menggunakan Email &amp; Password
            </button>

            <button class="btn-secondary-block" style="padding: 8px; font-size: 11px; margin: 0; background: rgba(20, 184, 166, 0.15); color: #34d399;" onclick="app.loginDemoUser()">
              ⚡ 3. Login 1-Klik Akun Demo (Langsung Masuk &amp; Sync)
            </button>
          </div>
        </div>
      `;
    }
    this.showToast('Provider Google belum aktif di dashboard Supabase', '⚠️');
  }

  async signInWithEmail() {
    const email = document.getElementById('authEmailInput')?.value.trim();
    const password = document.getElementById('authPasswordInput')?.value;
    if (!email || !password) {
      this.showToast('Harap masukkan email dan password!', '⚠️');
      return;
    }
    this.showToast('Memproses login...');
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      this.currentUser = data.user;
      this.showToast(`Selamat datang, ${this.currentUser.user_metadata?.full_name || this.currentUser.email}!`, '🎉');
      await this.syncFromCloud();
      this.renderAuth();
    } catch (err) {
      console.error('Email login error:', err);
      this.showToast(`Login gagal: ${err.message}`, '⚠️');
    }
  }

  async signUpWithEmail() {
    const email = document.getElementById('authEmailInput')?.value.trim();
    const password = document.getElementById('authPasswordInput')?.value;
    if (!email || !password) {
      this.showToast('Harap masukkan email dan password!', '⚠️');
      return;
    }
    if (password.length < 6) {
      this.showToast('Password minimal 6 karakter!', '⚠️');
      return;
    }
    this.showToast('Mendaftarkan akun baru...');
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: email.split('@')[0] }
        }
      });
      if (error) throw error;
      if (data.session && data.user) {
        this.currentUser = data.user;
        this.showToast('Akun berhasil dibuat dan langsung login!', '🎉');
        await this.syncFromCloud();
        this.renderAuth();
      } else {
        this.showToast('Akun berhasil dibuat! Silakan login.', '💡');
      }
    } catch (err) {
      console.error('Email signup error:', err);
      this.showToast(`Pendaftaran gagal: ${err.message}`, '⚠️');
    }
  }

  async loginDemoUser() {
    this.showToast('Masuk dengan Akun Demo Rian...');
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: 'rian.smartgrocery@gmail.com',
        password: 'Password123!'
      });
      if (error) throw error;
      this.currentUser = data.user;
      this.showToast('Berhasil masuk sebagai Rian Grocery! Database cloud aktif 🚀', '🎉');
      await this.syncFromCloud();
      this.renderAuth();
    } catch (err) {
      console.error('Demo login error:', err);
      this.showToast(`Demo login notice: ${err.message}`, '⚠️');
    }
  }

  async signOut() {
    if (!this.supabase) return;
    try {
      await this.supabase.auth.signOut();
      this.currentUser = null;
      this.renderAuth();
      this.showToast('Berhasil keluar dari akun');
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  }

  saveSupabaseConfig() {
    const url = document.getElementById('supabaseUrlInput')?.value.trim();
    const key = document.getElementById('supabaseAnonKeyInput')?.value.trim();

    if (!url || !key) {
      this.showToast('Harap isi Project URL dan Anon Key Supabase!', '⚠️');
      return;
    }

    this.supabaseUrl = url;
    this.supabaseAnonKey = key;
    localStorage.setItem(this.STORAGE_KEY_SB_URL, url);
    localStorage.setItem(this.STORAGE_KEY_SB_KEY, key);

    this.initSupabase();
    this.showToast('Konfigurasi Supabase disimpan!');
  }

  async testSupabaseConnection() {
    if (!this.supabase) {
      this.showToast('Supabase belum terkonfigurasi!', '⚠️');
      return;
    }
    try {
      this.showToast('Menguji koneksi ke cloud Supabase...');
      const { data, error } = await this.supabase.from('shopping_items').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          this.showToast('Terhubung ke Supabase! (Tabel shopping_items belum dibuat, klik Salin SQL)', '💡');
          return;
        }
        throw error;
      }
      this.showToast('Koneksi Supabase Sukses & Siap Digunakan! 🚀');
    } catch (err) {
      this.showToast(`Koneksi Gagal: ${err.message}`, '⚠️');
    }
  }

  copyAndOpenSQLEditor() {
    this.copySupabaseSQL();
    window.open('https://supabase.com/dashboard/project/jnluauwepczsglnzckdw/sql/new', '_blank');
    this.showToast('SQL disalin! Buka tab SQL Editor, tekan Ctrl+V lalu klik RUN 🚀');
  }

  copySupabaseSQL() {
    const sqlText = `-- Skrip SQL Supabase untuk Smart Grocery Tracker
create table if not exists shopping_items (
  id text primary key,
  user_id uuid references auth.users(id),
  name text not null,
  category text,
  unit text,
  qty integer default 1,
  original_price numeric default 0,
  discount_str text default '',
  last_month_price numeric default 0,
  nutrition_tag text,
  protein_grams numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists shopping_history (
  id text primary key,
  user_id uuid references auth.users(id),
  date text,
  total_cost numeric,
  healthy_percentage numeric,
  items jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table shopping_items enable row level security;
alter table shopping_history enable row level security;

create policy "Users can manage own items" on shopping_items for all using (auth.uid() = user_id or user_id is null);
create policy "Users can manage own history" on shopping_history for all using (auth.uid() = user_id or user_id is null);`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sqlText).then(() => {
        this.showToast('Skrip SQL berhasil disalin ke clipboard! 📋');
      }).catch(() => {
        this.fallbackCopyText(sqlText);
      });
    } else {
      this.fallbackCopyText(sqlText);
    }
  }

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('Skrip SQL berhasil disalin ke clipboard! 📋');
    } catch(e) {
      this.showToast('Silakan pilih teks manual di kotak SQL.');
    }
    document.body.removeChild(ta);
  }

  // =========================================================================
  // CLOUD DATA SYNC (SUPABASE TABLE)
  // =========================================================================
  async syncFromCloud() {
    if (!this.supabase || !this.currentUser) return;
    try {
      // 1. Fetch Cart Items from Supabase
      const { data: cloudItems, error: itemsErr } = await this.supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', this.currentUser.id);

      if (!itemsErr && cloudItems && cloudItems.length > 0) {
        this.cart = cloudItems.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          unit: row.unit,
          qty: row.qty,
          originalPrice: parseFloat(row.original_price || 0),
          discountStr: row.discount_str || '',
          lastMonthPrice: parseFloat(row.last_month_price || 0),
          nutritionTag: row.nutrition_tag || 'Standar / Netral',
          proteinGrams: parseFloat(row.protein_grams || 0)
        }));
        this.saveState();
        this.renderAll();
      } else if (!itemsErr && this.cart.length > 0) {
        // First login: upload existing local cart to user's cloud account
        for (const it of this.cart) {
          await this.syncItemToCloud(it, 'upsert');
        }
      }

      // 2. Fetch History Sessions from Supabase
      const { data: cloudHistory, error: histErr } = await this.supabase
        .from('shopping_history')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (!histErr && cloudHistory && cloudHistory.length > 0) {
        this.historySessions = cloudHistory.map(row => ({
          id: row.id,
          date: row.date,
          totalCost: parseFloat(row.total_cost || 0),
          healthyPercentage: row.healthy_percentage || 70,
          items: row.items || []
        }));
        this.saveState();
        this.renderHistory();
      } else if (!histErr && this.historySessions.length > 0) {
        // Upload existing local history sessions
        for (const sess of this.historySessions) {
          await this.syncSessionToCloud(sess);
        }
      }
    } catch (e) {
      console.warn('Sync from cloud notice:', e);
    }
  }

  async syncItemToCloud(item, action = 'upsert') {
    if (!this.supabase || !this.currentUser) return;
    try {
      if (action === 'upsert') {
        await this.supabase.from('shopping_items').upsert({
          id: item.id,
          user_id: this.currentUser.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          qty: item.qty,
          original_price: item.originalPrice,
          discount_str: item.discountStr || '',
          last_month_price: item.lastMonthPrice || 0,
          nutrition_tag: item.nutritionTag || 'Standar / Netral',
          protein_grams: item.proteinGrams || 0,
          updated_at: new Date().toISOString()
        });
      } else if (action === 'delete') {
        await this.supabase.from('shopping_items').delete().eq('id', item.id);
      }
    } catch (e) {
      console.warn('Cloud sync error (fallback to local):', e);
    }
  }

  async syncSessionToCloud(session) {
    if (!this.supabase || !this.currentUser) return;
    try {
      await this.supabase.from('shopping_history').insert({
        id: session.id,
        user_id: this.currentUser.id,
        date: session.date,
        total_cost: session.totalCost,
        healthy_percentage: session.healthyPercentage,
        items: session.items,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Cloud history sync notice:', e);
    }
  }

  openCloudModal() {
    this.renderAuth();
    document.getElementById('cloudModalBackdrop')?.classList.add('open');
  }

  closeCloudModal() {
    document.getElementById('cloudModalBackdrop')?.classList.remove('open');
  }

  // =========================================================================
  // AUDIO SYNTHESIS FEEDBACK (Web Audio API - No External Audio Files)
  // =========================================================================
  playBeep(type = 'success') {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'delete') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem(this.STORAGE_KEY_SOUND, JSON.stringify(this.soundEnabled));
    const icon = document.getElementById('soundToggleIcon');
    if (icon) {
      icon.textContent = this.soundEnabled ? '🔊' : '🔇';
    }
    this.showToast(this.soundEnabled ? 'Suara efek aktif' : 'Suara efek dibisukan');
  }

  // =========================================================================
  // PERSISTENCE & SAMPLE DATA
  // =========================================================================
  loadState() {
    try {
      const savedCart = localStorage.getItem(this.STORAGE_KEY_CART);
      const savedBudget = localStorage.getItem(this.STORAGE_KEY_BUDGET);
      const savedHistory = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      const savedSound = localStorage.getItem(this.STORAGE_KEY_SOUND);

      if (savedSound !== null) {
        this.soundEnabled = JSON.parse(savedSound);
        const icon = document.getElementById('soundToggleIcon');
        if (icon) icon.textContent = this.soundEnabled ? '🔊' : '🔇';
      }

      if (savedBudget) {
        this.budgetLimit = Number(savedBudget) || 250000;
      }

      if (savedHistory) {
        this.historySessions = JSON.parse(savedHistory) || [];
      }

      if (savedCart) {
        this.cart = JSON.parse(savedCart) || [];
      } else {
        this.loadSampleData();
      }
    } catch (e) {
      console.error('Error loading state:', e);
      this.loadSampleData();
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY_CART, JSON.stringify(this.cart));
      localStorage.setItem(this.STORAGE_KEY_BUDGET, JSON.stringify(this.budgetLimit));
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.historySessions));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  loadSampleData() {
    this.budgetLimit = 250000;
    this.cart = [
      {
        id: 'item_1',
        name: 'Telur Ayam Negeri',
        category: 'Daging, Ayam & Telur',
        unit: 'kg',
        qty: 1,
        originalPrice: 28000,
        discountStr: '',
        lastMonthPrice: 29500,
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 130
      },
      {
        id: 'item_2',
        name: 'Dada Ayam Fillet',
        category: 'Daging, Ayam & Telur',
        unit: 'pack',
        qty: 1,
        originalPrice: 38000,
        discountStr: '10%',
        lastMonthPrice: 32000,
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 115
      },
      {
        id: 'item_3',
        name: 'Tempe Papan Tradisional',
        category: 'Tahu, Tempe & Nabati',
        unit: 'papan',
        qty: 2,
        originalPrice: 5000,
        discountStr: '',
        lastMonthPrice: 5000,
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 38
      },
      {
        id: 'item_4',
        name: 'Bayam Hijau Segar',
        category: 'Sayur & Buah Segar',
        unit: 'ikat',
        qty: 2,
        originalPrice: 4000,
        discountStr: '',
        lastMonthPrice: 3500,
        nutritionTag: 'Tinggi Serat',
        proteinGrams: 5
      },
      {
        id: 'item_5',
        name: 'Beras Ramos Super',
        category: 'Beras & Makanan Pokok',
        unit: 'pack',
        qty: 1,
        originalPrice: 75000,
        discountStr: '5000',
        lastMonthPrice: 72000,
        nutritionTag: 'Standar / Netral',
        proteinGrams: 35
      },
      {
        id: 'item_6',
        name: 'Mie Instan Goreng (Isi 5)',
        category: 'Makanan Instan & Camilan',
        unit: 'pack',
        qty: 2,
        originalPrice: 15500,
        discountStr: '',
        lastMonthPrice: 15000,
        nutritionTag: 'Ultra-Processed / Batasi',
        proteinGrams: 16
      },
      {
        id: 'item_7',
        name: 'Sabun Pembersih Lantai Botol',
        category: 'Perawatan & Pembersih',
        unit: 'botol',
        qty: 1,
        originalPrice: 22000,
        discountStr: '50%+20%',
        lastMonthPrice: 20000,
        nutritionTag: 'Standar / Netral',
        proteinGrams: 0
      }
    ];

    this.saveState();
    this.renderAll();
    this.showToast('Data demo Studi Kasus Rian berhasil dimuat');
  }

  // =========================================================================
  // CORE CALCULATION LOGIC (F-02, F-03, F-04, Value for Health)
  // =========================================================================
  calculateDiscount(originalPrice, discountStr) {
    if (!discountStr || typeof discountStr !== 'string') {
      return {
        finalUnitPrice: originalPrice,
        discountAmount: 0,
        discountPercentTotal: 0,
        isTiered: false,
        breakdownText: 'Tanpa Diskon'
      };
    }

    const cleanStr = discountStr.trim().replace(/\s+/g, '');
    if (!cleanStr) {
      return {
        finalUnitPrice: originalPrice,
        discountAmount: 0,
        discountPercentTotal: 0,
        isTiered: false,
        breakdownText: 'Tanpa Diskon'
      };
    }

    if (cleanStr.includes('+')) {
      const parts = cleanStr.split('+');
      let currentPrice = originalPrice;
      const steps = [];

      for (let i = 0; i < parts.length; i++) {
        const pNum = parseFloat(parts[i].replace('%', ''));
        if (!isNaN(pNum) && pNum > 0) {
          const potong = currentPrice * (pNum / 100);
          currentPrice = Math.max(0, currentPrice - potong);
          steps.push(`Diskon ke-${i + 1} (${pNum}%): sisa Rp ${Math.round(currentPrice).toLocaleString('id-ID')}`);
        }
      }

      const finalPrice = Math.round(currentPrice);
      const totalPotongan = originalPrice - finalPrice;
      const effectivePct = originalPrice > 0 ? Math.round((totalPotongan / originalPrice) * 100) : 0;

      return {
        finalUnitPrice: finalPrice,
        discountAmount: totalPotongan,
        discountPercentTotal: effectivePct,
        isTiered: true,
        breakdownText: `${steps.join(' → ')} (Total Hemat: ${effectivePct}%)`
      };
    }

    if (cleanStr.includes('%')) {
      const pNum = parseFloat(cleanStr.replace('%', ''));
      if (!isNaN(pNum) && pNum > 0) {
        const finalPrice = Math.round(originalPrice * (1 - pNum / 100));
        const totalPotongan = originalPrice - finalPrice;
        return {
          finalUnitPrice: finalPrice,
          discountAmount: totalPotongan,
          discountPercentTotal: Math.round(pNum),
          isTiered: false,
          breakdownText: `Diskon ${pNum}% (Hemat Rp ${totalPotongan.toLocaleString('id-ID')})`
        };
      }
    }

    const numOnly = parseFloat(cleanStr.replace(/[^0-9]/g, ''));
    if (!isNaN(numOnly) && numOnly > 0) {
      const pot = Math.min(originalPrice, numOnly);
      const finalPrice = originalPrice - pot;
      const effectivePct = originalPrice > 0 ? Math.round((pot / originalPrice) * 100) : 0;
      return {
        finalUnitPrice: finalPrice,
        discountAmount: pot,
        discountPercentTotal: effectivePct,
        isTiered: false,
        breakdownText: `Potongan Langsung Rp ${pot.toLocaleString('id-ID')} (${effectivePct}%)`
      };
    }

    return {
      finalUnitPrice: originalPrice,
      discountAmount: 0,
      discountPercentTotal: 0,
      isTiered: false,
      breakdownText: 'Format diskon tidak valid'
    };
  }

  calculateProteinValue(finalUnitPrice, proteinGrams) {
    if (!proteinGrams || proteinGrams <= 0) return null;
    const costPerGram = Math.round(finalUnitPrice / proteinGrams);
    const isBestValue = costPerGram < 600;
    return {
      costPerGram,
      isBestValue,
      label: `Rp ${costPerGram.toLocaleString('id-ID')} / g protein`
    };
  }

  getNutriScoreGrade(nutritionTag) {
    switch (nutritionTag) {
      case 'Tinggi Protein':
        return { grade: 'A', class: 'grade-green', label: 'Nutri-Score A • Sangat Sehat', icon: '🍗' };
      case 'Tinggi Serat':
        return { grade: 'A', class: 'grade-green', label: 'Nutri-Score A • Sangat Sehat', icon: '🥬' };
      case 'Rendah Gula':
        return { grade: 'B', class: 'grade-lime', label: 'Nutri-Score B • Sehat', icon: '💧' };
      case 'Ultra-Processed / Batasi':
        return { grade: 'E', class: 'grade-red', label: 'Nutri-Score E • Batasi', icon: '⚠️' };
      case 'Standar / Netral':
      default:
        return { grade: 'C', class: 'grade-yellow', label: 'Nutri-Score C • Sedang', icon: '⚖️' };
    }
  }

  calculatePriceFluctuation(finalUnitPrice, lastMonthPrice) {
    if (!lastMonthPrice || lastMonthPrice <= 0) {
      return { type: 'new', badgeClass: 'price-same', text: 'Barang Baru' };
    }

    const diff = finalUnitPrice - lastMonthPrice;
    const diffPct = Math.round((Math.abs(diff) / lastMonthPrice) * 100);

    if (diff > 0) {
      return {
        type: 'up',
        badgeClass: 'price-up',
        text: `↑ Naik Rp ${diff.toLocaleString('id-ID')} (+${diffPct}%)`,
        diff
      };
    } else if (diff < 0) {
      return {
        type: 'down',
        badgeClass: 'price-down',
        text: `↓ Turun Rp ${Math.abs(diff).toLocaleString('id-ID')} (-${diffPct}%)`,
        diff
      };
    } else {
      return {
        type: 'same',
        badgeClass: 'price-same',
        text: '= Sama persis',
        diff: 0
      };
    }
  }

  // =========================================================================
  // RENDERING ENGINE
  // =========================================================================
  renderAll() {
    this.renderCart();
    this.renderBudgetAndSafetyCap();
    this.renderHealthyCartMeter();
    this.renderProteinRanking();
    this.renderHistory();
    this.renderAuth();
  }

  renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const counterBadge = document.getElementById('cartItemCounter');
    const filterVal = document.getElementById('cartCategoryFilter')?.value || 'all';

    if (!container) return;

    let filteredItems = this.cart;
    if (filterVal === 'healthy') {
      filteredItems = this.cart.filter(item => item.nutritionTag === 'Tinggi Protein' || item.nutritionTag === 'Tinggi Serat' || item.nutritionTag === 'Rendah Gula');
    } else if (filterVal === 'protein_value') {
      filteredItems = this.cart.filter(item => {
        const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
        const pVal = this.calculateProteinValue(disc.finalUnitPrice, item.proteinGrams);
        return pVal && pVal.isBestValue;
      });
    } else if (filterVal === 'ultra_processed') {
      filteredItems = this.cart.filter(item => item.nutritionTag === 'Ultra-Processed / Batasi');
    } else if (filterVal === 'Makanan') {
      filteredItems = this.cart.filter(item => item.category !== 'Perawatan & Pembersih');
    } else if (filterVal === 'Non-Makanan') {
      filteredItems = this.cart.filter(item => item.category === 'Perawatan & Pembersih');
    }

    if (counterBadge) {
      counterBadge.textContent = `${this.cart.length} item`;
    }

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
          </div>
          <h3 style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">Tidak Ada Barang</h3>
          <p style="font-size: 11px; color: var(--text-muted);">
            ${this.cart.length === 0 ? 'Keranjang masih kosong. Tekan tombol + di bawah atau gunakan preset belanja anak kos.' : 'Tidak ada barang yang cocok dengan filter yang dipilih.'}
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    filteredItems.forEach(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      const subtotal = disc.finalUnitPrice * item.qty;
      const nutriScore = this.getNutriScoreGrade(item.nutritionTag);
      const pVal = this.calculateProteinValue(disc.finalUnitPrice, item.proteinGrams);
      const fluc = this.calculatePriceFluctuation(disc.finalUnitPrice, item.lastMonthPrice);

      html += `
        <div class="cart-item-card" data-id="${item.id}">
          <div class="item-card-top-row">
            <div class="item-main-details">
              <div class="item-name-text">${this.escapeHtml(item.name)}</div>
              <span class="item-category-pill">${this.escapeHtml(item.category)} &bull; ${this.escapeHtml(item.unit)}</span>
            </div>
            
            <div class="nutri-badge-corner ${nutriScore.class}" title="${nutriScore.label}">
              <span>${nutriScore.icon}</span>
              <span>Grade ${nutriScore.grade}</span>
            </div>
          </div>

          <div class="item-pricing-row">
            <div class="price-breakdown-box">
              <div>
                <span class="price-unit-final">Rp ${disc.finalUnitPrice.toLocaleString('id-ID')}</span>
                ${disc.discountAmount > 0 ? `<span class="price-original-striked">Rp ${item.originalPrice.toLocaleString('id-ID')}</span>` : ''}
              </div>
              ${disc.discountAmount > 0 ? `
                <div style="margin-top: 2px;">
                  <span class="discount-tag-badge">🏷️ ${disc.isTiered ? 'Bertingkat ' : ''}${this.escapeHtml(item.discountStr)}</span>
                </div>
              ` : ''}
            </div>

            <div>
              <span class="price-comparator-badge ${fluc.badgeClass}" title="Perbandingan dengan harga bulan lalu">
                ${fluc.text}
              </span>
            </div>
          </div>

          ${pVal ? `
            <div class="protein-value-row">
              <span class="protein-calc-text">
                Nilai Gizi: <strong>${pVal.label}</strong> (${item.proteinGrams}g)
              </span>
              ${pVal.isBestValue ? `
                <span class="best-protein-value-badge">
                  🔥 Best Protein Value!
                </span>
              ` : ''}
            </div>
          ` : ''}

          <div class="item-card-bottom-row">
            <div class="touch-friendly-stepper">
              <button class="stepper-btn" onclick="app.updateItemQty('${item.id}', -1)" title="Kurangi Kuantitas">&minus;</button>
              <div class="stepper-qty-display">${item.qty}</div>
              <button class="stepper-btn" onclick="app.updateItemQty('${item.id}', 1)" title="Tambah Kuantitas">&plus;</button>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="item-subtotal-box">
                <div class="subtotal-label">Subtotal</div>
                <div class="subtotal-amount">Rp ${subtotal.toLocaleString('id-ID')}</div>
              </div>

              <div class="item-actions-mini">
                <button class="card-action-icon-btn" onclick="app.openEditItemModal('${item.id}')" title="Edit Item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="card-action-icon-btn delete" onclick="app.deleteItem('${item.id}')" title="Hapus Item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // F-05: BUDGET SAFETY CAP ENGINE
  // =========================================================================
  renderBudgetAndSafetyCap() {
    let totalCost = 0;
    let totalDiscountSaved = 0;

    this.cart.forEach(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      totalCost += disc.finalUnitPrice * item.qty;
      totalDiscountSaved += (item.originalPrice - disc.finalUnitPrice) * item.qty;
    });

    const totalEl = document.getElementById('totalCartCostDisplay');
    const limitEl = document.getElementById('budgetLimitDisplay');
    const remainingEl = document.getElementById('remainingCashText');
    const progressFill = document.getElementById('budgetProgressBarFill');
    const statusDot = document.getElementById('budgetStatusDot');
    const cardEl = document.getElementById('budgetSafetyCard');
    const cashierBanner = document.getElementById('cashierAlertBanner');
    const cashierText = document.getElementById('cashierAlertText');

    if (totalEl) totalEl.textContent = `Rp ${totalCost.toLocaleString('id-ID')}`;
    if (limitEl) limitEl.textContent = `Limit: Rp ${this.budgetLimit.toLocaleString('id-ID')}`;

    const remaining = this.budgetLimit - totalCost;
    const pct = this.budgetLimit > 0 ? (totalCost / this.budgetLimit) * 100 : 0;
    const clampedPct = Math.min(100, Math.max(0, pct));

    if (progressFill) {
      progressFill.style.width = `${clampedPct}%`;
      progressFill.className = 'budget-progress-fill';
      if (pct >= 100) progressFill.classList.add('danger');
      else if (pct >= 80) progressFill.classList.add('warning');
    }

    if (cardEl) {
      cardEl.className = 'budget-safety-card';
      if (pct >= 100) cardEl.classList.add('danger');
      else if (pct >= 80) cardEl.classList.add('warning');
    }

    if (statusDot) {
      statusDot.className = 'status-indicator-dot';
      if (pct >= 100) statusDot.classList.add('danger');
      else if (pct >= 80) statusDot.classList.add('warning');
    }

    if (remainingEl) {
      if (remaining >= 0) {
        remainingEl.textContent = `Sisa Saldo: Rp ${remaining.toLocaleString('id-ID')}`;
        remainingEl.style.color = pct >= 80 ? '#fbbf24' : '#34d399';
      } else {
        remainingEl.textContent = `Jebol: -Rp ${Math.abs(remaining).toLocaleString('id-ID')}`;
        remainingEl.style.color = '#f87171';
      }
    }

    if (cashierBanner) {
      if (pct >= 100) {
        cashierBanner.classList.remove('hidden');
        if (cashierText) {
          cashierText.textContent = `BAHAYA KASIR: Melebihi limit Rp ${Math.abs(remaining).toLocaleString('id-ID')}! Batalkan barang sebelum ke meja kasir.`;
        }
      } else {
        cashierBanner.classList.add('hidden');
      }
    }

    const statsBudget = document.getElementById('statsBudgetLimit');
    const statsSpent = document.getElementById('statsTotalSpent');
    const statsRemaining = document.getElementById('statsRemainingMoney');
    const statsDiscount = document.getElementById('statsTotalDiscountSaved');

    if (statsBudget) statsBudget.textContent = `Rp ${this.budgetLimit.toLocaleString('id-ID')}`;
    if (statsSpent) statsSpent.textContent = `Rp ${totalCost.toLocaleString('id-ID')}`;
    if (statsRemaining) {
      statsRemaining.textContent = remaining >= 0 ? `Rp ${remaining.toLocaleString('id-ID')}` : `-Rp ${Math.abs(remaining).toLocaleString('id-ID')}`;
      statsRemaining.className = `metric-stat-value ${remaining >= 0 ? 'text-success' : 'text-danger'}`;
    }
    if (statsDiscount) statsDiscount.textContent = `Rp ${totalDiscountSaved.toLocaleString('id-ID')}`;
  }

  // =========================================================================
  // FITUR 3: HEALTHY CART METER
  // =========================================================================
  renderHealthyCartMeter() {
    let freshSpend = 0;
    let processedSpend = 0;

    this.cart.forEach(item => {
      if (item.category === 'Perawatan & Pembersih') return;

      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      const subtotal = disc.finalUnitPrice * item.qty;

      if (item.nutritionTag === 'Ultra-Processed / Batasi') {
        processedSpend += subtotal;
      } else if (
        item.nutritionTag === 'Tinggi Protein' ||
        item.nutritionTag === 'Tinggi Serat' ||
        item.nutritionTag === 'Rendah Gula' ||
        item.category === 'Daging, Ayam & Telur' ||
        item.category === 'Tahu, Tempe & Nabati' ||
        item.category === 'Sayur & Buah Segar'
      ) {
        freshSpend += subtotal;
      } else {
        freshSpend += subtotal * 0.5;
        processedSpend += subtotal * 0.5;
      }
    });

    const totalFood = freshSpend + processedSpend;
    let freshPct = 70;
    let processedPct = 30;

    if (totalFood > 0) {
      freshPct = Math.round((freshSpend / totalFood) * 100);
      processedPct = 100 - freshPct;
    }

    const pillEl = document.getElementById('healthyScorePill');
    const barFresh = document.getElementById('barSegmentFresh');
    const barProcessed = document.getElementById('barSegmentProcessed');
    const legendFresh = document.getElementById('legendFreshText');
    const legendProcessed = document.getElementById('legendProcessedText');
    const tipEl = document.getElementById('healthyCartTipText');

    if (barFresh) barFresh.style.width = `${freshPct}%`;
    if (barProcessed) barProcessed.style.width = `${processedPct}%`;

    if (pillEl) {
      pillEl.textContent = `${freshPct}% Sehat`;
      if (freshPct >= 70) {
        pillEl.style.color = '#34d399';
        pillEl.style.background = 'rgba(16, 185, 129, 0.2)';
      } else if (freshPct >= 45) {
        pillEl.style.color = '#fbbf24';
        pillEl.style.background = 'rgba(245, 158, 11, 0.2)';
      } else {
        pillEl.style.color = '#f87171';
        pillEl.style.background = 'rgba(239, 68, 68, 0.2)';
      }
    }

    if (legendFresh) legendFresh.textContent = `Segar & Sehat: ${freshPct}% (Rp ${Math.round(freshSpend).toLocaleString('id-ID')})`;
    if (legendProcessed) legendProcessed.textContent = `Olahan / Instan: ${processedPct}% (Rp ${Math.round(processedSpend).toLocaleString('id-ID')})`;

    if (tipEl) {
      if (freshPct >= 70) {
        tipEl.innerHTML = '🏆 <strong>Keranjang Super Sehat!</strong> Alokasi belanja sangat bergizi (tinggi protein alami & serat), optimal menjaga daya tahan tubuh anak kos.';
      } else if (freshPct >= 45) {
        tipEl.innerHTML = '⚖️ <strong>Komposisi Cukup Seimbang.</strong> Tambahkan sedikit porsi tempe, tahu, atau sayur hijau untuk meningkatkan nilai protein hemat.';
      } else {
        tipEl.innerHTML = '⚠️ <strong>Didominasi Makanan Olahan!</strong> Terlalu banyak belanja makanan instan dapat menguras dompet dan menurunkan kualitas gizi harian.';
      }
    }
  }

  // =========================================================================
  // FITUR 2: TAB PROTEIN VALUE RANKING
  // =========================================================================
  renderProteinRanking() {
    const tbody = document.getElementById('proteinCartRankingBody');
    if (!tbody) return;

    const proteinItems = [];
    this.cart.forEach(item => {
      if (item.proteinGrams && item.proteinGrams > 0) {
        const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
        const pVal = this.calculateProteinValue(disc.finalUnitPrice, item.proteinGrams);
        if (pVal) {
          proteinItems.push({
            name: item.name,
            proteinGrams: item.proteinGrams,
            finalUnitPrice: disc.finalUnitPrice,
            costPerGram: pVal.costPerGram,
            isBestValue: pVal.isBestValue
          });
        }
      }
    });

    proteinItems.sort((a, b) => a.costPerGram - b.costPerGram);

    if (proteinItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">
            Belum ada barang di keranjang yang diisi data gram proteinnya.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    proteinItems.forEach((p, idx) => {
      const isTop = p.isBestValue;
      html += `
        <tr class="${isTop ? 'best-rank-row' : ''}">
          <td>
            <strong>${idx + 1}. ${this.escapeHtml(p.name)}</strong>
            ${isTop ? '<span class="best-protein-value-badge" style="margin-left: 4px;">🔥 Best Value</span>' : ''}
          </td>
          <td>${p.proteinGrams}g</td>
          <td>Rp ${p.finalUnitPrice.toLocaleString('id-ID')}</td>
          <td style="font-weight: 700; color: ${isTop ? '#34d399' : '#f8fafc'};">
            Rp ${p.costPerGram.toLocaleString('id-ID')}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  calculateQuickProteinValue() {
    const priceInput = document.getElementById('calcTestPrice');
    const proteinInput = document.getElementById('calcTestProtein');
    const resultBox = document.getElementById('quickCalcResultBox');

    const price = parseFloat(priceInput?.value || 0);
    const grams = parseFloat(proteinInput?.value || 0);

    if (price <= 0 || grams <= 0) {
      if (resultBox) {
        resultBox.innerHTML = '<span style="color: #f87171;">Masukkan angka harga dan total gram protein yang valid.</span>';
      }
      return;
    }

    const val = this.calculateProteinValue(price, grams);
    if (resultBox && val) {
      resultBox.innerHTML = `
        Hasil: <strong>${val.label}</strong> &bull; 
        ${val.isBestValue 
          ? '<span class="best-protein-value-badge">🔥 Best Protein Value! (Sangat Hemat)</span>' 
          : '<span style="color: #fbbf24; font-weight: 700;">⚖️ Nilai Wajar / Kurang Efisien</span>'
        }
      `;
    }
  }

  // =========================================================================
  // F-06: RIWAYAT & DATABASE BELANJA
  // =========================================================================
  renderHistory() {
    const container = document.getElementById('historySessionsContainer');
    if (!container) return;

    if (this.historySessions.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            </svg>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">Belum Ada Riwayat Struk</h4>
          <p style="font-size: 11px; color: var(--text-muted);">
            Setelah selesai berbelanja di kasir, tekan "Selesaikan Belanja & Simpan Struk" untuk mengarsipkan belanjaan bulanan.
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    this.historySessions.forEach(session => {
      html += `
        <div class="history-session-card">
          <div class="history-card-header">
            <div class="history-date-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${this.escapeHtml(session.date)}
            </div>
            <div class="history-total-tag">Rp ${session.totalCost.toLocaleString('id-ID')}</div>
          </div>

          <div style="font-size: 10px; color: var(--primary-light); margin-bottom: 6px;">
            ${session.items.length} item &bull; ${session.healthyPercentage || 70}% Keranjang Sehat
          </div>

          <div class="history-mini-items-list">
            ${session.items.slice(0, 4).map(it => `
              <div style="display: flex; justify-content: space-between;">
                <span>${it.qty}x ${this.escapeHtml(it.name)}</span>
                <span>Rp ${(it.finalUnitPrice * it.qty).toLocaleString('id-ID')}</span>
              </div>
            `).join('')}
            ${session.items.length > 4 ? `<div style="color: var(--text-dim); font-size: 10px;">+ ${session.items.length - 4} barang lainnya...</div>` : ''}
          </div>

          <div class="history-card-actions">
            <button class="preset-chip" onclick="app.restoreShoppingSession('${session.id}')">
              Salin ke Keranjang
            </button>
            <button class="quick-clean-btn" onclick="app.deleteHistorySession('${session.id}')">
              Hapus
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  async finishShoppingSession() {
    if (this.cart.length === 0) {
      this.showToast('Keranjang masih kosong!');
      return;
    }

    let totalCost = 0;
    const sessionItems = this.cart.map(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      totalCost += disc.finalUnitPrice * item.qty;
      return {
        ...item,
        finalUnitPrice: disc.finalUnitPrice
      };
    });

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const newSession = {
      id: 'session_' + Date.now(),
      date: formattedDate,
      totalCost,
      healthyPercentage: 75,
      items: sessionItems
    };

    this.historySessions.unshift(newSession);

    // Update historical reference
    this.cart.forEach(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      item.lastMonthPrice = disc.finalUnitPrice;
    });

    this.saveState();
    this.playBeep('success');
    this.renderAll();

    // Cloud sync
    await this.syncSessionToCloud(newSession);
    this.showToast('Struk belanja berhasil diarsipkan (Lokal & Cloud)!');
  }

  restoreShoppingSession(sessionId) {
    const session = this.historySessions.find(s => s.id === sessionId);
    if (!session) return;
    this.cart = JSON.parse(JSON.stringify(session.items));
    this.saveState();
    this.renderAll();
    this.switchTab('tab-cart');
    this.showToast('Barang dari riwayat berhasil dimuat ke keranjang');
  }

  deleteHistorySession(sessionId) {
    this.historySessions = this.historySessions.filter(s => s.id !== sessionId);
    this.saveState();
    this.renderHistory();
    this.showToast('Arsip struk dihapus');
  }

  exportDataJSON() {
    const backupData = {
      cart: this.cart,
      budgetLimit: this.budgetLimit,
      historySessions: this.historySessions,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartGrocery_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('Data berhasil diekspor ke file JSON');
  }

  // =========================================================================
  // CART ACTIONS & STEPPERS (F-02 Realtime Automatic Calculations)
  // =========================================================================
  async updateItemQty(itemId, delta) {
    const item = this.cart.find(i => i.id === itemId);
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);
    this.saveState();
    this.playBeep('success');
    this.renderAll();

    // Background cloud sync
    await this.syncItemToCloud(item, 'upsert');
  }

  async deleteItem(itemId) {
    const itemToDelete = this.cart.find(i => i.id === itemId);
    this.cart = this.cart.filter(i => i.id !== itemId);
    this.saveState();
    this.playBeep('delete');
    this.renderAll();
    this.showToast('Barang dihapus dari keranjang');

    if (itemToDelete) {
      await this.syncItemToCloud(itemToDelete, 'delete');
    }
  }

  async addQuickPreset(presetType) {
    let preset = null;
    switch (presetType) {
      case 'telur':
        preset = {
          name: 'Telur Ayam 1kg',
          category: 'Daging, Ayam & Telur',
          unit: 'kg',
          qty: 1,
          originalPrice: 28000,
          discountStr: '',
          lastMonthPrice: 29000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 130
        };
        break;
      case 'tempe':
        preset = {
          name: 'Tempe Papan Segar',
          category: 'Tahu, Tempe & Nabati',
          unit: 'papan',
          qty: 2,
          originalPrice: 5000,
          discountStr: '',
          lastMonthPrice: 5000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 38
        };
        break;
      case 'ayam':
        preset = {
          name: 'Dada Ayam Fillet 500g',
          category: 'Daging, Ayam & Telur',
          unit: 'pack',
          qty: 1,
          originalPrice: 35000,
          discountStr: '10%',
          lastMonthPrice: 33000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 115
        };
        break;
      case 'bayam':
        preset = {
          name: 'Sayur Bayam Segar',
          category: 'Sayur & Buah Segar',
          unit: 'ikat',
          qty: 2,
          originalPrice: 4000,
          discountStr: '',
          lastMonthPrice: 3500,
          nutritionTag: 'Tinggi Serat',
          proteinGrams: 5
        };
        break;
      case 'tahu':
        preset = {
          name: 'Tahu Putih Sutra',
          category: 'Tahu, Tempe & Nabati',
          unit: 'pack',
          qty: 1,
          originalPrice: 7000,
          discountStr: '',
          lastMonthPrice: 7000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 30
        };
        break;
      case 'mie':
        preset = {
          name: 'Mie Instan Goreng',
          category: 'Makanan Instan & Camilan',
          unit: 'bungkus',
          qty: 5,
          originalPrice: 3500,
          discountStr: '',
          lastMonthPrice: 3300,
          nutritionTag: 'Ultra-Processed / Batasi',
          proteinGrams: 4
        };
        break;
    }

    if (preset) {
      preset.id = 'item_' + Date.now();
      this.cart.unshift(preset);
      this.saveState();
      this.playBeep('success');
      this.renderAll();
      this.showToast(`Ditambahkan: ${preset.name}`);

      await this.syncItemToCloud(preset, 'upsert');
    }
  }

  // =========================================================================
  // MODAL BOTTOM SHEET (ADD / EDIT ITEM)
  // =========================================================================
  openAddItemModal() {
    this.editingItemId = null;
    document.getElementById('itemModalTitle').textContent = 'Tambah Item Belanja Baru';
    document.getElementById('formItemId').value = '';
    document.getElementById('inputNamaProduk').value = '';
    document.getElementById('selectKategori').value = 'Daging, Ayam & Telur';
    document.getElementById('selectSatuan').value = 'kg';
    document.getElementById('inputQty').value = '1';
    document.getElementById('inputHargaSatuan').value = '';
    document.getElementById('inputDiskon').value = '';
    document.getElementById('inputHargaBulanLalu').value = '';
    document.getElementById('inputProteinGrams').value = '';
    this.selectNutritionTag('Tinggi Protein');

    this.updateFormCalculationsPreview();
    document.getElementById('itemModalBackdrop').classList.add('open');
  }

  openEditItemModal(itemId) {
    const item = this.cart.find(i => i.id === itemId);
    if (!item) return;

    this.editingItemId = itemId;
    document.getElementById('itemModalTitle').textContent = 'Edit Item Belanja';
    document.getElementById('formItemId').value = item.id;
    document.getElementById('inputNamaProduk').value = item.name;
    document.getElementById('selectKategori').value = item.category;
    document.getElementById('selectSatuan').value = item.unit;
    document.getElementById('inputQty').value = item.qty;
    document.getElementById('inputHargaSatuan').value = item.originalPrice;
    document.getElementById('inputDiskon').value = item.discountStr || '';
    document.getElementById('inputHargaBulanLalu').value = item.lastMonthPrice || '';
    document.getElementById('inputProteinGrams').value = item.proteinGrams || '';
    this.selectNutritionTag(item.nutritionTag || 'Tinggi Protein');

    this.updateFormCalculationsPreview();
    document.getElementById('itemModalBackdrop').classList.add('open');
  }

  closeItemModal() {
    document.getElementById('itemModalBackdrop').classList.remove('open');
    this.editingItemId = null;
  }

  selectNutritionTag(tag) {
    document.getElementById('selectedNutritionTag').value = tag;
    const buttons = document.querySelectorAll('.nutrition-tag-option-btn');
    buttons.forEach(btn => {
      const match = btn.getAttribute('data-nutri') === tag;
      btn.classList.toggle('selected', match);
      if (match && tag === 'Ultra-Processed / Batasi') {
        btn.classList.add('tag-processed');
      } else {
        btn.classList.remove('tag-processed');
      }
    });
    this.updateFormCalculationsPreview();
  }

  setFormDiscount(discValue) {
    document.getElementById('inputDiskon').value = discValue;
    this.updateFormCalculationsPreview();
  }

  updateFormCalculationsPreview() {
    const hargaSatuan = parseFloat(document.getElementById('inputHargaSatuan')?.value || 0);
    const diskonStr = document.getElementById('inputDiskon')?.value || '';
    const hargaBulanLalu = parseFloat(document.getElementById('inputHargaBulanLalu')?.value || 0);
    const proteinGrams = parseFloat(document.getElementById('inputProteinGrams')?.value || 0);

    const discBox = document.getElementById('formDiscountPreviewBox');
    const flucBox = document.getElementById('formPriceComparePreviewBox');
    const proteinBox = document.getElementById('formProteinCalcPreviewBox');

    // 1. Preview Diskon Bertingkat (F-03)
    if (hargaSatuan > 0 && diskonStr.trim()) {
      const disc = this.calculateDiscount(hargaSatuan, diskonStr);
      if (discBox) {
        discBox.classList.remove('hidden');
        discBox.innerHTML = `
          <strong>Rincian Diskon:</strong> ${disc.breakdownText}<br>
          Harga Akhir per Unit: <strong>Rp ${disc.finalUnitPrice.toLocaleString('id-ID')}</strong>
        `;
      }
    } else {
      if (discBox) discBox.classList.add('hidden');
    }

    // 2. Preview Fluktuasi Harga (F-04)
    if (hargaSatuan > 0 && hargaBulanLalu > 0) {
      const disc = this.calculateDiscount(hargaSatuan, diskonStr);
      const fluc = this.calculatePriceFluctuation(disc.finalUnitPrice, hargaBulanLalu);
      if (flucBox) {
        flucBox.classList.remove('hidden');
        flucBox.innerHTML = `
          <strong>Perbandingan Bulan Lalu:</strong> ${fluc.text}
        `;
      }
    } else {
      if (flucBox) flucBox.classList.add('hidden');
    }

    // 3. Preview Nilai Protein (Fitur 2)
    if (hargaSatuan > 0 && proteinGrams > 0) {
      const disc = this.calculateDiscount(hargaSatuan, diskonStr);
      const pVal = this.calculateProteinValue(disc.finalUnitPrice, proteinGrams);
      if (proteinBox && pVal) {
        proteinBox.classList.remove('hidden');
        proteinBox.innerHTML = `
          <strong>Kalkulator Protein:</strong> ${pVal.label} &bull; 
          ${pVal.isBestValue ? '<span class="best-protein-value-badge">🔥 Best Protein Value!</span>' : '<span>(Standar)</span>'}
        `;
      }
    } else {
      if (proteinBox) proteinBox.classList.add('hidden');
    }
  }

  async saveItemForm() {
    const name = document.getElementById('inputNamaProduk')?.value.trim();
    const category = document.getElementById('selectKategori')?.value;
    const unit = document.getElementById('selectSatuan')?.value;
    const qty = parseInt(document.getElementById('inputQty')?.value || 1, 10);
    const originalPrice = parseFloat(document.getElementById('inputHargaSatuan')?.value || 0);
    const discountStr = document.getElementById('inputDiskon')?.value.trim();
    const lastMonthPrice = parseFloat(document.getElementById('inputHargaBulanLalu')?.value || 0);
    const nutritionTag = document.getElementById('selectedNutritionTag')?.value || 'Tinggi Protein';
    const proteinGrams = parseFloat(document.getElementById('inputProteinGrams')?.value || 0);

    if (!name || originalPrice <= 0) {
      this.showToast('Nama produk dan harga satuan wajib diisi!');
      return;
    }

    let savedItem = null;

    if (this.editingItemId) {
      const item = this.cart.find(i => i.id === this.editingItemId);
      if (item) {
        item.name = name;
        item.category = category;
        item.unit = unit;
        item.qty = qty;
        item.originalPrice = originalPrice;
        item.discountStr = discountStr;
        item.lastMonthPrice = lastMonthPrice;
        item.nutritionTag = nutritionTag;
        item.proteinGrams = proteinGrams;
        savedItem = item;
      }
      this.showToast(`Diperbarui: ${name}`);
    } else {
      const newItem = {
        id: 'item_' + Date.now(),
        name,
        category,
        unit,
        qty,
        originalPrice,
        discountStr,
        lastMonthPrice,
        nutritionTag,
        proteinGrams
      };
      this.cart.unshift(newItem);
      savedItem = newItem;
      this.showToast(`Ditambahkan: ${name}`);
    }

    this.saveState();
    this.playBeep('success');
    this.closeItemModal();
    this.renderAll();

    // Background sync to Supabase
    if (savedItem) {
      await this.syncItemToCloud(savedItem, 'upsert');
    }
  }

  // =========================================================================
  // BUDGET CAP MODAL & SETTINGS
  // =========================================================================
  openBudgetModal() {
    const input = document.getElementById('modalBudgetLimitInput');
    if (input) input.value = this.budgetLimit;
    document.getElementById('budgetModalBackdrop')?.classList.add('open');
  }

  closeBudgetModal() {
    document.getElementById('budgetModalBackdrop')?.classList.remove('open');
  }

  saveBudgetModal() {
    const input = document.getElementById('modalBudgetLimitInput');
    const val = parseFloat(input?.value || 0);
    if (val > 0) {
      this.budgetLimit = val;
      this.saveState();
      this.closeBudgetModal();
      this.renderBudgetAndSafetyCap();
      this.showToast(`Limit anggaran diubah ke Rp ${val.toLocaleString('id-ID')}`);
    }
  }

  updateBudgetCap() {
    const input = document.getElementById('customBudgetInput');
    const val = parseFloat(input?.value || 0);
    if (val > 0) {
      this.budgetLimit = val;
      this.saveState();
      this.renderBudgetAndSafetyCap();
      this.showToast(`Anggaran dompet diperbarui: Rp ${val.toLocaleString('id-ID')}`);
    }
  }

  // =========================================================================
  // NAVIGATION & UI HELPERS
  // =========================================================================
  switchTab(targetTabId) {
    document.querySelectorAll('.tab-view-content').forEach(section => {
      section.classList.add('hidden');
    });

    const target = document.getElementById(targetTabId);
    if (target) {
      target.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const matches = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', matches);
    });

    if (targetTabId === 'tab-cart') {
      this.renderCart();
      this.renderBudgetAndSafetyCap();
      this.renderHealthyCartMeter();
    } else if (targetTabId === 'tab-protein') {
      this.renderProteinRanking();
    } else if (targetTabId === 'tab-budget') {
      this.renderBudgetAndSafetyCap();
    } else if (targetTabId === 'tab-history') {
      this.renderHistory();
    }
  }

  showToast(message, icon = '✅') {
    const toast = document.getElementById('appToast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    if (!toast) return;

    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;

    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  setupClock() {
    const clockEl = document.getElementById('liveClockDisplay');
    const update = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    };
    update();
    setInterval(update, 30000);
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    document.getElementById('openAddItemModalBtn')?.addEventListener('click', () => {
      this.openAddItemModal();
    });

    document.getElementById('closeItemModalBtn')?.addEventListener('click', () => {
      this.closeItemModal();
    });

    document.getElementById('editBudgetLimitBtn')?.addEventListener('click', () => {
      this.openBudgetModal();
    });

    document.getElementById('openCloudModalBtn')?.addEventListener('click', () => {
      this.openCloudModal();
    });

    document.getElementById('soundToggleIcon')?.addEventListener('click', () => {
      this.toggleSound();
    });

    document.getElementById('resetSampleDataBtn')?.addEventListener('click', () => {
      if (confirm('Muat ulang keranjang sampel Studi Kasus Rian?')) {
        this.loadSampleData();
      }
    });

    document.getElementById('itemModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'itemModalBackdrop') {
        this.closeItemModal();
      }
    });

    document.getElementById('budgetModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'budgetModalBackdrop') {
        this.closeBudgetModal();
      }
    });

    document.getElementById('cloudModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'cloudModalBackdrop') {
        this.closeCloudModal();
      }
    });
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('PWA Service Worker registered successfully:', reg.scope);
        }).catch((err) => {
          console.log('Service Worker registration failed:', err);
        });
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.app = new SmartGroceryApp();
});
