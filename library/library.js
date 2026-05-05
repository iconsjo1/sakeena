const api = typeof browser === 'undefined' ? chrome : browser;

let allAzkar = [];
let builtInAzkar = [];
let customAzkar = [];
let categories = {};
let editingId = null;

async function init() {
  // 1. Initialize i18n
  const { prefs = {} } = await api.storage.local.get('prefs');
  let language = prefs.language;
  if (!language && api.i18n) {
    language = api.i18n.getUILanguage();
  }
  language = language || 'ar';
  if (language.includes('-')) language = language.split('-')[0];
  
  SakeenaI18n.translatePage(language);

  // 2. Fetch Data
  try {
    // Load Built-in
    const response = await fetch('../data/azkar.json');
    const data = await response.json();
    
    builtInAzkar = [];
    Object.keys(data.categories).forEach(catId => {
      const cat = data.categories[catId];
      categories[catId] = cat[language] || cat.ar;
      
      const azkar = cat.azkar.map(zikr => ({
        ...zikr,
        categoryId: catId,
        categoryName: categories[catId],
        isCustom: false
      }));
      builtInAzkar.push(...azkar);
    });

    // Load Custom
    await refreshCustom();
    
    populateFilters(language);
    mergeAndRender(language);

    // 3. Wire Events
    document.getElementById('searchInput').addEventListener('input', () => mergeAndRender(language));
    document.getElementById('categoryFilter').addEventListener('change', () => mergeAndRender(language));
    
    // Modal Events
    document.getElementById('addZikrBtn').addEventListener('click', () => openModal());
    document.getElementById('cancelModal').addEventListener('click', closeModal);
    document.getElementById('saveZikr').addEventListener('click', saveZikr);

  } catch (error) {
    console.error('Failed to load Azkar library:', error);
  }
}

async function refreshCustom() {
  const data = await api.storage.local.get('customAzkar');
  customAzkar = (data.customAzkar || []).map(zikr => ({
    ...zikr,
    categoryName: categories[zikr.categoryId] || zikr.categoryId,
    isCustom: true
  }));
}

function populateFilters(language) {
  const filter = document.getElementById('categoryFilter');
  const modalCat = document.getElementById('modalCategory');
  
  // Clear existing
  while (filter.children.length > 2) filter.removeChild(filter.lastChild);
  modalCat.innerHTML = '';

  Object.keys(categories).forEach(id => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = categories[id];
    filter.appendChild(option.cloneNode(true));
    modalCat.appendChild(option);
  });
}

function mergeAndRender(language) {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const catFilter = document.getElementById('categoryFilter').value;

  allAzkar = [...builtInAzkar, ...customAzkar];

  const filtered = allAzkar.filter(item => {
    const matchesSearch = 
      item.text.toLowerCase().includes(searchTerm) || 
      (item.en && item.en.toLowerCase().includes(searchTerm));
    
    let matchesCat = true;
    if (catFilter === 'custom') {
      matchesCat = item.isCustom;
    } else if (catFilter !== 'all') {
      matchesCat = item.categoryId === catFilter;
    }
    
    return matchesSearch && matchesCat;
  });

  renderAzkar(filtered, language);
}

function renderAzkar(items, language) {
  const grid = document.getElementById('azkarGrid');
  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p data-i18n="noResults">No results found.</p></div>`;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="zikr-card" data-id="${item.id}">
      <div class="zikr-text">${item.text}</div>
      ${item.en ? `<div class="zikr-en">${item.en}</div>` : ''}
      <div class="zikr-meta">
        <div>
          <span class="category-tag">${item.categoryName}</span>
          ${item.isCustom ? `<span class="custom-badge" data-i18n="customTag">مخصص</span>` : ''}
        </div>
        ${item.isCustom ? `
          <div class="zikr-actions">
            <button class="action-btn edit-zikr" title="تعديل">✏️</button>
            <button class="action-btn delete-zikr" title="حذف">🗑️</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Wire actions
  grid.querySelectorAll('.edit-zikr').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.zikr-card').dataset.id;
      openModal(id);
    });
  });

  grid.querySelectorAll('.delete-zikr').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.zikr-card').dataset.id;
      if (confirm('هل أنت متأكد من حذف هذا الذكر؟')) {
        await deleteZikr(id);
      }
    });
  });
}

function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('zikrModal');
  const title = document.getElementById('modalTitle');
  
  if (id) {
    const zikr = customAzkar.find(z => z.id === id);
    document.getElementById('modalZikrText').value = zikr.text;
    document.getElementById('modalZikrEn').value = zikr.en || '';
    document.getElementById('modalCategory').value = zikr.categoryId;
    document.getElementById('modalWeight').value = zikr.weight || 3;
    title.textContent = 'تعديل الذكر';
  } else {
    document.getElementById('modalZikrText').value = '';
    document.getElementById('modalZikrEn').value = '';
    document.getElementById('modalCategory').selectedIndex = 0;
    document.getElementById('modalWeight').value = 3;
    title.textContent = 'إضافة ذكر جديد';
  }
  
  modal.hidden = false;
}

function closeModal() {
  document.getElementById('zikrModal').hidden = true;
  editingId = null;
}

async function saveZikr() {
  const text = document.getElementById('modalZikrText').value.trim();
  const en = document.getElementById('modalZikrEn').value.trim();
  const categoryId = document.getElementById('modalCategory').value;
  const weight = parseInt(document.getElementById('modalWeight').value);

  if (!text) return alert('يرجى إدخال نص الذكر');

  const { customAzkar = [] } = await api.storage.local.get('customAzkar');
  
  if (editingId) {
    const index = customAzkar.findIndex(z => z.id === editingId);
    if (index !== -1) {
      customAzkar[index] = { ...customAzkar[index], text, en, categoryId, weight };
    }
  } else {
    const newZikr = {
      id: 'c' + Date.now(),
      text,
      en,
      categoryId,
      weight,
      createdAt: Date.now()
    };
    customAzkar.push(newZikr);
  }

  await api.storage.local.set({ customAzkar });
  await refreshCustom();
  mergeAndRender();
  closeModal();
}

async function deleteZikr(id) {
  const { customAzkar = [] } = await api.storage.local.get('customAzkar');
  const filtered = customAzkar.filter(z => z.id !== id);
  await api.storage.local.set({ customAzkar: filtered });
  await refreshCustom();
  mergeAndRender();
}

init();
