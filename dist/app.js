const money = new Intl.NumberFormat('ko-KR');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const images = typeof PACKAGED_IMAGES === 'undefined' ? {} : PACKAGED_IMAGES;
const languageKey = 'brandplanning-language';
const localeFields = ['', 'aria-label', 'alt', 'placeholder', 'aria-roledescription', 'title'];
let language = 'ko';
try {
  if (localStorage.getItem(languageKey) === 'en') language = 'en';
} catch { /* Continue with the default language. */ }

function localizedValue(node, attribute) {
  return attribute ? node.getAttribute(attribute) : node.textContent;
}

function showLocalized(node, korean, english, attribute) {
  const value = language === 'en' ? english : korean;
  if (attribute) node.setAttribute(attribute, value);
  else node.textContent = value;
}

function setLocalized(node, korean, english = korean, attribute = '') {
  const suffix = attribute ? '-' + attribute : '';
  node.setAttribute('data-ko' + suffix, korean);
  node.setAttribute('data-en' + suffix, english);
  showLocalized(node, korean, english, attribute);
}

function applyLanguage(root) {
  for (const attribute of localeFields) {
    const suffix = attribute ? '-' + attribute : '';
    for (const node of root.querySelectorAll('[data-en' + suffix + ']')) {
      const korean = node.getAttribute('data-ko' + suffix) ?? localizedValue(node, attribute);
      node.setAttribute('data-ko' + suffix, korean);
      showLocalized(node, korean, node.getAttribute('data-en' + suffix), attribute);
    }
  }
}

function translateInterface() {
  document.documentElement.lang = language;
  applyLanguage(document);
  document.querySelectorAll('template').forEach(template => applyLanguage(template.content));
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
}

translateInterface();

function asset(name) {
  return images[name] || 'assets/' + name;
}

const deliveryTitles = { overseas: '해외', domestic: '국내' };
const deliveryTitlesEn = { overseas: 'Overseas', domestic: 'Domestic' };
const brandNames = new Map([
  ['BRUNELLO CUCINELLI', '브루넬로 쿠치넬리'], ['MONCLER', '몽클레르'],
  ['HERNO', '에르노'], ['BURBERRY', '버버리'], ['FENDI', '펜디'],
  ['LOEWE', '로에베'], ['MAX MARA', '막스마라'], ["'S MAX MARA", '에스 막스마라'],
  ['MAX MARA STUDIO', '막스마라 스튜디오'], ['WEEKEND MAX MARA', '위켄드 막스마라'],
  ['BOTTEGA VENETA', '보테가 베네타'],
]);
const maxMaraBrands = ['MAX MARA', "'S MAX MARA", 'MAX MARA STUDIO', 'WEEKEND MAX MARA'];
const maxMaraGroup = 'max-mara-group';
const genderOrder = ['남성', '여성'];
const categoryOrder = ['아우터', '상의', '하의', '가방', '신발', '패션잡화', '주얼리', '스키웨어'];
const facetTitlesEn = {
  남성: 'Men', 여성: 'Women', 아우터: 'Outerwear', 상의: 'Tops', 하의: 'Bottoms',
  가방: 'Bags', 신발: 'Shoes', 패션잡화: 'Accessories', 주얼리: 'Jewelry', 스키웨어: 'Skiwear',
};

function brandHref(brand) {
  if (brand === maxMaraGroup) return '#brand/max-mara';
  if (brand === 'MAX MARA') return '#brand/max-mara-main';
  return '#brand/' + brand.toLowerCase().replace(/[^a-z ]/g, '').replaceAll(' ', '-');
}

function brandTitle(brand) {
  return brand === maxMaraGroup ? '막스마라' : brandNames.get(brand);
}

function brandTitleEn(brand) {
  return brand === maxMaraGroup ? 'Max Mara' : brand;
}

const brandRoutes = new Map([maxMaraGroup, ...brandNames.keys()].map(brand => [brandHref(brand), brand]));

function won(price) {
  return money.format(price) + '원';
}

function setPrice(node, price) {
  setLocalized(node, won(price), '₩' + money.format(price));
}

function countEn(count) {
  return money.format(count) + (count === 1 ? ' item' : ' items');
}

function describeDelivery(badge, product) {
  badge.dataset.delivery = product.delivery;
  setLocalized(badge, deliveryTitles[product.delivery], deliveryTitlesEn[product.delivery]);
  setLocalized(badge, deliveryTitles[product.delivery] + '배송', deliveryTitlesEn[product.delivery] + ' shipping', 'aria-label');
}

function productCard(product) {
  const item = document.getElementById('product-template').content.firstElementChild.cloneNode(true);
  item.dataset.product = product.id;
  item.querySelector('a').href = '#product/' + product.id;
  item.querySelector('img').src = asset(product.image);
  item.querySelector('.product-brand').textContent = product.brand;
  setLocalized(item.querySelector('.product-name'), product.name, PRODUCT_NAMES_EN[product.id]);
  setPrice(item.querySelector('.product-price'), product.price);
  if (product.sizes.length) item.querySelector('.product-size').textContent = product.sizes.join(' · ');
  else setLocalized(item.querySelector('.product-size'), '품절', 'Sold out');
  describeDelivery(item.querySelector('.delivery'), product);
  return item;
}

document.querySelectorAll('[data-catalog]').forEach((list) => {
  list.replaceChildren(...CATALOG[list.dataset.catalog].map(productCard));
});

const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panel-title');
const panelBody = document.getElementById('panel-body');
const searchPanel = document.getElementById('search-panel');
const searchLaunch = document.getElementById('search-launch');
const searchInput = document.getElementById('search');
const searchKeywords = document.getElementById('search-keywords');
const searchResults = document.getElementById('search-results');
const recentTerms = [];
const headerShell = document.querySelector('.site-header-shell');
const siteHeader = headerShell.querySelector('.site-header');

function openPanel(title, contents, englishTitle = title) {
  setLocalized(panelTitle, title, englishTitle);
  panelBody.replaceChildren(contents);
  if (!panel.open) panel.showModal();
  scheduleReview();
}

function description(text, english = text) {
  const p = document.createElement('p');
  setLocalized(p, text, english);
  return p;
}

const allProducts = [...new Map(Object.values(CATALOG).flat().map(product => [product.id, product])).values()];
const byId = new Map(allProducts.map(product => [product.id, product]));
const collectionTitles = {
  all: '브랜드', men: '남성', women: '여성', weekly: '위클리',
  classic: '클래식', domestic: '국내배송', best: 'BEST', new: 'NEW', 'max-mara': '막스마라',
};
const collectionTitlesEn = {
  all: 'Brands', men: 'Men', women: 'Women', weekly: 'Weekly',
  classic: 'Classic', domestic: 'Domestic shipping', best: 'BEST', new: 'NEW', 'max-mara': 'Max Mara',
};

function showCatalogResults(term) {
  const query = term.toLocaleLowerCase('ko-KR').replace(/\s/g, '');
  const matching = allProducts.filter(product => (
    ((query === '막스마라' || query === 'maxmara') && maxMaraBrands.includes(product.brand))
    || [product.brand, product.name, PRODUCT_NAMES_EN[product.id], brandNames.get(product.brand)]
      .some(text => text?.toLocaleLowerCase('ko-KR').replace(/\s/g, '').includes(query))
  ));

  searchInput.value = term;
  const duplicate = recentTerms.indexOf(term);
  if (duplicate !== -1) recentTerms.splice(duplicate, 1);
  recentTerms.unshift(term);
  if (recentTerms.length > 5) recentTerms.pop();
  searchKeywords.hidden = true;
  searchResults.hidden = false;
  const count = matching.length;
  setLocalized(document.getElementById('search-count'),
    count ? `‘${term}’ 검색 결과 ${count}개` : `‘${term}’에 해당하는 상품이 없어요.`,
    count ? `${countEn(count)} for “${term}”` : `No products match “${term}”.`);
  document.getElementById('search-products').replaceChildren(...matching.map(productCard));
}

function positionSearchPanel() {
  searchPanel.style.setProperty('--search-top', Math.max(0, siteHeader.getBoundingClientRect().bottom) + 'px');
}

function updateSiteHeader() {
  const compact = window.scrollY >= headerShell.offsetHeight;
  if (compact === siteHeader.classList.contains('is-compact')) return;
  if (compact) headerShell.style.height = headerShell.offsetHeight + 'px';
  siteHeader.classList.toggle('is-compact', compact);
  if (!compact) headerShell.style.removeProperty('height');
  if (searchPanel.open) positionSearchPanel();
}

window.addEventListener('scroll', updateSiteHeader, { passive: true });
window.addEventListener('resize', () => {
  siteHeader.classList.remove('is-compact');
  headerShell.style.removeProperty('height');
  updateSiteHeader();
  if (searchPanel.open) positionSearchPanel();
});

function openSearch() {
  searchInput.value = '';
  searchKeywords.hidden = false;
  searchResults.hidden = true;
  const recent = document.getElementById('search-recent');
  recent.replaceChildren(...recentTerms.map(term => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.searchTerm = term;
    button.textContent = term;
    return button;
  }));
  if (!recentTerms.length) recent.append(description('최근 검색어가 없어요.', 'No recent searches.'));
  setMobileNav(false);
  positionSearchPanel();
  searchPanel.returnValue = '';
  searchPanel.showModal();
  document.documentElement.classList.add('search-open');
  searchLaunch.setAttribute('aria-expanded', 'true');
  searchInput.focus({ preventScroll: true });
  scheduleReview();
}

searchLaunch.addEventListener('click', openSearch);
document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (query) showCatalogResults(query);
});
searchPanel.addEventListener('click', event => {
  const suggestion = event.target.closest('[data-search-term]');
  if (suggestion) showCatalogResults(suggestion.textContent);
  const productLink = event.target.closest('a[href^="#product/"]');
  if (productLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    searchPanel.close('product');
  }
  if (event.target === searchPanel && event.clientY < searchPanel.getBoundingClientRect().top) searchPanel.close();
  else if (event.target === searchPanel && event.clientY > searchPanel.getBoundingClientRect().bottom) searchPanel.close();
});
searchPanel.addEventListener('close', () => {
  document.documentElement.classList.remove('search-open');
  searchLaunch.setAttribute('aria-expanded', 'false');
  if (searchPanel.returnValue !== 'product') searchLaunch.focus({ preventScroll: true });
  scheduleReview();
});
const languageSwitch = document.getElementById('language-switch');
const languageToggle = languageSwitch.querySelector('summary');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const siteNav = document.getElementById('site-nav');
const accountTitles = { 로그인: 'Log in', 회원가입: 'Sign up', 마이페이지: 'My account' };

function setMobileNav(open) {
  siteHeader.classList.toggle('is-menu-open', open);
  mobileMenuToggle.setAttribute('aria-expanded', String(open));
}

languageSwitch.addEventListener('toggle', () => {
  if (languageSwitch.open) setMobileNav(false);
});
languageSwitch.querySelectorAll('[data-language]').forEach(button => {
  button.addEventListener('click', () => {
    language = button.dataset.language;
    try { localStorage.setItem(languageKey, language); } catch { /* Apply to this page. */ }
    translateInterface();
    updatePageTitle();
    languageSwitch.open = false;
    languageToggle.focus({ preventScroll: true });
  });
});
mobileMenuToggle.addEventListener('click', event => {
  languageSwitch.open = false;
  const open = !siteHeader.classList.contains('is-menu-open');
  setMobileNav(open);
  if (open && event.detail === 0) siteNav.querySelector('a').focus({ preventScroll: true });
});
siteNav.addEventListener('click', event => {
  if (event.target.closest('a')) setMobileNav(false);
});
matchMedia('(max-width: 520px)').addEventListener('change', () => setMobileNav(false));
document.addEventListener('click', event => {
  if (languageSwitch.open && !languageSwitch.contains(event.target)) languageSwitch.open = false;
  if (!siteNav.contains(event.target) && !mobileMenuToggle.contains(event.target)) setMobileNav(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (languageSwitch.open) {
    languageSwitch.open = false;
    languageToggle.focus({ preventScroll: true });
  } else if (siteHeader.classList.contains('is-menu-open')) {
    setMobileNav(false);
    mobileMenuToggle.focus({ preventScroll: true });
  }
});

function showAccount(title) {
  openPanel(title, description('실제 회원과 주문 기능은 자사몰 연결 후 이용할 수 있어요.',
    'Account and order services will be available when the store is connected.'), accountTitles[title]);
}

document.querySelectorAll('[data-account]').forEach(button => {
  button.addEventListener('click', () => showAccount(button.dataset.account));
});
document.getElementById('mobile-account').addEventListener('click', () => {
  setMobileNav(false);
  const actions = document.createElement('div');
  actions.className = 'mobile-account-actions';
  for (const [korean, english] of Object.entries(accountTitles)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button outline';
    setLocalized(button, korean, english);
    button.addEventListener('click', () => {
      showAccount(korean);
      panel.querySelector('button').focus({ preventScroll: true });
    });
    actions.append(button);
  }
  openPanel('계정 메뉴', actions, 'Account menu');
});

const home = document.getElementById('main');
const storePage = document.getElementById('store-page');
const productPage = document.getElementById('product-page');
const collectionPage = document.getElementById('collection-page');
const storeParent = document.getElementById('store-parent');
const collectionTitle = document.getElementById('collection-title');
const collectionList = document.getElementById('collection-products');
const collectionFilters = document.getElementById('collection-filters');
const collectionSort = document.getElementById('collection-sort');
const collectionBrands = document.getElementById('collection-brands');
const collectionGenders = document.getElementById('collection-genders');
const collectionCategories = document.getElementById('collection-categories');
const collectionBrandLines = document.getElementById('collection-brand-lines');
const brandDirectory = document.getElementById('brand-directory');
const brandDirectoryTitle = document.getElementById('brand-directory-title');
const magazinePage = document.getElementById('magazine-page');
const magazinePageTitle = document.getElementById('magazine-page-title');
const noticePage = document.getElementById('notice-page');
const noticePageTitle = document.getElementById('notice-page-title');
const cartPage = document.getElementById('cart-page');
const cartTitle = document.getElementById('cart-title');
const editorialArticle = document.getElementById('editorial-article');
const editorialTitle = document.getElementById('editorial-title');
const detailForm = document.getElementById('detail-form');
const detailQuantity = document.getElementById('detail-quantity');
const quantityDecrease = document.getElementById('quantity-decrease');
const quantityIncrease = document.getElementById('quantity-increase');
const detailName = document.getElementById('detail-name');
const detailStatus = document.getElementById('detail-status');
const detailCartLink = document.getElementById('detail-cart-link');
const detailBuyNow = document.getElementById('detail-buy-now');
const skipLink = document.querySelector('.skip-link');
const siteTitle = document.title;
let currentProduct;
let collectionProducts = [];
let currentCollectionHash;
let detailReturnHash;

function filterCheckbox(title, value = '', checked = false, field = 'brand', english = title) {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  if (value) {
    checkbox.name = field;
    checkbox.value = value;
  }
  checkbox.defaultChecked = checked;
  const name = document.createElement('span');
  setLocalized(name, title, english);
  label.append(checkbox, name);
  return label;
}

function updateCollection() {
  const data = new FormData(collectionFilters);
  const brands = new Set(data.getAll('brand'));
  const genders = new Set(data.getAll('gender'));
  const categories = new Set(data.getAll('category'));
  const group = collectionBrands.querySelector('.brand-group');
  if (group) {
    const groupSelector = group.querySelector('[data-brand-parent]');
    const subBrands = [...group.querySelectorAll('input[name="brand"]')];
    const selectedCount = subBrands.filter(checkbox => checkbox.checked).length;
    groupSelector.checked = selectedCount === subBrands.length;
    groupSelector.indeterminate = selectedCount > 0 && !groupSelector.checked;
  }
  const products = collectionProducts.filter(product => (
    (!brands.size || brands.has(product.brand))
    && (!genders.size || genders.has(product.gender))
    && (!categories.size || categories.has(product.category))
  ));
  if (collectionSort.value === 'low') products.sort((a, b) => a.price - b.price);
  if (collectionSort.value === 'high') products.sort((a, b) => b.price - a.price);
  collectionList.replaceChildren(...products.map(productCard));
  setLocalized(document.getElementById('collection-count'), '상품 ' + products.length + '개', countEn(products.length));
  document.getElementById('collection-empty').hidden = products.length > 0;
}

function renderBrandFilters(initialBrand) {
  const availableBrands = new Set(collectionProducts.map(product => product.brand));
  for (const [brand, title] of brandNames) {
    if (brand === 'MAX MARA') {
      const subBrands = maxMaraBrands.filter(value => availableBrands.has(value));
      if (!subBrands.length) continue;
      const block = document.createElement('div');
      block.className = 'brand-group';
      const parent = filterCheckbox(title, '', false, 'brand', brand);
      parent.firstElementChild.dataset.brandParent = '';
      const options = document.createElement('div');
      options.className = 'brand-group-options';
      options.setAttribute('role', 'group');
      setLocalized(options, '막스마라 하위 브랜드', 'Max Mara lines', 'aria-label');
      for (const value of subBrands) {
        const option = filterCheckbox(brandNames.get(value), value, value === initialBrand, 'brand', value);
        if (value === 'MAX MARA') setLocalized(option.firstElementChild, '막스마라 단일 브랜드', 'Max Mara main line', 'aria-label');
        options.append(option);
      }
      block.append(parent, options);
      collectionBrands.append(block);
    } else if (!maxMaraBrands.includes(brand) && availableBrands.has(brand)) {
      collectionBrands.append(filterCheckbox(title, brand, brand === initialBrand, 'brand', brand));
    }
  }
}

function renderProductFacet(container, field, order, enabled) {
  const values = enabled ? order.filter(value => collectionProducts.some(product => product[field] === value)) : [];
  container.replaceChildren(...values.map(value => filterCheckbox(value, value, false, field, facetTitlesEn[value])));
  container.parentElement.hidden = !values.length;
}

function showCollection(group, initialBrand, scopedBrand) {
  if (scopedBrand === maxMaraGroup) collectionProducts = allProducts.filter(product => maxMaraBrands.includes(product.brand));
  else if (scopedBrand) collectionProducts = allProducts.filter(product => product.brand === scopedBrand);
  else if (group === 'all') collectionProducts = allProducts;
  else if (group === 'men' || group === 'women') {
    const gender = group === 'men' ? '남성' : '여성';
    collectionProducts = allProducts.filter(product => product.gender === gender);
  } else collectionProducts = CATALOG[group];

  collectionBrands.replaceChildren();
  collectionBrands.parentElement.hidden = Boolean(scopedBrand);
  if (!scopedBrand) renderBrandFilters(initialBrand);
  renderProductFacet(collectionGenders, 'gender', genderOrder, Boolean(scopedBrand));
  renderProductFacet(collectionCategories, 'category', categoryOrder, Boolean(scopedBrand));

  const isMaxMara = scopedBrand === maxMaraGroup || maxMaraBrands.includes(scopedBrand);
  collectionBrandLines.hidden = !isMaxMara;
  collectionBrandLines.replaceChildren();
  if (isMaxMara) {
    for (const line of [maxMaraGroup, ...maxMaraBrands]) {
      const link = document.createElement('a');
      link.href = brandHref(line);
      setLocalized(link, line === maxMaraGroup ? '막스마라 전체' : brandTitle(line),
        line === maxMaraGroup ? 'All Max Mara lines' : brandTitleEn(line));
      if (line === scopedBrand) link.setAttribute('aria-current', 'page');
      collectionBrandLines.append(link);
    }
  }
  collectionSort.value = 'recommended';
  collectionFilters.closest('details').open = true;
  setLocalized(collectionTitle, scopedBrand ? brandTitle(scopedBrand) : collectionTitles[group],
    scopedBrand ? brandTitleEn(scopedBrand) : collectionTitlesEn[group]);
  document.getElementById('collection-deadline').hidden = group !== 'weekly';
  storeParent.href = scopedBrand ? '#brands/all' : location.hash;
  setLocalized(storeParent, scopedBrand ? '브랜드' : collectionTitles[group], scopedBrand ? 'Brands' : collectionTitlesEn[group]);
  if (scopedBrand) storeParent.removeAttribute('aria-current');
  else storeParent.setAttribute('aria-current', 'page');
  updateCollection();
}

collectionFilters.addEventListener('change', event => {
  const checkbox = event.target;
  if (checkbox.matches('[data-brand-parent]')) {
    checkbox.closest('.brand-group').querySelectorAll('input[name="brand"]').forEach(child => {
      child.checked = checkbox.checked;
    });
  }
  updateCollection();
});
collectionFilters.addEventListener('reset', event => {
  event.preventDefault();
  collectionFilters.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  collectionSort.value = 'recommended';
  updateCollection();
});

document.querySelectorAll('[data-brand]').forEach(button => {
  button.addEventListener('click', () => { location.hash = brandHref(button.dataset.brand); });
});
document.querySelector('[data-brand-group="max-mara"]').addEventListener('click', () => {
  location.hash = brandHref(maxMaraGroup);
});

const availableBrands = new Set(allProducts.map(product => product.brand));
const directoryBrands = [...brandNames.keys()]
  .filter(brand => availableBrands.has(brand) && (brand === 'MAX MARA' || !maxMaraBrands.includes(brand)))
  .sort((a, b) => a.localeCompare(b, 'en'));
const brandAlphabet = document.getElementById('brand-alphabet');
for (const letter of new Set(directoryBrands.map(brand => brand[0]))) {
  const section = document.createElement('section');
  section.className = 'brand-letter';
  const heading = document.createElement('h2');
  heading.textContent = letter;
  const list = document.createElement('ul');
  for (const brand of directoryBrands.filter(name => name.startsWith(letter))) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = brandHref(brand === 'MAX MARA' ? maxMaraGroup : brand);
    const name = document.createElement('strong');
    name.textContent = brand;
    const translated = document.createElement('span');
    translated.textContent = brandNames.get(brand);
    translated.lang = 'ko';
    link.append(name, translated);
    item.append(link);
    list.append(item);
  }
  section.append(heading, list);
  brandAlphabet.append(section);
}

function groupFor(product) {
  const group = Object.keys(CATALOG).find(key => key !== 'brands' && CATALOG[key].includes(product));
  return group || (maxMaraBrands.includes(product.brand) ? 'max-mara' : 'all');
}

function updateDetailTotal() {
  if (!currentProduct) return;
  const quantity = detailQuantity.valueAsNumber;
  quantityDecrease.disabled = quantity <= Number(detailQuantity.min);
  quantityIncrease.disabled = quantity >= Number(detailQuantity.max);
  const total = document.getElementById('detail-total');
  if (detailQuantity.validity.valid) setPrice(total, currentProduct.price * quantity);
  else setLocalized(total, '—');
}

function changeDetailQuantity(step) {
  const current = detailQuantity.valueAsNumber;
  const minimum = Number(detailQuantity.min);
  const maximum = Number(detailQuantity.max);
  const next = Number.isFinite(current) ? Math.trunc(current) + step : minimum;
  detailQuantity.valueAsNumber = Math.max(minimum, Math.min(maximum, next));
  updateDetailTotal();
}

const seasonNames = {
  '26FW': ['2026 가을·겨울', 'Fall/Winter 2026'],
  '27SS': ['2027 봄·여름', 'Spring/Summer 2027'],
  'FW컬렉션': ['가을·겨울 컬렉션', 'Fall/Winter collection'],
};

function showDetailList(id, lines) {
  const items = lines.map(([korean, english]) => {
    const item = document.createElement('li');
    setLocalized(item, korean, english);
    return item;
  });
  document.getElementById(id).replaceChildren(...items);
}

function showProductSpecs(product) {
  const details = PRODUCT_DETAILS[product.id];
  const season = seasonNames[product.name.split(' ')[0]];
  const productDescription = document.getElementById('detail-description');
  productDescription.hidden = !details?.body;
  if (details?.body) setLocalized(productDescription, ...details.body);
  document.getElementById('detail-spec-content').hidden = !details?.features?.length;
  showDetailList('detail-features', details?.features || []);
  showDetailList('detail-materials', details?.materials || []);
  document.getElementById('detail-material-note').hidden = !details?.materialDescription;
  if (details?.materialDescription) {
    setLocalized(document.getElementById('detail-material-description'), ...details.materialDescription);
  }
  document.getElementById('detail-spec-origin-row').hidden = !details?.origin;
  if (details?.origin) setLocalized(document.getElementById('detail-spec-origin'), ...details.origin);
  document.getElementById('detail-spec-brand').textContent = product.brand;
  const color = document.getElementById('detail-spec-color');
  color.parentElement.hidden = !details?.color;
  if (details?.color) setLocalized(color, ...details.color);
  setLocalized(document.getElementById('detail-spec-category'), product.category, facetTitlesEn[product.category]);
  document.getElementById('detail-spec-season-row').hidden = !season;
  if (season) setLocalized(document.getElementById('detail-spec-season'), ...season);
  const sizes = product.sizes.join(' · ');
  setLocalized(document.getElementById('detail-spec-sizes'), sizes || '품절', sizes || 'Sold out');
  setLocalized(document.getElementById('detail-spec-delivery'), deliveryTitles[product.delivery] + '배송',
    deliveryTitlesEn[product.delivery] + ' shipping');
}

function showProduct(product, orderItem) {
  const group = groupFor(product);
  currentProduct = product;
  detailForm.reset();
  setLocalized(detailStatus, '');
  detailCartLink.hidden = true;
  const parentHash = detailReturnHash || '#catalog/' + group;
  const parentBrand = brandRoutes.get(parentHash);
  const parentGroup = parentHash.split(/[/?]/)[1];
  storeParent.href = parentHash;
  if (parentHash === '#cart') setLocalized(storeParent, '장바구니', 'Cart');
  else setLocalized(storeParent, brandTitle(parentBrand) || collectionTitles[parentGroup] || '상품 목록',
    brandTitleEn(parentBrand) || collectionTitlesEn[parentGroup] || 'Products');
  storeParent.removeAttribute('aria-current');
  const image = document.getElementById('detail-image');
  image.src = asset(product.image);
  setLocalized(image, product.name, PRODUCT_NAMES_EN[product.id], 'alt');
  describeDelivery(document.getElementById('detail-delivery'), product);
  document.getElementById('detail-brand').textContent = product.brand;
  setLocalized(detailName, product.name, PRODUCT_NAMES_EN[product.id]);
  setPrice(document.getElementById('detail-price'), product.price);
  document.getElementById('detail-deadline').hidden = group !== 'weekly';
  showProductSpecs(product);
  if (orderItem) detailQuantity.value = orderItem.quantity;

  const chips = document.getElementById('detail-sizes');
  chips.replaceChildren();
  product.sizes.forEach(size => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'size';
    input.value = size;
    input.required = true;
    input.checked = product.sizes.length === 1 || orderItem?.size === size;
    const text = document.createElement('span');
    text.textContent = size;
    label.append(input, text);
    chips.append(label);
  });
  detailForm.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = !product.sizes.length; });
  if (!product.sizes.length) {
    const soldOut = document.createElement('span');
    setLocalized(soldOut, '품절', 'Sold out');
    chips.append(soldOut);
  }
  updateDetailTotal();
}

const cartKey = 'brandplanning-preview-cart';
const cartLink = document.getElementById('cart-link');
const cartLinkLabel = document.getElementById('cart-link-label');
const cartIconCount = document.getElementById('cart-icon-count');
const cartItems = document.getElementById('cart-items');
const cartItemTemplate = document.getElementById('cart-item-template');
const cartStatus = document.getElementById('cart-status');
const cartEmpty = document.getElementById('cart-empty');
const cartFilled = document.getElementById('cart-filled');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const cartCheckAll = document.getElementById('cart-check-all');
const cartBuySelected = document.getElementById('cart-buy-selected');

function isOrderItem(row) {
  return byId.get(row?.id)?.sizes.includes(row.size) && Number.isSafeInteger(row.quantity) && row.quantity > 0;
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey));
    if (!Array.isArray(saved)) return [];
    return saved.filter(isOrderItem);
  } catch {
    return [];
  }
}

let cart = readCart();

function selectedCartItems() {
  return cart.filter(row => row.selected !== false);
}

function orderTotals(items) {
  let count = 0;
  let subtotal = 0;
  for (const item of items) {
    count += item.quantity;
    subtotal += byId.get(item.id).price * item.quantity;
  }
  return { count, subtotal };
}

function updateCartTotals() {
  const count = cart.reduce((total, row) => total + row.quantity, 0);
  const selected = selectedCartItems();
  const totals = orderTotals(selected);
  const label = count ? '장바구니 (' + count + ')' : '장바구니';
  const labelEn = count ? 'Cart (' + count + ')' : 'Cart';
  setLocalized(cartLinkLabel, label, labelEn);
  setLocalized(cartLink, label, labelEn, 'aria-label');
  cartIconCount.hidden = !count;
  cartIconCount.textContent = count > 99 ? '99+' : count;
  cartEmpty.hidden = count > 0;
  cartFilled.hidden = !count;
  cartCheckAll.checked = selected.length > 0 && selected.length === cart.length;
  cartCheckAll.indeterminate = selected.length > 0 && selected.length < cart.length;
  cartBuySelected.disabled = !selected.length;
  setLocalized(cartCount, '선택 ' + money.format(totals.count) + '개', countEn(totals.count) + ' selected');
  setPrice(cartTotal, totals.subtotal);
}

function saveCart() {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* Use in-memory cart. */ }
  updateCartTotals();
}

function shoppingItem(row) {
  const product = byId.get(row.id);
  const item = cartItemTemplate.content.firstElementChild.cloneNode(true);
  const productLink = item.querySelector('.cart-product');
  productLink.href = '#product/' + product.id;
  productLink.querySelector('img').src = asset(product.image);
  productLink.querySelector('.product-brand').textContent = product.brand;
  setLocalized(productLink.querySelector('.cart-product-name'), product.name, PRODUCT_NAMES_EN[product.id]);
  setLocalized(productLink.querySelector('.cart-size'), '사이즈 ' + row.size, 'Size ' + row.size);
  setPrice(productLink.querySelector('.cart-unit'), product.price);
  setPrice(item.querySelector('.cart-subtotal'), product.price * row.quantity);
  return item;
}

function cartItem(row) {
  const product = byId.get(row.id);
  const item = shoppingItem(row);
  const select = item.querySelector('.cart-item-select');
  const quantity = item.querySelector('.cart-quantity');
  const decrease = item.querySelector('.cart-decrease');
  const increase = item.querySelector('.cart-increase');
  const subtotal = item.querySelector('.cart-subtotal');
  const remove = item.querySelector('.cart-remove');
  const option = product.name + ' · 사이즈 ' + row.size;
  const optionEn = (PRODUCT_NAMES_EN[product.id] || product.name) + ' · Size ' + row.size;
  select.checked = row.selected !== false;
  setLocalized(select, option + ' 선택', 'Select ' + optionEn, 'aria-label');
  setLocalized(item.querySelector('.quantity-stepper'), option + ' 수량', optionEn + ' quantity', 'aria-label');
  setLocalized(remove, option + ' 삭제', 'Remove ' + optionEn, 'aria-label');

  function updateQuantity() {
    quantity.textContent = money.format(row.quantity);
    setPrice(subtotal, product.price * row.quantity);
    decrease.disabled = row.quantity <= 1;
    increase.disabled = row.quantity >= Number.MAX_SAFE_INTEGER;
  }

  function changeQuantity(amount, button) {
    if (button.disabled) return;
    const hadFocus = document.activeElement === button;
    row.quantity += amount;
    updateQuantity();
    saveCart();
    setLocalized(cartStatus, option + ' ' + row.quantity + '개로 변경했어요. 선택 상품 합계 ' + cartTotal.dataset.ko,
      `${optionEn} updated to ${row.quantity}. Selected items subtotal ${cartTotal.dataset.en}.`);
    if (hadFocus && button.disabled) (amount < 0 ? increase : decrease).focus();
  }

  decrease.addEventListener('click', () => changeQuantity(-1, decrease));
  increase.addEventListener('click', () => changeQuantity(1, increase));
  select.addEventListener('change', () => {
    row.selected = select.checked;
    saveCart();
  });
  remove.addEventListener('click', () => {
    const next = (item.nextElementSibling || item.previousElementSibling)?.querySelector('.cart-remove');
    cart = cart.filter(entry => entry !== row);
    item.remove();
    saveCart();
    setLocalized(cartStatus, option + ' 상품을 삭제했어요.', 'Removed ' + optionEn + '.');
    (next || cartEmpty.querySelector('a')).focus();
  });
  updateQuantity();
  return item;
}

function renderCart() {
  cartItems.replaceChildren(...cart.map(cartItem));
  setLocalized(cartStatus, '');
  updateCartTotals();
}

cartCheckAll.addEventListener('change', () => {
  const checked = cartCheckAll.checked;
  for (const row of cart) row.selected = checked;
  cartItems.querySelectorAll('.cart-item-select').forEach(select => { select.checked = checked; });
  saveCart();
});

function openCartCheckout(items) {
  if (!items.length) return;
  const checkoutItems = items.map(({ id, size, quantity }) => ({ id, size, quantity }));
  history.pushState({ checkoutItems }, '', '#checkout/cart');
  renderRoute(true);
}

cartBuySelected.addEventListener('click', () => openCartCheckout(selectedCartItems()));
document.getElementById('cart-buy-all').addEventListener('click', () => openCartCheckout(cart));

quantityDecrease.addEventListener('click', () => changeDetailQuantity(-1));
quantityIncrease.addEventListener('click', () => changeDetailQuantity(1));
detailQuantity.addEventListener('input', updateDetailTotal);
detailForm.addEventListener('submit', event => {
  event.preventDefault();
  const option = new FormData(detailForm).get('size');
  const quantity = detailQuantity.valueAsNumber;
  if (!currentProduct?.sizes.includes(option) || !detailForm.reportValidity()) return;
  if (event.submitter === detailBuyNow) {
    const options = new URLSearchParams({ size: option, quantity });
    location.hash = '#checkout/' + currentProduct.id + '?' + options;
    return;
  }
  const row = cart.find(entry => entry.id === currentProduct.id && entry.size === option);
  if (row) row.quantity = Math.min(Number.MAX_SAFE_INTEGER, row.quantity + quantity);
  else cart.push({ id: currentProduct.id, size: option, quantity });
  saveCart();
  setLocalized(detailStatus, option + ' 사이즈 ' + quantity + '개를 장바구니에 담았어요.',
    `Added ${countEn(quantity)} in size ${option} to your cart.`);
  detailCartLink.hidden = false;
});
window.addEventListener('storage', event => {
  if (event.key !== cartKey && event.key !== null) return;
  cart = readCart();
  if (cartPage.hidden) updateCartTotals();
  else renderCart();
});
updateCartTotals();

const checkoutPage = document.getElementById('checkout-page');
const checkoutTitle = document.getElementById('checkout-title');
const checkoutReturn = document.getElementById('checkout-return');
const checkoutItems = document.getElementById('checkout-items');
const checkoutFilled = document.getElementById('checkout-filled');
const checkoutEmpty = document.getElementById('checkout-empty');
const checkoutCount = document.getElementById('checkout-count');
const checkoutTotal = document.getElementById('checkout-total');
let activeCheckout;

function checkoutFor(hash) {
  if (hash === '#checkout/cart') {
    const items = history.state?.checkoutItems;
    return { items: Array.isArray(items) ? items.filter(isOrderItem) : [], returnHash: '#cart' };
  }

  const match = hash.match(/^#checkout\/(\d+)(?:\?(.+))?$/);
  if (!match) return;
  const [, id, query] = match;
  const product = byId.get(id);
  const options = new URLSearchParams(query);
  const item = { id, size: options.get('size'), quantity: Number(options.get('quantity')) };
  const valid = isOrderItem(item) && item.quantity <= Number(detailQuantity.max);
  return { items: valid ? [item] : [], returnHash: product ? '#product/' + id : '#catalog/all' };
}

function checkoutItem(row) {
  const item = shoppingItem(row);
  item.classList.add('checkout-item');
  item.querySelector('.cart-item-select').remove();
  item.querySelector('.cart-remove').remove();
  item.querySelector('.quantity-stepper').replaceWith(
    description('수량 ' + money.format(row.quantity) + '개', 'Qty ' + money.format(row.quantity))
  );
  return item;
}

function showCheckout(checkout) {
  const fromCart = checkout.returnHash === '#cart';
  const productSelected = checkout.returnHash.startsWith('#product/');
  const returnLabel = fromCart ? '장바구니' : productSelected ? '상품 상세' : '상품 목록';
  const returnLabelEn = fromCart ? 'Cart' : productSelected ? 'Product details' : 'Products';
  storeParent.href = checkout.returnHash;
  setLocalized(storeParent, returnLabel, returnLabelEn);
  storeParent.removeAttribute('aria-current');
  checkoutReturn.href = checkout.returnHash;
  setLocalized(checkoutReturn, productSelected || fromCart ? returnLabel + '로 돌아가기' : '상품 목록으로 돌아가기',
    'Back to ' + returnLabelEn.toLowerCase());

  checkoutEmpty.hidden = checkout.items.length > 0;
  checkoutFilled.hidden = !checkout.items.length;
  checkoutItems.replaceChildren(...checkout.items.map(checkoutItem));
  const totals = orderTotals(checkout.items);
  setLocalized(checkoutCount, '총 ' + money.format(totals.count) + '개', countEn(totals.count));
  setPrice(checkoutTotal, totals.subtotal);
}

document.getElementById('checkout-pay')?.addEventListener('click', () => {
  const note = document.getElementById('checkout-note');
  openPanel('결제 안내', description(note.dataset.ko, note.dataset.en), 'Payment information');
});

document.getElementById('inquiry-launch').addEventListener('click', () => {
  const form = document.getElementById('inquiry-template').content.firstElementChild.cloneNode(true);
  const mail = form.querySelector('.inquiry-mail');
  const note = form.querySelector('.inquiry-note');
  if (!productPage.hidden && currentProduct) {
    form.elements.brand.value = currentProduct.brand;
    form.elements.size.value = detailForm.querySelector('[name="size"]:checked')?.value || '';
    if (detailQuantity.validity.valid) form.elements.quantity.value = detailQuantity.value;
  }
  form.addEventListener('input', () => {
    mail.hidden = true;
    note.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = '브랜드플래닝 상품 문의 · ' + data.get('brand').trim();
    const body = [
      '상품 브랜드  ' + data.get('brand').trim(),
      '공식 홈페이지 URL  ' + data.get('url').trim(),
      '원하는 사이즈  ' + data.get('size').trim(),
      '수량  ' + data.get('quantity'),
      '', '기타 요청사항', data.get('message').trim() || '없음',
    ].join('\r\n');
    const recipient = document.querySelector('.site-footer a[href^="mailto:"]').getAttribute('href');
    mail.href = recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    mail.hidden = false;
    setLocalized(note, '메일 앱에서 보내면 회사 이메일로 문의가 전달돼요.',
      'Send the draft from your email app to reach our team.');
    mail.focus({ preventScroll: true });
  });
  openPanel('상품 문의', form, 'Product inquiry');
});

function updatePageTitle() {
  const heading = storePage.hidden ? null : storePage.querySelector(':scope > :not([hidden]) h1');
  document.title = heading ? heading.textContent + ' | BRAND PLANNING' : language === 'en' ? 'BRAND PLANNING' : siteTitle;
}

function renderRoute(moveFocus = false) {
  const hash = location.hash;
  const checkout = checkoutFor(hash);
  const product = byId.get(hash.match(/^#product\/([0-9]+)$/)?.[1]);
  const [requestedGroup, query] = hash.startsWith('#catalog/') ? hash.slice(9).split('?') : [];
  const scopedBrand = brandRoutes.get(hash) || (requestedGroup === 'max-mara' ? maxMaraGroup : undefined);
  const group = scopedBrand ? 'brand' : Object.hasOwn(collectionTitles, requestedGroup) ? requestedGroup : null;
  const showBrands = hash === '#brands/all';
  const showMagazine = hash === '#magazine/all';
  const showNotices = hash === '#notices/all';
  const showCart = hash === '#cart';
  const magazineEntry = magazineById.get(hash.match(/^#magazine\/(\d+)$/)?.[1]);
  const notice = noticesById.get(hash.match(/^#notices\/([a-z-]+)$/)?.[1]);
  const entry = magazineEntry || notice;
  const wasStore = !storePage.hidden;
  const wasCart = !cartPage.hidden;
  const heading = product ? detailName : checkout ? checkoutTitle : group ? collectionTitle : showCart ? cartTitle : showBrands ? brandDirectoryTitle
    : showMagazine ? magazinePageTitle : showNotices ? noticePageTitle : entry ? editorialTitle : null;
  storePage.hidden = !heading;
  home.hidden = !storePage.hidden;
  productPage.hidden = !product;
  collectionPage.hidden = !group;
  checkoutPage.hidden = !checkout;
  cartPage.hidden = !showCart;
  if (showCart) cartLink.setAttribute('aria-current', 'page');
  else cartLink.removeAttribute('aria-current');
  brandDirectory.hidden = !showBrands;
  magazinePage.hidden = !showMagazine;
  noticePage.hidden = !showNotices;
  editorialArticle.hidden = !entry;
  skipLink.href = heading ? '#' + heading.id : '#main';

  if (product) {
    const returning = activeCheckout?.returnHash === hash ? activeCheckout.items[0] : undefined;
    if (!returning) detailReturnHash = wasCart ? '#cart' : currentCollectionHash;
    showProduct(product, returning);
  } else if (checkout) {
    showCheckout(checkout);
  } else if (group) {
    if (currentCollectionHash !== hash) {
      showCollection(group, new URLSearchParams(query).get('brand'), scopedBrand);
    }
    currentCollectionHash = hash;
  } else {
    currentCollectionHash = undefined;
    detailReturnHash = undefined;
    if (heading) {
      const listPath = showCart ? '#cart' : showBrands ? '#brands/all' : showNotices || notice ? '#notices/all' : '#magazine/all';
      storeParent.href = listPath;
      const parent = showCart ? cartTitle : showBrands ? brandDirectoryTitle : showNotices || notice ? noticePageTitle : magazinePageTitle;
      setLocalized(storeParent, parent.dataset.ko, parent.dataset.en);
      if (entry) {
        storeParent.removeAttribute('aria-current');
        showEditorialEntry(entry, listPath);
      } else storeParent.setAttribute('aria-current', 'page');
      if (showCart) renderCart();
    } else {
      if (wasStore) document.getElementById(hash.slice(1) || 'top')?.scrollIntoView();
      else if (!moveFocus && (!hash || hash === '#top')) window.scrollTo(0, 0);
    }
  }
  if (heading) {
    window.scrollTo(0, 0);
    if (moveFocus) heading.focus({ preventScroll: true });
  }
  activeCheckout = checkout;
  updatePageTitle();
  scheduleReview();
}

// A direct link, refresh, and browser history all resolve under a repository subpath.
window.addEventListener('hashchange', () => {
  if (location.hash === '#notice' || location.hash === '#review') {
    history.replaceState(history.state, '', location.pathname + location.search);
    renderRoute();
  } else {
    renderRoute(true);
  }
});

// Homepage sections can scroll without putting the current section in the share URL.
const homeSectionIds = { '#top': 'top', '#notice': 'home-notice', '#review': 'home-review', '#weekly': 'weekly', '#classic': 'classic' };
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  const sectionId = link && !link.target && homeSectionIds[link.hash];
  const section = sectionId && document.getElementById(sectionId);
  if (!section) return;

  event.preventDefault();
  const top = section === document.body;
  if (!top || location.hash) history.pushState(history.state, '', location.pathname + location.search);
  if (!storePage.hidden) renderRoute();
  if (top) {
    window.scrollTo(0, 0);
  } else {
    section.scrollIntoView();
    if (event.detail === 0) {
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    }
  }
});

skipLink.addEventListener('click', event => {
  if (storePage.hidden) return;
  event.preventDefault();
  document.getElementById(skipLink.hash.slice(1))?.focus();
});
panel.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#product/"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  panel.close();
});

const heroTrack = document.getElementById('hero-track');
const heroSlides = [...heroTrack.children];
const heroDots = [...document.querySelectorAll('[data-hero-page]')];
const activeSlide = () => Math.round(heroTrack.scrollLeft / Math.max(1, heroTrack.clientWidth));

function goToSlide(index) {
  const next = (index + heroSlides.length) % heroSlides.length;
  heroTrack.scrollTo({ left: heroTrack.clientWidth * next, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

heroDots.forEach((button) => button.addEventListener('click', () => goToSlide(Number(button.dataset.heroPage))));
document.querySelectorAll('[data-hero-step]').forEach((button) => {
  button.addEventListener('click', () => goToSlide(activeSlide() + Number(button.dataset.heroStep)));
});
heroTrack.addEventListener('scroll', () => {
  const current = activeSlide();
  heroDots.forEach((button, index) => {
    if (index === current) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}, { passive: true });
heroTrack.addEventListener('keydown', (event) => {
  if (event.target !== heroTrack || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  goToSlide(activeSlide() + (event.key === 'ArrowRight' ? 1 : -1));
});

const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;
const secondsPerHour = 60 * secondsPerMinute;
const secondsPerDay = 24 * secondsPerHour;
const millisecondsPerWeek = 7 * secondsPerDay * millisecondsPerSecond;
const mondayAtThreeKst = Date.parse('2026-01-05T15:00:00+09:00');

function secondsUntilWeeklyDeadline(now) {
  const sinceDeadline = ((now - mondayAtThreeKst) % millisecondsPerWeek + millisecondsPerWeek) % millisecondsPerWeek;
  if (sinceDeadline < millisecondsPerSecond) return 0;
  return Math.ceil((millisecondsPerWeek - sinceDeadline) / millisecondsPerSecond);
}

function formatCountdown(seconds) {
  const pad = value => String(value).padStart(2, '0');
  const days = Math.floor(seconds / secondsPerDay);
  const hours = Math.floor((seconds % secondsPerDay) / secondsPerHour);
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);
  return `${days}D ${pad(hours)}H ${pad(minutes)}M ${pad(seconds % secondsPerMinute)}S`;
}

const countdowns = document.querySelectorAll('[data-weekly-countdown]');
let tickId;

function updateCountdown() {
  window.clearTimeout(tickId);
  const now = Date.now();
  const seconds = secondsUntilWeeklyDeadline(now);
  for (const countdown of countdowns) {
    countdown.textContent = formatCountdown(seconds);
    countdown.dateTime = 'PT' + seconds + 'S';
  }
  if (!document.hidden) tickId = window.setTimeout(updateCountdown, millisecondsPerSecond - (now % millisecondsPerSecond));
}
document.addEventListener('visibilitychange', updateCountdown);
updateCountdown();

const reviewStage = document.getElementById('review-stage');
const reviewCarousel = document.getElementById('review-carousel');
const reviewToggle = document.getElementById('review-toggle');
const reviewIntervalMs = 4000;
let featuredReview = 0;
let reviewPaused = false;
let reviewVisible = false;
let reviewTimeout;

function reviewContent(review) {
  const copy = document.createElement('div');
  const author = document.createElement('strong');
  author.textContent = review.author;
  const quote = description('“' + review.quote + '”');
  quote.lang = 'ko';
  copy.append(author, quote);
  return copy;
}

function reviewDetail(review) {
  const content = reviewContent(review);
  const image = document.createElement('img');
  image.className = 'panel-review-image';
  image.src = asset(review.image);
  setLocalized(image, review.title, REVIEW_TITLES_EN[review.title], 'alt');
  content.prepend(image);
  openPanel(review.title, content, REVIEW_TITLES_EN[review.title]);
}

const reviewCards = REVIEWS.map((review) => {
  const button = document.createElement('button');
  button.className = 'review-card';
  const image = document.createElement('img');
  image.alt = '';
  image.src = asset(review.image);
  image.loading = 'lazy';
  const media = document.createElement('span');
  media.className = 'review-card-media';
  media.append(image);
  const copy = document.createElement('span');
  copy.className = 'review-card-copy';
  const title = document.createElement('strong');
  title.textContent = review.author;
  const summary = document.createElement('span');
  summary.textContent = '“' + review.quote + '”';
  summary.lang = 'ko';
  copy.append(title, summary);
  button.append(media, copy);
  button.addEventListener('click', () => {
    if (button.dataset.slot === '0') moveReviews(-1);
    else if (button.dataset.slot === '3') moveReviews(1);
    else reviewDetail(review);
  });
  return button;
});
reviewStage.append(...reviewCards);

// Cards just outside the visible row give each direction a slide-in card.
function reviewSlot(index, first, count) {
  const relative = (index - first + count) % count;
  return relative >= count - 2 ? relative + 1 - count : relative + 1;
}

function positionReviews() {
  reviewCards.forEach((card, index) => {
    const slot = reviewSlot(index, featuredReview, reviewCards.length);
    const previous = Number(card.dataset.slot);
    const hidden = slot < 0 || slot > 3;
    if (hidden && card === document.activeElement) reviewToggle.focus({ preventScroll: true });
    card.dataset.wrap = String(Number.isFinite(previous) && Math.abs(previous - slot) > 1);
    card.dataset.slot = String(slot);
    card.inert = hidden;
    card.setAttribute('aria-hidden', String(hidden));
    const title = REVIEWS[index].title;
    const action = slot === 0 ? '이전 리뷰' : slot === 3 ? '다음 리뷰' : '후기 보기';
    const actionEn = slot === 0 ? 'Previous review' : slot === 3 ? 'Next review' : 'Read review';
    setLocalized(card, action + ' · ' + title, actionEn + ' · ' + REVIEW_TITLES_EN[title], 'aria-label');
  });
}

function scheduleReview() {
  window.clearTimeout(reviewTimeout);
  const focusedCard = document.activeElement?.matches('.review-card:focus-visible');
  if (!reviewVisible || reviewPaused || home.hidden || document.hidden || panel.open || searchPanel.open || focusedCard) return;
  reviewTimeout = window.setTimeout(() => moveReviews(1), reviewIntervalMs);
}

function moveReviews(step) {
  featuredReview = (featuredReview + step + reviewCards.length) % reviewCards.length;
  positionReviews();
  scheduleReview();
}

function updateReviewControl() {
  setLocalized(reviewToggle, reviewPaused ? '리뷰 자동재생 시작' : '리뷰 자동재생 멈추기',
    reviewPaused ? 'Resume review carousel' : 'Pause review carousel', 'aria-label');
  reviewToggle.firstElementChild.textContent = reviewPaused ? '▶' : 'Ⅱ';
  scheduleReview();
}

document.querySelectorAll('[data-review-step]').forEach((button) => {
  button.addEventListener('click', () => moveReviews(Number(button.dataset.reviewStep)));
});
reviewToggle.addEventListener('click', () => {
  reviewPaused = !reviewPaused;
  updateReviewControl();
});
const reviewObserver = new IntersectionObserver(([entry]) => {
  reviewVisible = entry.intersectionRatio >= 0.2;
  scheduleReview();
}, { threshold: 0.2 });
reviewObserver.observe(reviewStage);
reviewCarousel.addEventListener('focusin', scheduleReview);
reviewCarousel.addEventListener('focusout', () => queueMicrotask(scheduleReview));
reviewCarousel.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  moveReviews(event.key === 'ArrowRight' ? 1 : -1);
});
document.addEventListener('visibilitychange', scheduleReview);
positionReviews();
updateReviewControl();

document.getElementById('review-more').addEventListener('click', () => {
  const list = document.createElement('ul');
  list.className = 'review-list';
  for (const review of REVIEWS) {
    const item = document.createElement('li');
    const image = document.createElement('img');
    image.src = asset(review.image);
    setLocalized(image, review.title, REVIEW_TITLES_EN[review.title], 'alt');
    item.append(image, reviewContent(review));
    list.append(item);
  }
  openPanel('스마트스토어 구매 리뷰', list, 'Naver Smart Store reviews');
});

const magazineById = new Map(MAGAZINE_ARTICLES.map(entry => [entry.id, entry]));
const noticesById = new Map(NOTICES.map(entry => [entry.id, entry]));

function magazineCard(entry) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'magazine-card';
  link.href = '#magazine/' + entry.id;
  const frame = document.createElement('div');
  frame.className = 'magazine-image';
  const image = document.createElement('img');
  image.src = asset(entry.image);
  image.alt = '';
  image.loading = 'lazy';
  frame.append(image);
  const copy = document.createElement('span');
  copy.className = 'magazine-copy';
  const source = document.createElement('span');
  setLocalized(source, '브랜드플래닝', 'Brand Planning');
  const heading = document.createElement('strong');
  setLocalized(heading, entry.title, MAGAZINE_TITLES_EN[entry.id]);
  copy.append(source, heading);
  link.append(frame, copy);
  item.append(link);
  return item;
}

for (const id of ['magazine-grid', 'magazine-page-grid']) {
  document.getElementById(id).append(...MAGAZINE_ARTICLES.map(magazineCard));
}

const noticeList = document.getElementById('notice-list');
for (const entry of NOTICES) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = '#notices/' + entry.id;
  setLocalized(link, entry.title, NOTICES_EN[entry.id]?.title);
  item.append(link);
  noticeList.append(item);
}

function showEditorialEntry(entry, listPath) {
  const isMagazine = listPath === '#magazine/all';
  const noticeEn = NOTICES_EN[entry.id];
  setLocalized(document.getElementById('editorial-source'), isMagazine ? '브랜드플래닝' : '브랜드플래닝 공지사항',
    isMagazine ? 'Brand Planning' : 'Brand Planning notices');
  setLocalized(editorialTitle, entry.title, isMagazine ? MAGAZINE_TITLES_EN[entry.id] : noticeEn?.title);
  const body = document.getElementById('editorial-body');
  body.classList.toggle('magazine-body', isMagazine);
  if (isMagazine) body.lang = 'ko';
  else body.removeAttribute('lang');
  body.replaceChildren(...(isMagazine ? entry.body.map(magazineBlock)
    : entry.paragraphs.map((text, index) => description(text, noticeEn?.paragraphs[index]))));
  document.getElementById('editorial-back').href = listPath;
}

function magazineBlock(block) {
  if (block.images) {
    const figure = document.createElement('figure');
    figure.className = 'magazine-figure';
    const gallery = document.createElement('div');
    gallery.className = 'magazine-figure-images';
    if (block.images.length > 1) gallery.classList.add('has-multiple');
    for (const name of block.images) {
      const image = document.createElement('img');
      image.src = asset(name);
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      gallery.append(image);
    }
    figure.append(gallery);
    if (block.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = block.caption;
      figure.append(caption);
    }
    return figure;
  }
  if (block.href) {
    const link = document.createElement('a');
    link.className = 'magazine-media button outline';
    link.href = block.href;
    link.textContent = block.text;
    return link;
  }
  const section = document.createElement(block.style === 'heading' ? 'h2' : block.style === 'quote' ? 'blockquote' : 'p');
  section.textContent = block.text;
  return section;
}

const campaign = document.getElementById('classic-campaign');
if (/^https?:$/.test(location.protocol)) {
  const campaignVideoId = 'MVKHFd_gxZw';
  const campaignObserver = new IntersectionObserver(([entry], observer) => {
    if (home.hidden || entry.intersectionRatio < 0.25) return;
    const player = document.createElement('iframe');
    player.className = 'campaign-video';
    setLocalized(player, '브루넬로 쿠치넬리 2026 가을·겨울 공식 캠페인',
      'Brunello Cucinelli Fall/Winter 2026 campaign', 'title');
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.src = `https://www.youtube-nocookie.com/embed/${campaignVideoId}?autoplay=1&mute=1&playsinline=1&rel=0&loop=1&playlist=${campaignVideoId}`;
    campaign.append(player);
    observer.disconnect();
  }, { threshold: 0.25 });
  campaignObserver.observe(campaign);
} else {
  document.getElementById('campaign-file-note').hidden = false;
}
panel.addEventListener('close', () => {
  if (!panel.open) panelBody.replaceChildren();
  scheduleReview();
});

renderRoute();
updateSiteHeader();
