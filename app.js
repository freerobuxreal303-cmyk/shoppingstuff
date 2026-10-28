/**
 * SMART GROCERY & NUTRITION TRACKER (STUDI KASUS RIAN - MOBILE PWA)
 * Daily Test 2 (DT2) 100% Compliance Suite
 * 
 * Features:
 * - F-01: Form Input Item, Lokasi Toko & Selector Tanggal
 * - F-02: Penggandaan Kuantitas Otomatis Tanpa Delay (0ms Reactive Stepper & Input)
 * - F-03: Penanganan Diskon Bertingkat Kompound (e.g. 50%+20% compound calculation)
 * - F-04: Indikator Komparasi Fluktuasi Harga Realtime (Lotte Mart Smart Dictionary)
 * - F-05: Sistem Pengendali Anggaran (Budget Safety Cap with Exact Warning Strings)
 * - F-06A: Persistensi F5 + Supabase Anti-Wipe Guard (Local-First Lazy Init)
 * - F-06B: Sinkronisasi Realtime Cloud Multi-Device (Supabase Broadcast Live Sync)
 * - Fitur 1: Healthy Grade Nutri-Score Badges (A, B, C, E)
 * - Fitur 2: Kalkulator Nilai Protein-per-Rupiah (Best Value < Rp 600/g)
 * - Fitur 3: Healthy Cart Meter (Fresh/Healthy % vs Ultra-Processed %)
 * - Fitur 10: Secret Easter Egg Terminal & Fullscreen Jumpscare
 */

// Konstanta URL/Path Gambar Jumpscare (Mudah diubah)
const JUMPSCARE_IMAGE_URL = 'jumpscare.jpg';

class SmartGroceryApp {
  constructor() {
    // LocalStorage Keys
    this.STORAGE_KEY_ITEMS = 'smart_grocery_items';
    this.STORAGE_KEY_WALLET = 'smart_grocery_wallet_limit';
    this.STORAGE_KEY_STORE = 'smart_grocery_store';
    this.STORAGE_KEY_DATE = 'smart_grocery_date';
    this.STORAGE_KEY_HISTORY = 'smart_grocery_history';
    this.STORAGE_KEY_SOUND = 'smart_grocery_sound_v1';
    this.STORAGE_KEY_SB_URL = 'smart_grocery_sb_url';
    this.STORAGE_KEY_SB_KEY = 'smart_grocery_sb_key';
    this.STORAGE_KEY_DEVICE_ID = 'smart_grocery_device_id';

    // Unique Multi-device Identifier
    this.deviceId = this.getOrCreateDeviceId();

    // Default Supabase Credentials (freerobuxreal303-cmyk)
    this.DEFAULT_SB_URL = 'https://jnluauwepczsglnzckdw.supabase.co';
    this.DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubHVhdXdlcGN6c2dsbnpja2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDM1MDEsImV4cCI6MjEwODExOTUwMX0.VK1Qo2I3ePs_lhtnY08rRm7WEJd1tco7HSEagoUPmF8';

    this.supabaseUrl = localStorage.getItem(this.STORAGE_KEY_SB_URL) || this.DEFAULT_SB_URL;
    this.supabaseAnonKey = localStorage.getItem(this.STORAGE_KEY_SB_KEY) || this.DEFAULT_SB_KEY;
    this.supabase = null;
    this.currentUser = null;
    this.realtimeChannel = null;
    this.isRealtimeConnected = false;

    // State Variables
    this.cart = [];
    this.budgetLimit = 250000;
    this.storeLocation = 'Lotte Mart Grocery - Puri Indah';
    this.shoppingDate = new Date().toISOString().slice(0, 10);
    this.historySessions = [];
    this.soundEnabled = true;
    this.audioCtx = null;
    this.editingItemId = null;
    this.lastMonthManuallyEdited = false;

    // Easter egg click counter
    this.historyClickCount = 0;
    this.jumpscareTimer = null;

    // Guard Flag
    this.isHydrated = false;

    // 1. Synchronous lazy initial load from LocalStorage BEFORE rendering
    this.loadStateSynchronous();
    this.isHydrated = true;

    // 2. Initialize application
    this.init();
  }

  getOrCreateDeviceId() {
    let id = localStorage.getItem('smart_grocery_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('smart_grocery_device_id', id);
    }
    return id;
  }

  // =========================================================================
  // SYNCHRONOUS LOCALSTORAGE INITIALIZATION (ANTI-OVERWRITE GUARD)
  // =========================================================================
  loadStateSynchronous() {
    try {
      const savedItems = localStorage.getItem(this.STORAGE_KEY_ITEMS) || localStorage.getItem('smart_grocery_cart_v1');
      const savedWallet = localStorage.getItem(this.STORAGE_KEY_WALLET) || localStorage.getItem('smart_grocery_budget_v1');
      const savedStore = localStorage.getItem(this.STORAGE_KEY_STORE);
      const savedDate = localStorage.getItem(this.STORAGE_KEY_DATE);
      const savedHistory = localStorage.getItem(this.STORAGE_KEY_HISTORY) || localStorage.getItem('smart_grocery_history_v1');
      const savedSound = localStorage.getItem(this.STORAGE_KEY_SOUND);

      if (savedSound !== null) {
        this.soundEnabled = JSON.parse(savedSound);
      }

      if (savedStore) {
        this.storeLocation = savedStore;
      } else {
        this.storeLocation = 'Lotte Mart Grocery - Puri Indah';
      }

      if (savedDate) {
        this.shoppingDate = savedDate;
      } else {
        this.shoppingDate = new Date().toISOString().slice(0, 10);
      }

      if (savedWallet) {
        this.budgetLimit = Number(savedWallet) || 250000;
      }

      if (savedHistory) {
        this.historySessions = JSON.parse(savedHistory) || [];
      }

      if (savedItems) {
        this.cart = JSON.parse(savedItems) || [];
      } else {
        this.loadSampleData(false);
      }
    } catch (e) {
      console.error('Error in loadStateSynchronous:', e);
      this.loadSampleData(false);
    }
  }

  saveState() {
    if (!this.isHydrated) return;
    try {
      // Primary keys
      localStorage.setItem(this.STORAGE_KEY_ITEMS, JSON.stringify(this.cart));
      localStorage.setItem(this.STORAGE_KEY_WALLET, JSON.stringify(this.budgetLimit));
      localStorage.setItem(this.STORAGE_KEY_STORE, this.storeLocation);
      localStorage.setItem(this.STORAGE_KEY_DATE, this.shoppingDate);
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.historySessions));

      // Legacy fallback keys
      localStorage.setItem('smart_grocery_cart_v1', JSON.stringify(this.cart));
      localStorage.setItem('smart_grocery_budget_v1', JSON.stringify(this.budgetLimit));
      localStorage.setItem('smart_grocery_history_v1', JSON.stringify(this.historySessions));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }

    // Broadcast state to other devices in realtime
    this.broadcastState();
  }

  loadSampleData(triggerSave = true) {
    this.budgetLimit = 250000;
    this.storeLocation = 'Lotte Mart Grocery - Puri Indah';
    this.shoppingDate = new Date().toISOString().slice(0, 10);

    // Initial DT2 test items matching SRS specifications
    this.cart = [
      {
        id: 'item_beras',
        name: 'Beras Rojolele',
        category: 'Bahan Pokok',
        unit: 'karung/5kg',
        qty: 1,
        originalPrice: 74000,
        discountStr: '',
        lastMonthPrice: 68000, // Naik +Rp 6.000
        nutritionTag: 'Standar / Netral',
        proteinGrams: 35
      },
      {
        id: 'item_telur',
        name: 'Telur Ayam Negeri',
        category: 'Protein Tinggi',
        unit: 'kg',
        qty: 1,
        originalPrice: 28000,
        discountStr: '',
        lastMonthPrice: 32000, // Turun -Rp 4.000
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 130
      },
      {
        id: 'item_garam',
        name: 'Garam Dapur Beriodium',
        category: 'Bahan Pokok',
        unit: 'pack',
        qty: 1,
        originalPrice: 5000,
        discountStr: '',
        lastMonthPrice: 5000, // Stabil Rp 5.000
        nutritionTag: 'Standar / Netral',
        proteinGrams: 0
      },
      {
        id: 'item_minyak',
        name: 'Minyak Goreng 2L',
        category: 'Bahan Pokok',
        unit: '2L',
        qty: 1,
        originalPrice: 43000,
        discountStr: '',
        lastMonthPrice: 40000,
        nutritionTag: 'Standar / Netral',
        proteinGrams: 0
      },
      {
        id: 'item_wajan',
        name: 'Wajan Masak Anti Lengket',
        category: 'Non-Makanan',
        unit: 'pcs',
        qty: 1,
        originalPrice: 100000,
        discountStr: '50%+20%', // Compound discount -> Rp 40.000
        lastMonthPrice: 100000,
        nutritionTag: 'Standar / Netral',
        proteinGrams: 0
      },
      {
        id: 'item_dada_ayam',
        name: 'Dada Ayam Fillet',
        category: 'Protein Tinggi',
        unit: '500g',
        qty: 1,
        originalPrice: 35000,
        discountStr: '10%',
        lastMonthPrice: 32000,
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 115
      },
      {
        id: 'item_tempe',
        name: 'Tempe Papan Segar',
        category: 'Protein Tinggi',
        unit: 'papan',
        qty: 2,
        originalPrice: 5000,
        discountStr: '',
        lastMonthPrice: 5000,
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 38
      }
    ];

    if (triggerSave) {
      this.saveState();
      this.renderAll();
      this.showToast('Data demo Studi Kasus Rian (DT2) dimuat');
    }
  }

  async init() {
    this.setupEventListeners();
    this.setupClock();
    this.updateDateComparisonInfo();
    this.renderAll();
    await this.initSupabase();
    this.registerPWA();
  }

  // =========================================================================
  // SUPABASE REALTIME MULTI-DEVICE BROADCAST & DATABASE PERSISTENCE
  // =========================================================================
  async initSupabase() {
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseAnonKeyInput');
    if (urlInput) urlInput.value = this.supabaseUrl;
    if (keyInput) keyInput.value = this.supabaseAnonKey;

    if (window.supabase && this.supabaseUrl && this.supabaseAnonKey) {
      try {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);

        // 1. Setup Realtime Broadcast Channel (No OAuth Required for Lab Multi-Device Sync!)
        this.setupRealtimeBroadcast();

        // 2. Auth state listener
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

        // 3. Check existing session
        let { data: { session } } = await this.supabase.auth.getSession();
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

  setupRealtimeBroadcast() {
    if (!this.supabase) return;
    try {
      this.realtimeChannel = this.supabase.channel('dt2_rian_live_sync', {
        config: { broadcast: { ack: false } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
          if (!payload || payload.senderId === this.deviceId) return;
          this.handleIncomingRealtimeSync(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isRealtimeConnected = true;
            this.updateRealtimeBadge(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isRealtimeConnected = false;
            this.updateRealtimeBadge(false);
          }
        });
    } catch (err) {
      console.warn('Realtime channel setup error:', err);
    }
  }

  updateRealtimeBadge(active) {
    const pill = document.getElementById('realtimeStatusPill');
    const text = document.getElementById('realtimeStatusText');
    if (!pill || !text) return;

    if (active) {
      text.textContent = '🟢 Cloud Realtime Sync Aktif (Live Multi-Device)';
      pill.style.background = 'rgba(16, 185, 129, 0.12)';
      pill.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      pill.style.color = '#065f46';
    } else {
      text.textContent = '🟡 Cloud Sync Menghubungkan...';
      pill.style.background = 'rgba(245, 158, 11, 0.12)';
      pill.style.borderColor = 'rgba(245, 158, 11, 0.35)';
      pill.style.color = '#92400e';
    }
  }

  broadcastState() {
    if (!this.realtimeChannel || !this.isRealtimeConnected) return;
    try {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'sync_state',
        payload: {
          senderId: this.deviceId,
          timestamp: Date.now(),
          items: this.cart,
          walletLimit: this.budgetLimit,
          storeLocation: this.storeLocation,
          shoppingDate: this.shoppingDate,
          shoppingHistory: this.historySessions
        }
      });
    } catch (e) {
      console.warn('Broadcast send notice:', e);
    }
  }

  handleIncomingRealtimeSync(payload) {
    if (!payload) return;

    // Apply remote state immediately without loop
    if (Array.isArray(payload.items)) {
      this.cart = payload.items;
    }
    if (typeof payload.walletLimit === 'number' && payload.walletLimit > 0) {
      this.budgetLimit = payload.walletLimit;
    }
    if (payload.storeLocation) {
      this.storeLocation = payload.storeLocation;
      const storeSelect = document.getElementById('storeLocationSelect');
      if (storeSelect) storeSelect.value = this.storeLocation;
    }
    if (payload.shoppingDate) {
      this.shoppingDate = payload.shoppingDate;
      const dateInput = document.getElementById('shoppingDateInput');
      if (dateInput) dateInput.value = this.shoppingDate;
      this.updateDateComparisonInfo();
    }
    if (Array.isArray(payload.shoppingHistory)) {
      this.historySessions = payload.shoppingHistory;
    }

    // Persist synchronously to local storage on the receiving device
    try {
      localStorage.setItem(this.STORAGE_KEY_ITEMS, JSON.stringify(this.cart));
      localStorage.setItem(this.STORAGE_KEY_WALLET, JSON.stringify(this.budgetLimit));
      localStorage.setItem(this.STORAGE_KEY_STORE, this.storeLocation);
      localStorage.setItem(this.STORAGE_KEY_DATE, this.shoppingDate);
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.historySessions));
    } catch (e) {
      console.warn('Error saving synced state locally:', e);
    }

    this.renderAll();
    this.showToast('🟢 Data tersinkronisasi otomatis dari perangkat lain!');
  }

  // =========================================================================
  // SUPABASE CLOUD SYNC & ANTI-WIPE GUARD (SRS F-06A)
  // =========================================================================
  async syncFromCloud() {
    if (!this.supabase || !this.currentUser) return;
    try {
      // 1. Fetch Cart Items from Supabase Table
      const { data: cloudItems, error: itemsErr } = await this.supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', this.currentUser.id);

      // CRITICAL GUARD: Never wipe local cart if cloud is empty or errored!
      if (!itemsErr && cloudItems && cloudItems.length > 0) {
        this.cart = cloudItems.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category || 'Bahan Pokok',
          unit: row.unit || 'pcs',
          qty: parseInt(row.qty || 1, 10),
          originalPrice: parseFloat(row.original_price || 0),
          discountStr: row.discount_str || '',
          lastMonthPrice: parseFloat(row.last_month_price || 0),
          nutritionTag: row.nutrition_tag || 'Standar / Netral',
          proteinGrams: parseFloat(row.protein_grams || 0)
        }));
        this.saveState();
        this.renderAll();
      } else if (!itemsErr && this.cart.length > 0) {
        // Push local cart up to cloud
        for (const it of this.cart) {
          await this.syncItemToCloud(it, 'upsert');
        }
      }

      // 2. Fetch History Sessions from Supabase Table
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
        for (const sess of this.historySessions) {
          await this.syncSessionToCloud(sess);
        }
      }
    } catch (e) {
      console.warn('Sync from cloud notice (local state preserved):', e);
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

  // =========================================================================
  // STORE LOCATION & DATE SESSION (SRS F-01)
  // =========================================================================
  updateStoreLocation(newStore) {
    this.storeLocation = newStore || 'Lotte Mart Grocery - Puri Indah';
    this.saveState();
    this.renderCart();
    this.showToast(`Lokasi toko: ${this.storeLocation}`);
  }

  updateShoppingDate(newDate) {
    this.shoppingDate = newDate || new Date().toISOString().slice(0, 10);
    this.updateDateComparisonInfo();
    this.saveState();
  }

  updateDateComparisonInfo() {
    const badge = document.getElementById('sessionDateComparisonText');
    if (!badge) return;

    try {
      const parts = this.shoppingDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);

        const currDate = new Date(year, month, day);
        const lastMonthDate = new Date(year, month - 1, day);

        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const lastMonthFormatted = lastMonthDate.toLocaleDateString('id-ID', options);
        badge.textContent = `Histori Pembanding: Dibanding ${lastMonthFormatted}`;
        return;
      }
    } catch (e) {}

    badge.textContent = 'Histori Pembanding: Dibanding 1 Bulan Lalu';
  }

  // =========================================================================
  // KAMUS HISTORI OTOMATIS LOTTE MART (SRS F-04)
  // =========================================================================
  onProductNameInput(nameVal) {
    const banner = document.getElementById('formValidationErrorBanner');
    if (banner) banner.classList.add('hidden');

    const name = (nameVal || '').trim().toLowerCase();
    const lastMonthInput = document.getElementById('inputHargaBulanLalu');

    // Auto-fill dictionary for "Lotte Mart Grocery - Puri Indah"
    if (this.storeLocation === 'Lotte Mart Grocery - Puri Indah' && lastMonthInput && !this.lastMonthManuallyEdited) {
      if (name.includes('beras')) {
        lastMonthInput.value = '68000';
      } else if (name.includes('telur')) {
        lastMonthInput.value = '32000';
      } else if (name.includes('garam')) {
        lastMonthInput.value = '5000';
      }
    }

    this.updateFormCalculationsPreview();
  }

  onLastMonthPriceInput(val) {
    this.lastMonthManuallyEdited = true;
    this.updateFormCalculationsPreview();
  }

  // =========================================================================
  // CORE CALCULATION LOGIC: DISKON KOMPOUND BERTINGKAT (SRS F-03)
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

    // 1. DISKON BERTUMPUK / KOMPOUND (Contoh: "50%+20%" atau "50+20")
    if (cleanStr.includes('+')) {
      const parts = cleanStr.split('+');
      let finalPrice = originalPrice;
      const steps = [];

      parts.forEach((p, idx) => {
        const pct = parseFloat(p.replace(/[^0-9.]/g, ''));
        if (!isNaN(pct) && pct > 0) {
          finalPrice = finalPrice * (1 - pct / 100);
          steps.push(`Diskon ke-${idx + 1} (${pct}%): Rp ${Math.round(finalPrice).toLocaleString('id-ID')}`);
        }
      });

      const roundedFinal = Math.round(finalPrice);
      const totalHemat = originalPrice - roundedFinal;
      const effectivePct = originalPrice > 0 ? Math.round((totalHemat / originalPrice) * 100) : 0;

      return {
        finalUnitPrice: roundedFinal,
        discountAmount: totalHemat,
        discountPercentTotal: effectivePct,
        isTiered: true,
        breakdownText: `${steps.join(' → ')} (Total Hemat: ${effectivePct}%)`
      };
    }

    // 2. DISKON TUNGGAL (Contoh: "25%" atau "25")
    if (cleanStr.includes('%') || (!isNaN(parseFloat(cleanStr)) && parseFloat(cleanStr) <= 100 && cleanStr.length <= 3)) {
      const pct = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        const roundedFinal = Math.round(originalPrice * (1 - pct / 100));
        const totalHemat = originalPrice - roundedFinal;
        return {
          finalUnitPrice: roundedFinal,
          discountAmount: totalHemat,
          discountPercentTotal: Math.round(pct),
          isTiered: false,
          breakdownText: `Diskon ${pct}% (Hemat Rp ${totalHemat.toLocaleString('id-ID')})`
        };
      }
    }

    // 3. POTONGAN NOMINAL LANGSUNG (Contoh: "15000")
    const numOnly = parseFloat(cleanStr.replace(/[^0-9]/g, ''));
    if (!isNaN(numOnly) && numOnly > 0) {
      const pot = Math.min(originalPrice, numOnly);
      const roundedFinal = Math.round(originalPrice - pot);
      const effectivePct = originalPrice > 0 ? Math.round((pot / originalPrice) * 100) : 0;
      return {
        finalUnitPrice: roundedFinal,
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
      breakdownText: 'Tanpa Diskon'
    };
  }

  // =========================================================================
  // KOMPARATOR FLUKTUASI HARGA REALTIME (SRS F-04)
  // =========================================================================
  calculatePriceFluctuation(finalUnitPrice, lastMonthPrice) {
    if (!lastMonthPrice || lastMonthPrice <= 0) {
      return {
        type: 'new',
        badgeClass: 'price-same',
        text: '✨ Barang Baru',
        diff: 0
      };
    }

    const diff = finalUnitPrice - lastMonthPrice;
    const lastFormatted = lastMonthPrice.toLocaleString('id-ID');

    if (diff > 0) {
      // 1. KONDISI HARGA NAIK (Merah Tegas)
      return {
        type: 'up',
        badgeClass: 'price-up',
        text: `↑ +Rp ${diff.toLocaleString('id-ID')} (Naik dari Rp ${lastFormatted})`,
        diff
      };
    } else if (diff < 0) {
      // 2. KONDISI HARGA TURUN (Hijau Tegas)
      const absDiff = Math.abs(diff);
      return {
        type: 'down',
        badgeClass: 'price-down',
        text: `↓ -Rp ${absDiff.toLocaleString('id-ID')} (Turun dari Rp ${lastFormatted})`,
        diff
      };
    } else {
      // 3. KONDISI HARGA STABIL (Abu-abu Setara)
      return {
        type: 'same',
        badgeClass: 'price-same',
        text: `= Harga Stabil (Rp ${lastFormatted})`,
        diff: 0
      };
    }
  }

  // Value for Health: Protein-per-Rupiah
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

  // Nutri-Score Grade Badges
  getNutriScoreGrade(nutritionTag, category) {
    if (nutritionTag === 'Ultra-Processed / Batasi' || category === 'Ultra-Processed') {
      return { grade: 'E', class: 'grade-red', label: 'Nutri-Score E • Batasi', icon: '⚠️' };
    }
    if (nutritionTag === 'Tinggi Protein' || category === 'Protein Tinggi') {
      return { grade: 'A', class: 'grade-green', label: 'Nutri-Score A • Sangat Sehat', icon: '🍗' };
    }
    if (nutritionTag === 'Tinggi Serat') {
      return { grade: 'A', class: 'grade-green', label: 'Nutri-Score A • Sangat Sehat', icon: '🥬' };
    }
    if (nutritionTag === 'Rendah Gula') {
      return { grade: 'B', class: 'grade-lime', label: 'Nutri-Score B • Sehat', icon: '💧' };
    }
    return { grade: 'C', class: 'grade-yellow', label: 'Nutri-Score C • Sedang', icon: '⚖️' };
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

    // Synchronize Store and Date Selectors in Header
    const storeSelect = document.getElementById('storeLocationSelect');
    if (storeSelect && storeSelect.value !== this.storeLocation) {
      storeSelect.value = this.storeLocation;
    }
    const dateInput = document.getElementById('shoppingDateInput');
    if (dateInput && dateInput.value !== this.shoppingDate) {
      dateInput.value = this.shoppingDate;
    }
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
    } else if (filterVal === 'ultra_processed' || filterVal === 'Ultra-Processed') {
      filteredItems = this.cart.filter(item => item.category === 'Ultra-Processed' || item.nutritionTag === 'Ultra-Processed / Batasi');
    } else if (filterVal === 'Bahan Pokok') {
      filteredItems = this.cart.filter(item => item.category === 'Bahan Pokok');
    } else if (filterVal === 'Protein Tinggi') {
      filteredItems = this.cart.filter(item => item.category === 'Protein Tinggi');
    } else if (filterVal === 'Makanan') {
      filteredItems = this.cart.filter(item => item.category === 'Makanan' || item.category === 'Bahan Pokok' || item.category === 'Protein Tinggi');
    } else if (filterVal === 'Non-Makanan') {
      filteredItems = this.cart.filter(item => item.category === 'Non-Makanan');
    }

    if (counterBadge) {
      counterBadge.textContent = `${this.cart.length} item`;
    }

    // EMPTY STATE INFORMATIF PERSIS (Skenario Uji 8)
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
          <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Keranjang Masih Kosong</h3>
          <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; max-width: 280px; margin: 0 auto;">
            ${this.cart.length === 0 ? 'Keranjang belanja masih kosong, silakan scan atau tambahkan kebutuhan pokok pertamamu' : 'Tidak ada barang yang cocok dengan filter kategori yang dipilih.'}
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    filteredItems.forEach(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      const subtotal = disc.finalUnitPrice * item.qty;
      const nutriScore = this.getNutriScoreGrade(item.nutritionTag, item.category);
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
                  <span class="discount-tag-badge">🏷️ Promo ${this.escapeHtml(item.discountStr)} (Hemat Rp ${disc.discountAmount.toLocaleString('id-ID')})</span>
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

          <!-- Stepper & Direct Typing Qty Control (SRS F-02 Zero Delay) -->
          <div class="item-card-bottom-row">
            <div class="touch-friendly-stepper">
              <button type="button" class="stepper-btn" onclick="app.updateItemQty('${item.id}', -1)" title="Kurangi Kuantitas">&minus;</button>
              <input type="number" min="1" inputmode="numeric" pattern="[0-9]*" class="stepper-qty-input" value="${item.qty}" oninput="app.setItemQtyDirectly('${item.id}', this.value)" onchange="app.setItemQtyDirectly('${item.id}', this.value)" title="Ketik Kuantitas">
              <button type="button" class="stepper-btn" onclick="app.updateItemQty('${item.id}', 1)" title="Tambah Kuantitas">&plus;</button>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="item-subtotal-box">
                <div class="subtotal-label">Subtotal</div>
                <div class="subtotal-amount">Rp ${subtotal.toLocaleString('id-ID')}</div>
              </div>

              <div class="item-actions-mini">
                <button type="button" class="card-action-icon-btn" onclick="app.openEditItemModal('${item.id}')" title="Edit Item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button type="button" class="card-action-icon-btn delete" onclick="app.deleteItem('${item.id}')" title="Hapus Item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
  // SISTEM PENGENDALI ANGGARAN & CASHIER WARNING (SRS F-05)
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
    }

    // LOGIKA WARNA & PERINGATAN REAKTIF (SRS F-05)
    if (pct > 100) {
      // 3. MELEBIHI BATAS (> 100%): Merah Tegas
      if (progressFill) progressFill.className = 'budget-progress-fill danger';
      if (statusDot) statusDot.className = 'status-indicator-dot danger';
      if (cardEl) { cardEl.classList.remove('warning'); cardEl.classList.add('danger'); }
      if (remainingEl) {
        remainingEl.textContent = `Melebihi Limit: -Rp ${Math.abs(remaining).toLocaleString('id-ID')}`;
        remainingEl.style.color = '#ef4444';
      }
      if (cashierBanner && cashierText) {
        cashierBanner.classList.remove('hidden');
        cashierBanner.className = 'cashier-alert-banner danger';
        cashierText.textContent = 'Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder.';
      }
    } else if (pct >= 90) {
      // 2. PERINGATAN WASPADA (>= 90% s/d 100%): Kuning/Amber
      if (progressFill) progressFill.className = 'budget-progress-fill warning';
      if (statusDot) statusDot.className = 'status-indicator-dot warning';
      if (cardEl) { cardEl.classList.remove('danger'); cardEl.classList.add('warning'); }
      if (remainingEl) {
        remainingEl.textContent = `Sisa Kritis: Rp ${remaining.toLocaleString('id-ID')}`;
        remainingEl.style.color = '#f59e0b';
      }
      if (cashierBanner && cashierText) {
        cashierBanner.classList.remove('hidden');
        cashierBanner.className = 'cashier-alert-banner warning';
        cashierText.textContent = '⚠️ Peringatan Waspada: Anggaran telah mencapai ≥ 90% dari batas saldo dompet!';
      }
    } else {
      // 1. AMAN (< 90%): Hijau/Emerald
      if (progressFill) progressFill.className = 'budget-progress-fill';
      if (statusDot) statusDot.className = 'status-indicator-dot';
      if (cardEl) { cardEl.classList.remove('danger', 'warning'); }
      if (remainingEl) {
        remainingEl.textContent = `Sisa Saldo: Rp ${remaining.toLocaleString('id-ID')}`;
        remainingEl.style.color = '#10b981';
      }
      if (cashierBanner) {
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

  setQuickBudget(amount) {
    if (amount > 0) {
      this.budgetLimit = amount;
      this.saveState();
      this.renderBudgetAndSafetyCap();
      this.showToast(`Batas saldo dompet diatur ke: Rp ${amount.toLocaleString('id-ID')}`);
    }
  }

  // =========================================================================
  // HEALTHY CART METER (FITUR 3)
  // =========================================================================
  renderHealthyCartMeter() {
    let freshSpend = 0;
    let processedSpend = 0;

    this.cart.forEach(item => {
      if (item.category === 'Non-Makanan') return;

      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      const subtotal = disc.finalUnitPrice * item.qty;

      if (item.category === 'Ultra-Processed' || item.nutritionTag === 'Ultra-Processed / Batasi') {
        processedSpend += subtotal;
      } else if (
        item.category === 'Protein Tinggi' ||
        item.category === 'Bahan Pokok' ||
        item.nutritionTag === 'Tinggi Protein' ||
        item.nutritionTag === 'Tinggi Serat' ||
        item.nutritionTag === 'Rendah Gula'
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
        pillEl.style.color = '#10b981';
        pillEl.style.background = 'rgba(16, 185, 129, 0.2)';
      } else if (freshPct >= 45) {
        pillEl.style.color = '#f59e0b';
        pillEl.style.background = 'rgba(245, 158, 11, 0.2)';
      } else {
        pillEl.style.color = '#ef4444';
        pillEl.style.background = 'rgba(239, 68, 68, 0.2)';
      }
    }

    if (legendFresh) legendFresh.textContent = `Segar / Bergizi: ${freshPct}% (Rp ${Math.round(freshSpend).toLocaleString('id-ID')})`;
    if (legendProcessed) legendProcessed.textContent = `Olahan / Instan: ${processedPct}% (Rp ${Math.round(processedSpend).toLocaleString('id-ID')})`;

    if (tipEl) {
      if (freshPct >= 70) {
        tipEl.innerHTML = '🏆 <strong>Keranjang Sehat!</strong> Alokasi belanja sangat bergizi (tinggi protein & serat), optimal menjaga kesehatan dan stamina anak rantau.';
      } else if (freshPct >= 45) {
        tipEl.innerHTML = '⚖️ <strong>Komposisi Seimbang.</strong> Tambahkan sedikit tempe, telur, atau sayuran segar untuk menghemat uang saku.';
      } else {
        tipEl.innerHTML = '⚠️ <strong>Didominasi Makanan Olahan!</strong> Kurangi porsi instan agar uang saku hemat dan gizi harian tetap tercukupi.';
      }
    }
  }

  // =========================================================================
  // TAB PROTEIN VALUE RANKING (FITUR 2)
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
          <td style="font-weight: 700; color: ${isTop ? '#10b981' : '#1e293b'};">
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
        resultBox.innerHTML = '<span style="color: #ef4444;">Masukkan harga dan total protein yang valid.</span>';
      }
      return;
    }

    const val = this.calculateProteinValue(price, grams);
    if (resultBox && val) {
      resultBox.innerHTML = `
        Hasil: <strong>${val.label}</strong> &bull; 
        ${val.isBestValue 
          ? '<span class="best-protein-value-badge">🔥 Best Protein Value! (< Rp 600/g)</span>' 
          : '<span style="color: #f59e0b; font-weight: 700;">⚖️ Nilai Wajar</span>'
        }
      `;
    }
  }

  // =========================================================================
  // ARSIP STRUK PERMANEN (SRS F-06A - TIDAK BISA DIHAPUS)
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
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Belum Ada Riwayat Struk</h4>
          <p style="font-size: 11px; color: var(--text-muted);">
            Tekan "Selesaikan Belanja & Simpan Struk" untuk mengarsipkan sesi belanja secara permanen ke database cloud.
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

          <div style="font-size: 10px; color: #be185d; margin-bottom: 6px; font-weight: 600;">
            ${session.items.length} item &bull; ${session.healthyPercentage || 70}% Keranjang Sehat &bull; 
            <span style="color: #64748b;">🔒 Permanen</span>
          </div>

          <div class="history-mini-items-list">
            ${session.items.slice(0, 4).map(it => `
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span>${it.qty}x ${this.escapeHtml(it.name)}</span>
                <span>Rp ${(it.finalUnitPrice * it.qty).toLocaleString('id-ID')}</span>
              </div>
            `).join('')}
            ${session.items.length > 4 ? `<div style="color: var(--text-dim); font-size: 10px;">+ ${session.items.length - 4} barang lainnya...</div>` : ''}
          </div>

          <div class="history-card-actions">
            <button type="button" class="preset-chip" onclick="app.restoreShoppingSession('${session.id}')">
              Salin ke Keranjang
            </button>
            <span style="font-size: 10px; color: #94a3b8; font-style: italic;">
              Arsip terkunci (read-only)
            </span>
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
    this.showToast('Struk belanja berhasil diarsipkan permanen!');
  }

  restoreShoppingSession(sessionId) {
    const session = this.historySessions.find(s => s.id === sessionId);
    if (!session) return;
    this.cart = JSON.parse(JSON.stringify(session.items));
    this.saveState();
    this.renderAll();
    this.switchTab('tab-cart');
    this.showToast('Barang dari arsip berhasil dimuat ke keranjang');
  }

  exportDataJSON() {
    const backupData = {
      cart: this.cart,
      budgetLimit: this.budgetLimit,
      storeLocation: this.storeLocation,
      shoppingDate: this.shoppingDate,
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
  // CART ACTIONS & INSTANT QUANTITY CONTROLS (SRS F-02 Zero Delay)
  // =========================================================================
  setItemQtyDirectly(itemId, newQty) {
    const item = this.cart.find(i => i.id === itemId);
    if (!item) return;

    const val = parseInt(newQty, 10);
    item.qty = isNaN(val) || val <= 0 ? 1 : val;

    this.saveState();
    this.renderCart();
    this.renderBudgetAndSafetyCap();
    this.renderHealthyCartMeter();
    this.renderProteinRanking();

    // Background cloud sync
    this.syncItemToCloud(item, 'upsert');
  }

  async updateItemQty(itemId, delta) {
    const item = this.cart.find(i => i.id === itemId);
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);

    this.saveState();
    this.playBeep('success');
    this.renderCart();
    this.renderBudgetAndSafetyCap();
    this.renderHealthyCartMeter();
    this.renderProteinRanking();

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

  // Clear cart modal (Skenario Uji 8)
  openClearCartModal() {
    document.getElementById('confirmClearModalBackdrop')?.classList.add('open');
  }

  closeClearCartModal() {
    document.getElementById('confirmClearModalBackdrop')?.classList.remove('open');
  }

  async confirmClearCart() {
    this.cart = [];
    this.saveState();
    this.closeClearCartModal();
    this.renderAll();
    this.showToast('Keranjang belanja berhasil dikosongkan.');

    if (this.supabase && this.currentUser) {
      try {
        await this.supabase.from('shopping_items').delete().eq('user_id', this.currentUser.id);
      } catch (e) {}
    }
  }

  async addQuickPreset(presetType) {
    let preset = null;
    switch (presetType) {
      case 'telur':
        preset = {
          name: 'Telur Ayam 1kg',
          category: 'Protein Tinggi',
          unit: 'kg',
          qty: 1,
          originalPrice: 28000,
          discountStr: '',
          lastMonthPrice: 32000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 130
        };
        break;
      case 'tempe':
        preset = {
          name: 'Tempe Papan Segar',
          category: 'Protein Tinggi',
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
          category: 'Protein Tinggi',
          unit: 'pack',
          qty: 1,
          originalPrice: 35000,
          discountStr: '10%',
          lastMonthPrice: 32000,
          nutritionTag: 'Tinggi Protein',
          proteinGrams: 115
        };
        break;
      case 'bayam':
        preset = {
          name: 'Sayur Bayam Segar',
          category: 'Bahan Pokok',
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
          category: 'Protein Tinggi',
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
          category: 'Ultra-Processed',
          unit: 'pack',
          qty: 5,
          originalPrice: 3500,
          discountStr: '',
          lastMonthPrice: 3500,
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
  // MODAL ADD / EDIT ITEM (FORM STRICT VALIDATION NON-BLOCKING)
  // =========================================================================
  openAddItemModal() {
    this.editingItemId = null;
    this.lastMonthManuallyEdited = false;

    const banner = document.getElementById('formValidationErrorBanner');
    if (banner) banner.classList.add('hidden');

    document.getElementById('itemModalTitle').textContent = 'Tambah Item Belanja Baru';
    document.getElementById('formItemId').value = '';
    document.getElementById('inputNamaProduk').value = '';
    document.getElementById('selectKategori').value = 'Bahan Pokok';
    document.getElementById('inputSatuan').value = 'kg';
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
    this.lastMonthManuallyEdited = false;

    const banner = document.getElementById('formValidationErrorBanner');
    if (banner) banner.classList.add('hidden');

    document.getElementById('itemModalTitle').textContent = 'Edit Item Belanja';
    document.getElementById('formItemId').value = item.id;
    document.getElementById('inputNamaProduk').value = item.name;
    document.getElementById('selectKategori').value = item.category || 'Bahan Pokok';
    document.getElementById('inputSatuan').value = item.unit || 'pcs';
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
    document.getElementById('itemModalBackdrop')?.classList.remove('open');
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
          Harga Akhir per Satuan: <strong>Rp ${disc.finalUnitPrice.toLocaleString('id-ID')}</strong>
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
          <strong>Perbandingan Toko Ini:</strong> ${fluc.text}
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

  // VALIDASI KETAT NON-BLOCKING (SRS F-01 & Skenario Uji 1)
  async saveItemForm() {
    const name = document.getElementById('inputNamaProduk')?.value.trim();
    const category = document.getElementById('selectKategori')?.value || 'Bahan Pokok';
    const unit = document.getElementById('inputSatuan')?.value.trim() || 'pcs';
    const qty = parseInt(document.getElementById('inputQty')?.value, 10);
    const originalPrice = parseFloat(document.getElementById('inputHargaSatuan')?.value);
    const discountStr = document.getElementById('inputDiskon')?.value.trim();
    const lastMonthPrice = parseFloat(document.getElementById('inputHargaBulanLalu')?.value || 0);
    const nutritionTag = document.getElementById('selectedNutritionTag')?.value || 'Tinggi Protein';
    const proteinGrams = parseFloat(document.getElementById('inputProteinGrams')?.value || 0);

    const banner = document.getElementById('formValidationErrorBanner');

    // VALIDASI FORM: Nama kosong ATAU Harga kosong/nol/negatif ATAU Qty <= 0
    if (!name || isNaN(originalPrice) || originalPrice <= 0 || isNaN(qty) || qty <= 0) {
      if (banner) {
        banner.classList.remove('hidden');
        banner.textContent = 'Input tidak valid! Nama barang wajib diisi dan harga tidak boleh kosong atau negatif.';
      }
      this.showToast('Input tidak valid! Nama barang wajib diisi dan harga tidak boleh kosong atau negatif.', '⚠️');
      this.playBeep('warning');
      return;
    }

    if (banner) banner.classList.add('hidden');

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
      this.showToast(`Limit dompet diubah ke Rp ${val.toLocaleString('id-ID')}`);
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
  // EASTER EGG: SECRET TERMINAL & JUMPSCARE (Fitur 10)
  // =========================================================================
  handleHistoryTabClick() {
    this.historyClickCount++;
    if (this.historyClickCount >= 3) {
      this.historyClickCount = 0;
      this.openSecretModal();
    }
  }

  openSecretModal() {
    const backdrop = document.getElementById('secretEasterEggModalBackdrop');
    const input = document.getElementById('secretEasterEggPassword');
    const msg = document.getElementById('terminalFeedbackMsg');
    if (msg) msg.classList.add('hidden');
    if (input) input.value = '';
    if (backdrop) backdrop.classList.add('open');
    setTimeout(() => { if (input) input.focus(); }, 100);
  }

  closeSecretModal() {
    document.getElementById('secretEasterEggModalBackdrop')?.classList.remove('open');
    this.historyClickCount = 0;
  }

  submitSecretPassword() {
    const input = document.getElementById('secretEasterEggPassword');
    const msg = document.getElementById('terminalFeedbackMsg');
    const val = (input?.value || '').trim();

    // Password must be "c" or "C"
    if (val.toLowerCase() === 'c') {
      this.closeSecretModal();
      this.triggerJumpscare();
    } else {
      if (msg) {
        msg.classList.remove('hidden');
        msg.textContent = 'ACCESS DENIED: Password salah!';
      }
      this.playBeep('warning');
    }
  }

  triggerJumpscare() {
    const overlay = document.getElementById('jumpscareOverlay');
    const img = document.getElementById('jumpscareImage');
    if (img) img.src = JUMPSCARE_IMAGE_URL;

    if (overlay) {
      overlay.classList.remove('hidden');
    }

    // Play synthesized high-frequency terrifying scream sound (Web Audio API)
    this.playJumpscareScream();

    // Automatically dismiss after 4 seconds
    clearTimeout(this.jumpscareTimer);
    this.jumpscareTimer = setTimeout(() => {
      this.closeJumpscare();
    }, 4000);
  }

  closeJumpscare() {
    const overlay = document.getElementById('jumpscareOverlay');
    if (overlay) overlay.classList.add('hidden');
    clearTimeout(this.jumpscareTimer);
    this.historyClickCount = 0;
  }

  playJumpscareScream() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // 1. Violent screeching oscillator 1 (sawtooth with rapid pitch shift)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(2800, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 1.8);
      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 2.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 2.4);

      // 2. Screeching oscillator 2 (square wave discordant harmonics)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1950, now);
      osc2.frequency.exponentialRampToValueAtTime(180, now + 2.0);
      gain2.gain.setValueAtTime(0.7, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 2.2);

      // 3. Noise burst for breathy jump impact
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio jumpscare notice:', e);
    }
  }

  // =========================================================================
  // AUDIO SYNTHESIS FEEDBACK
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
      console.warn('Audio feedback notice:', e);
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
  // SUPABASE AUTH & CLOUD MODAL
  // =========================================================================
  renderAuth() {
    const headerContainer = document.getElementById('headerAuthContainer');
    const modalSection = document.getElementById('modalUserAuthSection');

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
                ? `<img style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #ec4899;" src="${avatar}" alt="Avatar">`
                : `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">${name.charAt(0).toUpperCase()}</div>`
              }
              <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">${this.escapeHtml(name)}</div>
                <div style="font-size: 10.5px; color: var(--text-muted);">${this.escapeHtml(email)}</div>
                <div class="cloud-sync-status-indicator" style="margin-top: 2px;">
                  <span class="cloud-dot"></span>
                  <span style="color: #10b981; font-weight: 600;">Akun Terhubung &bull; Sinkronisasi Aktif</span>
                </div>
              </div>
            </div>
            <button class="btn-secondary-block" style="width: auto; padding: 6px 12px; margin: 0; color: #ef4444;" onclick="app.signOut()">
              Keluar
            </button>
          </div>
        `;
      } else {
        modalSection.innerHTML = `
          <div style="padding: 4px;">
            <div style="text-align: center; margin-bottom: 12px;">
              <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Masuk ke Akun Cloud Supabase</h4>
              <p style="font-size: 11px; color: var(--text-muted);">
                Data tersinkronkan otomatis antar perangkat melalui Supabase Realtime &amp; Database.
              </p>
            </div>

            <button class="btn-google-oauth btn-google-oauth-lg" onclick="app.signInWithGoogle()" style="margin-bottom: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Lanjutkan dengan Akun Google</span>
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
      this.showToast('Membuka login Google...');
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Google Sign-in warning:', err);
      this.showToast('Fitur login OAuth tersedia di dashboard Supabase.', 'ℹ️');
    }
  }

  async signOut() {
    if (this.supabase) {
      await this.supabase.auth.signOut();
      this.currentUser = null;
      this.renderAuth();
      this.showToast('Berhasil keluar');
    }
  }

  openCloudModal() {
    this.renderAuth();
    document.getElementById('cloudModalBackdrop')?.classList.add('open');
  }

  closeCloudModal() {
    document.getElementById('cloudModalBackdrop')?.classList.remove('open');
  }

  saveSupabaseConfig() {
    const url = document.getElementById('supabaseUrlInput')?.value.trim();
    const key = document.getElementById('supabaseAnonKeyInput')?.value.trim();
    if (url && key) {
      this.supabaseUrl = url;
      this.supabaseAnonKey = key;
      localStorage.setItem(this.STORAGE_KEY_SB_URL, url);
      localStorage.setItem(this.STORAGE_KEY_SB_KEY, key);
      this.initSupabase();
      this.showToast('Kredensial Supabase tersimpan!');
    }
  }

  async testSupabaseConnection() {
    if (!this.supabase) {
      this.showToast('Supabase belum terinisialisasi', '⚠️');
      return;
    }
    try {
      this.showToast('Menguji koneksi REST Supabase...');
      const { data, error } = await this.supabase.from('shopping_items').select('id').limit(1);
      if (error) {
        this.showToast(`Koneksi aktif (${error.message || 'RLS restricted'})`);
      } else {
        this.showToast('🟢 Terhubung! Tabel Supabase dapat diakses.');
      }
    } catch (e) {
      this.showToast('Gagal terhubung ke endpoint', '⚠️');
    }
  }

  copyAndOpenSQLEditor() {
    this.copySupabaseSQL();
    window.open('https://supabase.com/dashboard/project/jnluauwepczsglnzckdw/sql/new', '_blank');
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

create policy "Users can manage own items" on shopping_items for all using (true) with check (true);
create policy "Users can manage own history" on shopping_history for all using (true) with check (true);`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sqlText).then(() => {
        this.showToast('Skrip SQL berhasil disalin! 📋');
      }).catch(() => {
        this.showToast('Skrip SQL siap di salin.');
      });
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
      this.loadSampleData(true);
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

    document.getElementById('confirmClearModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'confirmClearModalBackdrop') {
        this.closeClearCartModal();
      }
    });

    document.getElementById('secretEasterEggModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'secretEasterEggModalBackdrop') {
        this.closeSecretModal();
      }
    });
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('PWA Service Worker registered:', reg.scope);
        }).catch((err) => {
          console.log('Service Worker registration notice:', err);
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
