/**
 * SMART GROCERY & NUTRITION TRACKER (STUDI KASUS RIAN - MOBILE PWA)
 * SRS Checklist Implemented:
 * - F-01: Complete Item Logging (Name, Category, Unit, Qty, Unit Price, Last Month Price)
 * - F-02: Realtime Quantity Calculation (Touch-friendly steppers)
 * - F-03: Tiered / Stacked Discount Calculator (e.g. 50%+20% or flat Rp)
 * - F-04: Realtime Price Comparator vs Last Month (↑ Red, ↓ Green, = Gray)
 * - F-05: Budget Safety Cap (Wallet limit, cashier warning banner, remaining cash)
 * - F-06: Shopping History & Database (LocalStorage persistence, receipt archive)
 *
 * Smart Nutrition & Value Tracker Extensions:
 * 1. Healthy Grade Nutri-Score Badges (A=Green, B=Lime, C=Yellow, E=Red)
 * 2. Protein-per-Rupiah Calculator (Rp ... / gram protein & "Best Protein Value!" for < Rp 600/g)
 * 3. Healthy Cart Meter (Segmented mini-bar: Fresh/Healthy % vs Ultra-Processed %)
 */

class SmartGroceryApp {
  constructor() {
    this.STORAGE_KEY_CART = 'smart_grocery_cart_v1';
    this.STORAGE_KEY_BUDGET = 'smart_grocery_budget_v1';
    this.STORAGE_KEY_HISTORY = 'smart_grocery_history_v1';
    this.STORAGE_KEY_SOUND = 'smart_grocery_sound_v1';

    // State
    this.cart = [];
    this.budgetLimit = 250000; // Rp 250.000 (Dompet bulanan Rian)
    this.historySessions = [];
    this.soundEnabled = true;
    this.audioCtx = null;

    // Active editing item ID
    this.editingItemId = null;

    this.init();
  }

  init() {
    this.loadState();
    this.setupEventListeners();
    this.setupClock();
    this.renderAll();
    this.registerPWA();
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
        // High-pitched cheerful double beep (barcode scan feel)
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'warning') {
        // Low double alert beep (over-budget warning)
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
        // Load default realistic dataset reflecting Rian's monthly shopping dilemma
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
        lastMonthPrice: 29500, // Harga turun Rp 1.500 dibanding bln lalu
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 130 // 1kg telur = ~130g protein -> Rp 215/g (Best Value)
      },
      {
        id: 'item_2',
        name: 'Dada Ayam Fillet',
        category: 'Daging, Ayam & Telur',
        unit: 'pack',
        qty: 1,
        originalPrice: 38000,
        discountStr: '10%', // Diskon 10% -> Rp 34.200
        lastMonthPrice: 32000, // Harga naik Rp 2.200 dibanding bln lalu
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 115 // 500g dada ayam = ~115g protein -> Rp 297/g (Best Value)
      },
      {
        id: 'item_3',
        name: 'Tempe Papan Tradisional',
        category: 'Tahu, Tempe & Nabati',
        unit: 'papan',
        qty: 2,
        originalPrice: 5000,
        discountStr: '',
        lastMonthPrice: 5000, // Harga stabil
        nutritionTag: 'Tinggi Protein',
        proteinGrams: 38 // 1 papan tempe = ~38g protein -> Rp 131/g (Juara Protein Hemat)
      },
      {
        id: 'item_4',
        name: 'Bayam Hijau Segar',
        category: 'Sayur & Buah Segar',
        unit: 'ikat',
        qty: 2,
        originalPrice: 4000,
        discountStr: '',
        lastMonthPrice: 3500, // Naik Rp 500
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
        discountStr: '5000', // Potongan nominal Rp 5.000 -> Rp 70.000
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
        discountStr: '50%+20%', // Promo Cuci Gudang bertumpuk! (Kasus Rian)
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

  /**
   * F-03: Menghitung diskon bertingkat (e.g. 50%+20%), diskon persentase tunggal (e.g. 25%),
   * atau diskon nominal (e.g. 15000).
   */
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

    // Kasus 1: Diskon Bertingkat (contoh: "50%+20%" atau "30+10")
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

    // Kasus 2: Diskon Persentase Tunggal (contoh: "25%")
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

    // Kasus 3: Diskon Nominal Langsung (contoh: "15000" atau "Rp 15.000")
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

  /**
   * Fitur 2: Menghitung Protein-per-Rupiah (Value for Health)
   * Rumus: Harga Bersih Akhir / Total Gram Protein
   */
  calculateProteinValue(finalUnitPrice, proteinGrams) {
    if (!proteinGrams || proteinGrams <= 0) return null;
    const costPerGram = Math.round(finalUnitPrice / proteinGrams);
    // Indikator "Best Protein Value!" jika di bawah Rp 600 per gram protein
    const isBestValue = costPerGram < 600;
    return {
      costPerGram,
      isBestValue,
      label: `Rp ${costPerGram.toLocaleString('id-ID')} / g protein`
    };
  }

  /**
   * Fitur 1: Memetakan Tag Nutrisi ke Nutri-Score Visual Grade
   */
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

  /**
   * F-04: Menghitung Fluktuasi Harga vs Bulan Lalu
   */
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
  }

  renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const counterBadge = document.getElementById('cartItemCounter');
    const filterVal = document.getElementById('cartCategoryFilter')?.value || 'all';

    if (!container) return;

    // Filter items based on user selection
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
          
          <!-- Top Row: Name, Category, Nutri-Score Grade Badge -->
          <div class="item-card-top-row">
            <div class="item-main-details">
              <div class="item-name-text">${this.escapeHtml(item.name)}</div>
              <span class="item-category-pill">${this.escapeHtml(item.category)} &bull; ${this.escapeHtml(item.unit)}</span>
            </div>
            
            <!-- Fitur 1: Nutri-Score Corner Badge -->
            <div class="nutri-badge-corner ${nutriScore.class}" title="${nutriScore.label}">
              <span>${nutriScore.icon}</span>
              <span>Grade ${nutriScore.grade}</span>
            </div>
          </div>

          <!-- Price & Discount & Fluctuation Row (F-03, F-04) -->
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

            <!-- F-04: Komparator Harga Realtime vs Bulan Lalu -->
            <div>
              <span class="price-comparator-badge ${fluc.badgeClass}" title="Perbandingan dengan harga bulan lalu">
                ${fluc.text}
              </span>
            </div>
          </div>

          <!-- Fitur 2: Protein-per-Rupiah (Value for Health) Display -->
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

          <!-- Bottom Row: Stepper (F-02), Subtotal, and Quick Actions -->
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

    // Cashier Embarrassment Protection (Titik Kritis SRS Rian)
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

    // Update Tab 3 Metrics
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
  // FITUR 3: HEALTHY CART METER (Ringkasan Keranjang Sehat)
  // Mini-bar persentase: Makanan Segar/Sehat vs Makanan Instan/Olahan
  // =========================================================================
  renderHealthyCartMeter() {
    let freshSpend = 0;
    let processedSpend = 0;

    this.cart.forEach(item => {
      // Exclude non-food (sabun, pembersih) from nutritional composition ratio
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
        // Netral/Umum split 50/50
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

    // Filter items with protein info and calculate cost per gram
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

    // Sort by best value (cheapest protein first)
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

  finishShoppingSession() {
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

    // Update historical reference: Barang-barang yang dibeli ini menjadi referensi "harga bulan lalu" berikutnya!
    this.cart.forEach(item => {
      const disc = this.calculateDiscount(item.originalPrice, item.discountStr);
      item.lastMonthPrice = disc.finalUnitPrice;
    });

    this.saveState();
    this.playBeep('success');
    this.renderAll();
    this.showToast('Struk belanja berhasil diarsipkan ke Riwayat Bulanan!');
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
  updateItemQty(itemId, delta) {
    const item = this.cart.find(i => i.id === itemId);
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);
    this.saveState();
    this.playBeep('success');
    this.renderAll();
  }

  deleteItem(itemId) {
    this.cart = this.cart.filter(i => i.id !== itemId);
    this.saveState();
    this.playBeep('delete');
    this.renderAll();
    this.showToast('Barang dihapus dari keranjang');
  }

  addQuickPreset(presetType) {
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

  saveItemForm() {
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

    if (this.editingItemId) {
      // Edit existing
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
      }
      this.showToast(`Diperbarui: ${name}`);
    } else {
      // Add new
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
      this.showToast(`Ditambahkan: ${name}`);
    }

    this.saveState();
    this.playBeep('success');
    this.closeItemModal();
    this.renderAll();
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
    // Hide all tabs
    document.querySelectorAll('.tab-view-content').forEach(section => {
      section.classList.add('hidden');
    });

    // Show target tab
    const target = document.getElementById(targetTabId);
    if (target) {
      target.classList.remove('hidden');
    }

    // Update bottom nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const matches = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', matches);
    });

    // Refresh renderings for active tab
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
    }, 2400);
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
    // Nav tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // FAB open modal
    document.getElementById('openAddItemModalBtn')?.addEventListener('click', () => {
      this.openAddItemModal();
    });

    // Close modal
    document.getElementById('closeItemModalBtn')?.addEventListener('click', () => {
      this.closeItemModal();
    });

    // Edit budget button
    document.getElementById('editBudgetLimitBtn')?.addEventListener('click', () => {
      this.openBudgetModal();
    });

    // Sound toggle
    document.getElementById('soundToggleIcon')?.addEventListener('click', () => {
      this.toggleSound();
    });

    // Reset sample data button
    document.getElementById('resetSampleDataBtn')?.addEventListener('click', () => {
      if (confirm('Muat ulang keranjang sampel Studi Kasus Rian?')) {
        this.loadSampleData();
      }
    });

    // Close modal on backdrop click
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
