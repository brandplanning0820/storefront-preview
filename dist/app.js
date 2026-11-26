const money = new Intl.NumberFormat('ko-KR');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
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
  ['BOTTEGA VENETA', '보테가 베네타'], ['TOM FORD', '톰 포드'],
  ['LORO PIANA', '로로피아나'], ['BRIONI', '브리오니'], ['ZEGNA', '제냐'],
  ['CESARE ATTOLINI', '체사레 아톨리니'], ['KITON', '키톤'], ['PEUTEREY', '페트레이'],
]);
const classicBrands = new Set(['BRUNELLO CUCINELLI', 'TOM FORD']);
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
  const link = item.querySelector('a');
  link.href = '#product/' + product.id;
  item.querySelector('img').src = asset(product.image);
  const gallery = PRODUCT_GALLERIES[product.id];
  const hoverPhoto = gallery?.wearing || gallery?.alternate || gallery?.photos[0];
  if (hoverPhoto) {
    const preview = document.createElement('img');
    preview.className = 'product-hover-photo';
    preview.alt = '';
    preview.decoding = 'async';
    preview.addEventListener('load', () => { preview.dataset.ready = ''; }, { once: true });
    item.querySelector('.product-photo').insertBefore(preview, item.querySelector('.delivery'));
    link.addEventListener('pointerenter', event => {
      if (!hoverPointer.matches || event.pointerType === 'touch' || preview.hasAttribute('src')) return;
      preview.src = asset(hoverPhoto);
    });
  }
  item.querySelector('.product-brand').textContent = product.brand;
  setLocalized(item.querySelector('.product-name'), product.name, PRODUCT_NAMES_EN[product.id]);
  setPrice(item.querySelector('.product-price'), product.price);
  if (product.sizes.length) item.querySelector('.product-size').textContent = product.sizes.join(' · ');
  else setLocalized(item.querySelector('.product-size'), '품절', 'Sold out');
  describeDelivery(item.querySelector('.delivery'), product);
  return item;
}

document.querySelectorAll('[data-catalog]').forEach((list) => {
  const group = list.dataset.catalog;
  const products = HOME_CATALOG[group] ?? CATALOG[group];
  const cards = products.map(product => {
    const card = productCard(product);
    if (group === 'weekly' && CATALOG.weekly.includes(product)) {
      const badge = card.querySelector('.delivery');
      badge.dataset.weeklyOffer = '';
      setLocalized(badge, '위클리', 'Weekly');
      setLocalized(badge, '위클리 해외배송', 'Weekly overseas shipping', 'aria-label');
    }
    return card;
  });
  list.replaceChildren(...cards);
});

const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panel-title');
const panelBody = document.getElementById('panel-body');
const searchPanel = document.getElementById('search-panel');
const searchLaunch = document.getElementById('search-launch');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');
const recentTerms = [];
const recentProductKey = 'brandplanning-recent-search-products';
const recentProductLimit = 6;
let temporaryRecentProducts;
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
const reviewedProducts = new Map(REVIEWS.map(review => [review.productId, {
  id: review.productId,
  name: review.title,
  nameEn: REVIEW_TITLES_EN[review.title],
  image: review.image,
  sizes: [],
}]));
const collectionTitles = {
  all: '브랜드', men: '남성', women: '여성', weekly: '위클리',
  classic: '기획전', domestic: '당일출고', best: 'BEST', new: 'NEW', 'max-mara': '막스마라',
};
const collectionTitlesEn = {
  all: 'Brands', men: 'Men', women: 'Women', weekly: 'Weekly',
  classic: 'Specials', domestic: 'Same-day dispatch', best: 'BEST', new: 'NEW', 'max-mara': 'Max Mara',
};

const brandSearchAliases = new Map([
  ['BRUNELLO CUCINELLI', ['쿠치넬리', '쿠치']],
  ['MONCLER', ['몽끌레르', '몽클레어']],
  ['HERNO', ['헤르노']],
  ['WEEKEND MAX MARA', ['위켄드 막스']],
  ['BOTTEGA VENETA', ['보테가']],
  ['LOEWE', ['로웨']],
]);
const productSearchSynonyms = [
  ['패딩', '다운', 'puffer', 'down'],
  ['재킷', '자켓', 'jacket'],
  ['가디건', '카디건', 'cardigan'],
  ['바지', '팬츠', 'pants', 'trousers'],
  ['목도리', '머플러', '스카프', 'scarf'],
  ['운동화', '스니커즈', 'sneakers', 'trainers'],
  ['토트', '토트백', 'tote'],
  ['장화', '레인 부츠', 'rain boots'],
];

function searchWords(text = '') {
  return text.normalize('NFKC').toLocaleLowerCase('ko-KR').match(/[\p{L}\p{N}]+/gu) ?? [];
}

function searchFields(values) {
  const groups = values.map(searchWords).filter(words => words.length);
  return {
    phrases: [...new Set(groups.map(words => words.join('')))],
    words: [...new Set(groups.flat())],
  };
}

function oneSpellingEdit(left, right) {
  if (Math.abs(left.length - right.length) > 1 || left === right) return false;
  if (left.length > right.length) [left, right] = [right, left];
  let firstDifference = 0;
  while (firstDifference < left.length && left[firstDifference] === right[firstDifference]) firstDifference++;

  if (left.length !== right.length) return left.slice(firstDifference) === right.slice(firstDifference + 1);
  return left.slice(firstDifference + 1) === right.slice(firstDifference + 1)
    || (left[firstDifference] === right[firstDifference + 1]
      && left[firstDifference + 1] === right[firstDifference]
      && left.slice(firstDifference + 2) === right.slice(firstDifference + 2));
}

function closeSearchSpelling(query, candidate) {
  if (/\d/u.test(query) || /\d/u.test(candidate)) return false;
  if (query.length >= 3 && candidate.length >= 3 && oneSpellingEdit(query, candidate)) return true;
  return /^[가-힣]{2}$/u.test(query) && /^[가-힣]{2}$/u.test(candidate)
    && oneSpellingEdit(query.normalize('NFD'), candidate.normalize('NFD'));
}

function closeLongEnglishSpelling(query, candidate) {
  if (!/^[a-z]{7,}$/u.test(candidate) || Math.abs(query.length - candidate.length) > 2) return false;
  let previous = Array.from({ length: candidate.length + 1 }, (_, index) => index);
  for (let row = 1; row <= query.length; row++) {
    const current = [row];
    for (let col = 1; col <= candidate.length; col++) {
      const change = query[row - 1] === candidate[col - 1] ? 0 : 1;
      current[col] = Math.min(previous[col] + 1, current[col - 1] + 1, previous[col - 1] + change);
    }
    if (Math.min(...current) > 2) return false;
    previous = current;
  }
  return previous[candidate.length] <= 2;
}

const brandSearchIndex = [...brandNames].map(([brand, korean]) => ({
  brand,
  direct: searchFields([brand, korean]),
  related: searchFields(brandSearchAliases.get(brand) ?? []),
}));
const indexedBrands = new Map(brandSearchIndex.map(entry => [entry.brand, entry]));
const synonymFields = productSearchSynonyms.map(searchFields);
const productSearchIndex = allProducts.map(product => {
  const direct = searchFields([
    product.brand, brandNames.get(product.brand), product.name, PRODUCT_NAMES_EN[product.id],
    product.category, facetTitlesEn[product.category], product.gender, facetTitlesEn[product.gender],
  ]);
  const synonyms = synonymFields.filter(group => group.phrases.some(term =>
    /^[a-z]+$/u.test(term) ? direct.words.includes(term) : direct.phrases.some(phrase => phrase.includes(term))));
  const brandAliases = indexedBrands.get(product.brand)?.related.phrases ?? [];
  return { product, direct, related: searchFields([...brandAliases, ...synonyms.flatMap(group => group.phrases)]) };
});

const colorSearchAliases = [
  ['블랙', '검정', '검은색', 'black'], ['화이트', '흰색', 'white'],
  ['그레이', '회색', 'grey', 'gray'], ['블루', '파랑', '파란색', 'blue'],
  ['브라운', '갈색', 'brown'], ['네이비', '남색', 'navy'],
  ['그린', '초록', '초록색', 'green'], ['레드', '빨강', '빨간색', 'red'],
  ['옐로우', '노랑', '노란색', 'yellow'],
].map(aliases => searchFields(aliases).phrases);
const materialSearchAliases = [
  ['울', '양모', 'wool'], ['캐시미어', '카시미어', 'cashmere'], ['면', '코튼', 'cotton'],
  ['가죽', '레더', 'leather'], ['스웨이드', 'suede'], ['실크', '견', 'silk'],
  ['리넨', '린넨', 'linen'], ['비스코스', 'viscose'], ['나일론', 'nylon'],
].map(aliases => searchFields(aliases).phrases);

function indexRefinementTerms(terms, fields, aliases) {
  for (const group of aliases) {
    const match = group.some(term => fields.words.includes(term)
      || (/[가-힣]{2,}/u.test(term) && fields.phrases.some(phrase => phrase.includes(term))));
    for (const term of group) terms.set(term, match ? 4 : 0);
  }
}

const collectionProductSearchIndex = new Map(productSearchIndex.map(entry => {
  const { product, direct, related } = entry;
  const details = PRODUCT_DETAILS[product.id];
  const productNames = [product.name, PRODUCT_NAMES_EN[product.id]];
  const colors = searchFields(details?.color ?? productNames);
  const materials = searchFields(details?.materials?.flat() ?? productNames);
  const refinements = new Map();
  indexRefinementTerms(refinements, colors, colorSearchAliases);
  indexRefinementTerms(refinements, materials, materialSearchAliases);
  const matchingAliases = [...refinements].filter(([, score]) => score > 0).map(([term]) => term);
  return [product.id, {
    product,
    direct: {
      phrases: [...direct.phrases, ...colors.phrases, ...materials.phrases],
      words: [...direct.words, ...colors.words, ...materials.words],
    },
    related: searchFields([...related.phrases, ...matchingAliases]),
    refinements,
  }];
}));

function searchTermScore(query, { direct, related, refinements }) {
  if (refinements?.has(query)) return refinements.get(query);
  if (direct.words.includes(query) || direct.phrases.includes(query)) return 4;
  if (direct.phrases.some(phrase => phrase.includes(query))) return 3;
  if (related.phrases.includes(query)) return 2;
  const candidates = [...direct.words, ...direct.phrases, ...related.phrases];
  if (candidates.some(candidate => closeSearchSpelling(query, candidate))) return 1;
  if (/^[a-z]{7,}$/u.test(query) && candidates.some(candidate => closeLongEnglishSpelling(query, candidate))) return 0.5;
  return 0;
}

function rankedSearch(tokens, index) {
  if (!tokens.length) return [];
  const query = tokens.join('');
  const ranked = index.map(entry => {
    const whole = searchTermScore(query, entry);
    if (tokens.length === 1) return { entry, score: whole };
    const parts = tokens.map(token => searchTermScore(token, entry));
    const each = parts.every(Boolean) ? parts.reduce((sum, value) => sum + value, 0) / parts.length : 0;
    return { entry, score: Math.max(whole, each) };
  }).filter(result => result.score > 0).sort((left, right) => right.score - left.score);
  const bestScore = ranked[0]?.score ?? 0;
  const minimum = bestScore >= 3 ? 2 : bestScore >= 1 ? 1 : 0.5;
  return ranked.filter(result => result.score >= minimum).map(result => result.entry);
}

let searchPreviewTimer;

function rememberSearchTerm(term) {
  if (!term || recentTerms[0] === term) return;
  const duplicate = recentTerms.indexOf(term);
  if (duplicate !== -1) recentTerms.splice(duplicate, 1);
  recentTerms.unshift(term);
  if (recentTerms.length > 5) recentTerms.pop();
  showRecentSearchTerms();
}

function showCatalogResults(term, remember = true) {
  clearTimeout(searchPreviewTimer);
  const tokens = searchWords(term);
  const matching = rankedSearch(tokens, productSearchIndex);
  const brands = rankedSearch(tokens, brandSearchIndex).slice(0, 4);
  const brandResults = document.getElementById('search-brand-results');
  brandResults.hidden = !brands.length;
  brandResults.querySelector('.search-chips').replaceChildren(...brands.map(({ brand }) => {
    const link = document.createElement('a');
    link.href = brandHref(brand === 'MAX MARA' ? maxMaraGroup : brand);
    setLocalized(link, brandTitle(brand), brandTitleEn(brand));
    return link;
  }));
  if (remember) {
    searchInput.value = term;
    rememberSearchTerm(term);
  }
  searchResults.hidden = false;
  searchResults.dataset.term = term;
  const count = matching.length;
  const emptyKo = brands.length ? `‘${term}’ 관련 브랜드 ${brands.length}개` : `‘${term}’에 해당하는 상품이나 브랜드가 없어요.`;
  const emptyEn = brands.length ? `${brands.length} matching ${brands.length === 1 ? 'brand' : 'brands'} for “${term}”`
    : `No products or brands match “${term}”.`;
  setLocalized(document.getElementById('search-count'),
    count ? `‘${term}’ 검색 결과 ${count}개` : emptyKo,
    count ? `${countEn(count)} for “${term}”` : emptyEn);
  document.getElementById('search-products').replaceChildren(...matching.map(({ product }) => productCard(product)));
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

function showRecentSearchTerms() {
  const recent = document.getElementById('search-recent');
  const focusedTerm = recent.contains(document.activeElement) ? document.activeElement.dataset.searchTerm : undefined;
  const buttons = recentTerms.map(term => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.searchTerm = term;
    button.textContent = term;
    return button;
  });
  recent.replaceChildren(...buttons);
  buttons.find(button => button.dataset.searchTerm === focusedTerm)?.focus({ preventScroll: true });
  if (!recentTerms.length) recent.append(description('최근 검색어가 없어요.', 'No recent searches.'));
}

function showSearchOverview() {
  searchResults.hidden = true;
  showRecentSearchTerms();
  showRecentSearchProducts();
}

function recentSearchProductIds() {
  if (temporaryRecentProducts) return temporaryRecentProducts;
  try {
    const saved = JSON.parse(localStorage.getItem(recentProductKey));
    if (Array.isArray(saved)) return [...new Set(saved.filter(id => byId.has(id)))].slice(0, recentProductLimit);
  } catch { /* The search panel also works without browser storage. */ }
  return [];
}

function rememberSearchProduct(id) {
  const ids = [id, ...recentSearchProductIds().filter(productId => productId !== id)].slice(0, recentProductLimit);
  try {
    localStorage.setItem(recentProductKey, JSON.stringify(ids));
    temporaryRecentProducts = undefined;
  } catch {
    temporaryRecentProducts = ids;
  }
}

function showRecentSearchProducts() {
  const list = document.getElementById('search-viewed-products');
  const template = document.getElementById('search-viewed-product-template');
  const cards = recentSearchProductIds().map(id => {
    const product = byId.get(id);
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector('a').href = '#product/' + id;
    card.querySelector('img').src = asset(product.image);
    card.querySelector('.search-viewed-brand').textContent = product.brand;
    setLocalized(card.querySelector('.search-viewed-name'), product.name, PRODUCT_NAMES_EN[id]);
    setPrice(card.querySelector('.search-viewed-price'), product.price);
    return card;
  });
  list.replaceChildren(...cards);
  list.hidden = !cards.length;
  document.getElementById('search-viewed-empty').hidden = Boolean(cards.length);
}

function openSearch() {
  searchInput.value = '';
  showSearchOverview();
  setMobileNav(false);
  positionSearchPanel();
  searchPanel.returnValue = '';
  searchPanel.showModal();
  searchPanel.scrollTop = 0;
  document.documentElement.classList.add('search-open');
  searchLaunch.setAttribute('aria-expanded', 'true');
  searchInput.focus({ preventScroll: true });
  scheduleReview();
}

searchLaunch.addEventListener('click', openSearch);
function previewSearch() {
  clearTimeout(searchPreviewTimer);
  const query = searchInput.value.trim();
  if (query) searchPreviewTimer = setTimeout(() => showCatalogResults(query, false), 160);
  else showSearchOverview();
}
searchInput.addEventListener('input', event => {
  if (!event.isComposing) previewSearch();
});
searchInput.addEventListener('compositionstart', () => clearTimeout(searchPreviewTimer));
searchInput.addEventListener('compositionend', previewSearch);
document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (query) showCatalogResults(query);
});
searchPanel.addEventListener('click', event => {
  const suggestion = event.target.closest('[data-search-term]');
  if (suggestion) showCatalogResults(suggestion.textContent);
  const resultLink = event.target.closest('#search-results a, #search-viewed-products a');
  if (searchResults.contains(resultLink)) rememberSearchTerm(searchResults.dataset.term);
  const productId = resultLink?.hash.match(/^#product\/(\d+)$/)?.[1];
  if (byId.has(productId)) rememberSearchProduct(productId);
  if (resultLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    searchPanel.close(resultLink.hash === location.hash ? '' : 'result');
  }
  if (event.target === searchPanel && event.clientY < searchPanel.getBoundingClientRect().top) searchPanel.close();
  else if (event.target === searchPanel && event.clientY > searchPanel.getBoundingClientRect().bottom) searchPanel.close();
});
searchPanel.addEventListener('close', () => {
  clearTimeout(searchPreviewTimer);
  document.documentElement.classList.remove('search-open');
  searchLaunch.setAttribute('aria-expanded', 'false');
  if (searchPanel.returnValue !== 'result') searchLaunch.focus({ preventScroll: true });
  scheduleReview();
});
const languageSwitch = document.getElementById('language-switch');
const languageToggle = languageSwitch.querySelector('summary');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const siteNav = document.getElementById('site-nav');
const weeklyNavLink = document.getElementById('weekly-nav-link');
const weeklyNavTooltip = document.getElementById('weekly-nav-tooltip');
const arrivalsMenu = document.getElementById('arrivals-menu');
const arrivalsMenuToggle = document.getElementById('arrivals-menu-toggle');
const arrivalsMenuList = document.getElementById('arrivals-menu-list');
const accountTitles = { 로그인: 'Log in', 회원가입: 'Sign up', 마이페이지: 'My account' };

function positionWeeklyTooltip() {
  if (weeklyNavTooltip.hidden) return;
  const link = weeklyNavLink.getBoundingClientRect();
  const navigation = siteNav.getBoundingClientRect();
  const visibleLeft = Math.max(link.left, navigation.left);
  const visibleRight = Math.min(link.right, navigation.right);
  if (visibleRight <= visibleLeft || link.bottom <= 0 || link.top >= document.documentElement.clientHeight) {
    setWeeklyTooltip(false);
    return;
  }
  const center = (visibleLeft + visibleRight) / 2;
  const { offsetWidth, offsetHeight } = weeklyNavTooltip;
  const left = Math.max(4, Math.min(document.documentElement.clientWidth - offsetWidth - 4, center - offsetWidth / 2));
  weeklyNavTooltip.style.left = left + 'px';
  weeklyNavTooltip.style.top = Math.max(0, link.top - offsetHeight - 4) + 'px';
  weeklyNavTooltip.style.setProperty('--weekly-tooltip-arrow', center - left + 'px');
}

function setWeeklyTooltip(open) {
  weeklyNavTooltip.hidden = !open;
  if (open) positionWeeklyTooltip();
}

weeklyNavLink.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') setWeeklyTooltip(true);
});
weeklyNavLink.addEventListener('pointerleave', () => {
  if (document.activeElement !== weeklyNavLink) setWeeklyTooltip(false);
});
weeklyNavLink.addEventListener('focus', () => setWeeklyTooltip(true));
weeklyNavLink.addEventListener('blur', () => setWeeklyTooltip(false));
weeklyNavLink.addEventListener('click', () => setWeeklyTooltip(false));

function positionArrivalsMenu() {
  if (arrivalsMenuList.hidden) return;
  const trigger = arrivalsMenu.getBoundingClientRect();
  const navigation = siteNav.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  if (!trigger.width || trigger.bottom <= 0 || trigger.bottom >= clientHeight - 8
    || trigger.right <= navigation.left || trigger.left >= navigation.right) {
    setArrivalsMenu(false);
    return;
  }
  const left = Math.min(clientWidth - arrivalsMenuList.offsetWidth - 8, Math.max(8, navigation.left, trigger.left));
  arrivalsMenuList.style.left = left + 'px';
  arrivalsMenuList.style.top = trigger.bottom + 'px';
  arrivalsMenuList.style.maxHeight = clientHeight - trigger.bottom - 8 + 'px';
}

function setArrivalsMenu(open) {
  arrivalsMenuList.hidden = !open;
  arrivalsMenuToggle.setAttribute('aria-expanded', String(open));
  if (open) positionArrivalsMenu();
}

arrivalsMenu.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') setArrivalsMenu(true);
});
arrivalsMenu.addEventListener('pointerleave', event => {
  if (event.pointerType !== 'mouse') return;
  const linkHadFocus = arrivalsMenuList.contains(document.activeElement);
  setArrivalsMenu(false);
  if (linkHadFocus) arrivalsMenuToggle.focus({ preventScroll: true });
});
arrivalsMenu.addEventListener('focusout', event => {
  if (!arrivalsMenu.contains(event.relatedTarget)) setArrivalsMenu(false);
});
arrivalsMenuToggle.addEventListener('click', () => setArrivalsMenu(arrivalsMenuList.hidden));

function positionNavOverlays() {
  positionWeeklyTooltip();
  positionArrivalsMenu();
}

window.addEventListener('scroll', positionNavOverlays, { passive: true });
window.addEventListener('resize', positionNavOverlays);
siteNav.addEventListener('scroll', positionNavOverlays, { passive: true });

function setMobileNav(open) {
  siteHeader.classList.toggle('is-menu-open', open);
  mobileMenuToggle.setAttribute('aria-expanded', String(open));
  if (!open) {
    setArrivalsMenu(false);
    setWeeklyTooltip(false);
  }
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
  if (!arrivalsMenu.contains(event.target)) setArrivalsMenu(false);
  if (!siteNav.contains(event.target) && !mobileMenuToggle.contains(event.target)) setMobileNav(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!arrivalsMenuList.hidden) {
    const hadFocus = arrivalsMenu.contains(document.activeElement);
    setArrivalsMenu(false);
    if (hadFocus) arrivalsMenuToggle.focus({ preventScroll: true });
  } else if (!weeklyNavTooltip.hidden) {
    setWeeklyTooltip(false);
  } else if (languageSwitch.open) {
    languageSwitch.open = false;
    languageToggle.focus({ preventScroll: true });
  } else if (siteHeader.classList.contains('is-menu-open')) {
    setMobileNav(false);
    mobileMenuToggle.focus({ preventScroll: true });
  }
});

function showAccount(title) {
  setMobileNav(false);
  if (title === '로그인') {
    const form = document.getElementById('login-template').content.firstElementChild.cloneNode(true);
    form.addEventListener('submit', event => {
      event.preventDefault();
      form.reset();
      form.querySelector('.login-message').hidden = false;
    });
    openPanel(title, form, accountTitles[title]);
    return;
  }
  const wasOpen = panel.open;
  const note = description('실제 회원과 주문 기능은 자사몰 연결 후 이용할 수 있어요.',
    'Account and order services will be available when the store is connected.');
  openPanel(title, note, accountTitles[title]);
  if (wasOpen) panel.querySelector('.panel-header button').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-account]');
  if (button) showAccount(button.dataset.account);
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
const collectionSearch = document.getElementById('collection-search');
const collectionBrands = document.getElementById('collection-brands');
const collectionGenders = document.getElementById('collection-genders');
const collectionCategories = document.getElementById('collection-categories');
const collectionBrandLines = document.getElementById('collection-brand-lines');
const brandDirectory = document.getElementById('brand-directory');
const brandDirectoryTitle = document.getElementById('brand-directory-title');
const communityPage = document.getElementById('community-page');
const communityPageTitle = document.getElementById('community-page-title');
const arrivalsPage = document.getElementById('arrivals-page');
const arrivalsPageTitle = document.getElementById('arrivals-page-title');
const arrivalsTabs = document.getElementById('arrivals-tabs');
const arrivalsBlogList = document.getElementById('arrivals-blog-list');
const arrivalCategories = document.getElementById('arrival-categories');
const arrivalPosts = document.getElementById('arrival-posts');
const reviewPage = document.getElementById('review-page');
const reviewPageTitle = document.getElementById('review-page-title');
const magazinePage = document.getElementById('magazine-page');
const magazinePageTitle = document.getElementById('magazine-page-title');
const noticePage = document.getElementById('notice-page');
const noticePageTitle = document.getElementById('notice-page-title');
const cartPage = document.getElementById('cart-page');
const cartTitle = document.getElementById('cart-title');
const editorialArticle = document.getElementById('editorial-article');
const editorialTitle = document.getElementById('editorial-title');
const editorialOriginal = document.getElementById('editorial-original');
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
  let products = collectionProducts.filter(product => (
    (!brands.size || brands.has(product.brand))
    && (!genders.size || genders.has(product.gender))
    && (!categories.size || categories.has(product.category))
  ));
  const query = collectionSearch.value.trim();
  if (query) {
    const index = products.map(product => collectionProductSearchIndex.get(product.id));
    const found = new Set(rankedSearch(searchWords(query), index).map(({ product }) => product.id));
    products = products.filter(product => found.has(product.id));
  }
  if (collectionSort.value === 'low') products.sort((a, b) => a.price - b.price);
  if (collectionSort.value === 'high') products.sort((a, b) => b.price - a.price);
  collectionList.replaceChildren(...products.map(productCard));
  setLocalized(document.getElementById('collection-count'), '상품 ' + products.length + '개', countEn(products.length));
  const empty = document.getElementById('collection-empty');
  empty.hidden = products.length > 0;
  if (!products.length) {
    if (!collectionProducts.length) setLocalized(empty, '아직 등록된 상품이 없어요.', 'No products have been added yet.');
    else if (query) setLocalized(empty, `현재 결과에서 ‘${query}’에 해당하는 상품이 없어요.`, `No products in these results match “${query}”.`);
    else setLocalized(empty, '선택한 조건에 해당하는 상품이 없어요.', 'No products match your filters.');
  }
}

function renderBrandFilters(initialBrand) {
  const availableBrands = new Set(collectionProducts.map(product => product.brand));
  for (const brand of brandNames.keys()) {
    if (brand === 'MAX MARA') {
      const subBrands = maxMaraBrands.filter(value => availableBrands.has(value));
      if (!subBrands.length) continue;
      const block = document.createElement('div');
      block.className = 'brand-group';
      const parent = filterCheckbox('MAX MARA (ALL)');
      parent.firstElementChild.dataset.brandParent = '';
      const options = document.createElement('div');
      options.className = 'brand-group-options';
      options.setAttribute('role', 'group');
      setLocalized(options, 'MAX MARA 하위 브랜드', 'Max Mara lines', 'aria-label');
      for (const value of subBrands) {
        const option = filterCheckbox(value, value, value === initialBrand);
        if (value === 'MAX MARA') setLocalized(option.firstElementChild, 'MAX MARA 단일 브랜드', 'Max Mara main line', 'aria-label');
        options.append(option);
      }
      block.append(parent, options);
      collectionBrands.append(block);
    } else if (!maxMaraBrands.includes(brand) && availableBrands.has(brand)) {
      collectionBrands.append(filterCheckbox(brand, brand, brand === initialBrand));
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
  else if (group === 'classic') collectionProducts = allProducts.filter(product => classicBrands.has(product.brand));
  else if (group === 'men' || group === 'women') {
    const gender = group === 'men' ? '남성' : '여성';
    collectionProducts = allProducts.filter(product => product.gender === gender);
  } else collectionProducts = CATALOG[group];

  collectionBrands.replaceChildren();
  collectionBrands.parentElement.hidden = Boolean(scopedBrand);
  if (!scopedBrand) renderBrandFilters(initialBrand);
  renderProductFacet(collectionGenders, 'gender', genderOrder, Boolean(scopedBrand));
  const showCategories = Boolean(scopedBrand) || ['men', 'women', 'weekly', 'classic', 'domestic'].includes(group);
  renderProductFacet(collectionCategories, 'category', categoryOrder, showCategories);

  const isMaxMara = scopedBrand === maxMaraGroup || maxMaraBrands.includes(scopedBrand);
  collectionBrandLines.hidden = !isMaxMara;
  collectionBrandLines.replaceChildren();
  if (isMaxMara) {
    for (const line of [maxMaraGroup, ...maxMaraBrands]) {
      const link = document.createElement('a');
      link.href = brandHref(line);
      setLocalized(link, line === maxMaraGroup ? 'MAX MARA (ALL)' : line);
      if (line === scopedBrand) link.setAttribute('aria-current', 'page');
      collectionBrandLines.append(link);
    }
  }
  collectionSort.value = 'recommended';
  collectionSearch.value = '';
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
  if (checkbox === collectionSearch) return;
  if (checkbox.matches('[data-brand-parent]')) {
    checkbox.closest('.brand-group').querySelectorAll('input[name="brand"]').forEach(child => {
      child.checked = checkbox.checked;
    });
  }
  updateCollection();
});
collectionSearch.addEventListener('input', event => {
  if (!event.isComposing) updateCollection();
});
collectionSearch.addEventListener('compositionend', updateCollection);
collectionFilters.addEventListener('submit', event => {
  event.preventDefault();
  updateCollection();
});
collectionFilters.addEventListener('reset', event => {
  event.preventDefault();
  collectionFilters.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  collectionSort.value = 'recommended';
  collectionSearch.value = '';
  updateCollection();
});

document.querySelectorAll('[data-brand]').forEach(button => {
  button.addEventListener('click', () => { location.hash = brandHref(button.dataset.brand); });
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
  if (!Number.isFinite(currentProduct?.price)) return;
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
  const productDescription = document.getElementById('detail-description');
  productDescription.hidden = !details?.body;
  if (details?.body) setLocalized(productDescription, ...details.body);
  document.getElementById('detail-specs').hidden = !details?.features?.length && !details?.materials?.length;
  showDetailList('detail-features', details?.features || []);
  showDetailList('detail-materials', details?.materials || []);
  const materialDescription = document.getElementById('detail-material-description');
  materialDescription.hidden = !details?.materialDescription;
  if (details?.materialDescription) setLocalized(materialDescription, ...details.materialDescription);
}

function showProductGallery(product) {
  const gallery = PRODUCT_GALLERIES[product.id];
  const photos = [...new Set([product.image, ...(gallery?.photos || [])])];
  const thumbnails = document.getElementById('detail-thumbnails');
  const rail = document.getElementById('detail-thumbnail-rail');
  const image = document.getElementById('detail-image');

  const photoLabel = (photo, index) => photo === gallery?.wearing
    ? ['착용 사진', 'On-model photo']
    : ['상품 사진 ' + (index + 1), 'Product photo ' + (index + 1)];

  function selectPhoto(index) {
    const photo = photos[index];
    const [koreanTitle, englishTitle] = photoLabel(photo, index);
    image.src = asset(photo);
    setLocalized(image, product.name + ' · ' + koreanTitle,
      (PRODUCT_NAMES_EN[product.id] || product.nameEn || product.name) + ' · ' + englishTitle, 'alt');
    [...thumbnails.children].forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
  }

  rail.hidden = photos.length < 2;
  thumbnails.replaceChildren(...(rail.hidden ? [] : photos.map((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    setLocalized(button, ...photoLabel(photo, index), 'aria-label');
    const thumb = document.createElement('img');
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.src = asset(photo);
    button.append(thumb);
    button.addEventListener('click', () => selectPhoto(index));
    return button;
  })));
  selectPhoto(0);
  thumbnails.scrollTop = 0;
  thumbnails.scrollLeft = 0;
}

function showProduct(product, orderItem) {
  const group = groupFor(product);
  const hasPrice = Number.isFinite(product.price);
  currentProduct = product;
  detailForm.reset();
  detailForm.hidden = !hasPrice;
  document.getElementById('detail-availability').hidden = hasPrice;
  setLocalized(detailStatus, '');
  detailCartLink.hidden = true;
  const parentHash = detailReturnHash || (hasPrice ? '#catalog/' + group : '#reviews/all');
  const parentBrand = brandRoutes.get(parentHash);
  const parentGroup = parentHash.split(/[/?]/)[1];
  storeParent.href = parentHash;
  if (parentHash === '#cart') setLocalized(storeParent, '장바구니', 'Cart');
  else if (parentHash === '#reviews/all') setLocalized(storeParent, '리뷰', 'Reviews');
  else setLocalized(storeParent, brandTitle(parentBrand) || collectionTitles[parentGroup] || '상품 목록',
    brandTitleEn(parentBrand) || collectionTitlesEn[parentGroup] || 'Products');
  storeParent.removeAttribute('aria-current');
  showProductGallery(product);
  const delivery = document.getElementById('detail-delivery');
  const brand = document.getElementById('detail-brand');
  delivery.hidden = !product.delivery;
  brand.textContent = product.brand || '';
  brand.parentElement.hidden = !product.brand && !product.delivery;
  if (product.delivery) describeDelivery(delivery, product);
  setLocalized(detailName, product.name, PRODUCT_NAMES_EN[product.id] || product.nameEn);
  const price = document.getElementById('detail-price');
  price.hidden = !hasPrice;
  if (hasPrice) setPrice(price, product.price);
  document.getElementById('detail-deadline').hidden = group !== 'weekly';
  showProductSpecs(product);
  if (!hasPrice) return;
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

function showInquiryConfirmation(byEmail, sent = false) {
  const confirmation = document.createElement('form');
  confirmation.method = 'dialog';
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.className = 'button dark';
  setLocalized(confirm, '확인', 'OK');
  const message = sent
    ? description('입력하신 이메일로 연락드리겠습니다.', 'We’ll get back to you at the email address you entered.')
    : byEmail
      ? description('이 화면은 시안입니다. 메일 발송은 전송 서비스 연결 후 이용할 수 있어요.',
        'This is a preview. Email delivery becomes available once a submission service is connected.')
      : description('이 화면은 시안입니다. 문의 접수는 카페24 운영몰 연결 후 이용할 수 있어요.',
        'This is a preview. Store inquiries become available once the Cafe24 store is connected.');
  confirmation.append(message, confirm);
  openPanel(byEmail ? '메일로 문의가 전송되었습니다' : '문의가 전송되었습니다',
    confirmation, byEmail ? 'Inquiry sent by email' : 'Inquiry submitted');
  confirm.focus();
}

async function sendInquiry(form, endpoint, data, note) {
  const fields = form.querySelectorAll('input:enabled, textarea:enabled');
  const buttons = form.querySelectorAll('button[type="submit"]');
  buttons.forEach(button => { button.disabled = true; });
  fields.forEach(field => { field.readOnly = true; });
  setLocalized(note, '문의 내용을 보내고 있어요.', 'Sending your inquiry…');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || (await response.json()).ok !== true) throw new Error('Inquiry was not accepted');
    if (form.isConnected && panel.open) showInquiryConfirmation(true, true);
  } catch {
    setLocalized(note, '문의 접수를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      'We couldn’t confirm your inquiry was received. Please try again in a moment.');
  } finally {
    fields.forEach(field => { field.readOnly = false; });
    buttons.forEach(button => { button.disabled = false; });
  }
}

const supportChat = document.getElementById('support-chat');
const chatLaunchers = document.querySelectorAll('[data-chat-launch]');
const chatClose = supportChat.querySelector('.chat-close');
const chatMessages = supportChat.querySelector('.chat-messages');
const chatForm = supportChat.querySelector('.chat-compose');
const chatInput = chatForm.elements.message;
let chatLauncher;

function closeChat(restoreFocus = true) {
  if (supportChat.hidden) return;
  supportChat.hidden = true;
  chatLaunchers.forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (restoreFocus) {
    const visibleLauncher = chatLauncher?.getClientRects().length ? chatLauncher : document.querySelector('.chat-launch');
    visibleLauncher.focus({ preventScroll: true });
  }
}

chatLaunchers.forEach(button => {
  button.addEventListener('click', () => {
    chatLauncher = button;
    supportChat.hidden = false;
    chatLaunchers.forEach(launcher => launcher.setAttribute('aria-expanded', 'true'));
    chatClose.focus({ preventScroll: true });
  });
});
chatClose.addEventListener('click', () => closeChat());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !supportChat.hidden && !panel.open && !searchPanel.open) closeChat();
});
chatForm.addEventListener('submit', event => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const bubble = document.createElement('p');
  bubble.className = 'chat-user-message';
  bubble.textContent = message;
  const reply = description('답변이 필요한 문의는 ‘문의하기’에 남겨 주세요.',
    'For a reply from our team, use Contact us.');
  chatMessages.append(bubble, reply);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatForm.reset();
  chatInput.focus({ preventScroll: true });
});

function openInquiry() {
  closeChat(false);
  const form = document.getElementById('inquiry-template').content.firstElementChild.cloneNode(true);
  const endpoint = form.dataset.inquiryEndpoint?.trim();
  const note = form.querySelector('.inquiry-note');
  if (endpoint) {
    form.elements.email.disabled = false;
    form.elements.email.closest('label').hidden = false;
  }
  if (!productPage.hidden && currentProduct) {
    form.elements.brand.value = currentProduct.brand || '';
    if (detailForm.hidden) {
      if (/^https?:$/.test(location.protocol)) form.elements.url.value = location.href;
      form.elements.message.value = currentProduct.name;
    } else {
      form.elements.size.value = detailForm.querySelector('[name="size"]:checked')?.value || '';
    }
  }
  form.addEventListener('input', () => {
    setLocalized(note, '', '');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.querySelector('button[type="submit"]').disabled) return;
    const byEmail = event.submitter?.value === 'email';
    if (!byEmail || !endpoint) {
      showInquiryConfirmation(byEmail);
      return;
    }
    if (!form.elements.email.value) {
      setLocalized(note, '회신받을 이메일을 입력해 주세요.', 'Enter an email address for our reply.');
      form.elements.email.focus();
      return;
    }
    const data = new FormData(form);
    data.set('subject', '브랜드플래닝 상품 문의 · ' + data.get('brand').trim());
    sendInquiry(form, endpoint, data, note);
  });
  openPanel('상품 문의', form, 'Product inquiry');
}

document.querySelectorAll('[data-inquiry-launch]').forEach(button => {
  button.addEventListener('click', openInquiry);
});

function updatePageTitle() {
  const heading = storePage.hidden ? null : storePage.querySelector(':scope > :not([hidden]) h1');
  document.title = heading ? heading.textContent + ' | BRAND PLANNING' : language === 'en' ? 'BRAND PLANNING' : siteTitle;
}

function renderRoute(moveFocus = false) {
  const hash = location.hash;
  const checkout = checkoutFor(hash);
  const productId = hash.match(/^#product\/([0-9]+)$/)?.[1];
  const product = byId.get(productId) || reviewedProducts.get(productId);
  const [requestedGroup, query] = hash.startsWith('#catalog/') ? hash.slice(9).split('?') : [];
  const scopedBrand = brandRoutes.get(hash) || (requestedGroup === 'max-mara' ? maxMaraGroup : undefined);
  const group = scopedBrand ? 'brand' : Object.hasOwn(collectionTitles, requestedGroup) ? requestedGroup : null;
  const showBrands = hash === '#brands/all';
  const showCommunity = hash === '#community/all';
  const communityEntry = communityById.get(hash.match(/^#community\/([a-z-]+)$/)?.[1]);
  const arrivalRoute = hash.match(/^#arrivals\/(arrival-note|new-in)(?:\/(\d+))?$/);
  const arrivalSeries = arrivalRoute?.[1];
  const showArrivals = hash === '#arrivals/all' || Boolean(arrivalSeries && !arrivalRoute[2]);
  const arrivalPost = arrivalsById.get(arrivalRoute?.[2]);
  const arrivalEntry = arrivalPost?.series === arrivalSeries ? arrivalPost : undefined;
  const showReviews = hash === '#reviews/all';
  const showMagazine = hash === '#magazine/all';
  const showNotices = hash === '#notices/all';
  const showCart = hash === '#cart';
  const magazineEntry = magazineById.get(hash.match(/^#magazine\/(\d+)$/)?.[1]);
  const notice = noticesById.get(hash.match(/^#notices\/([a-z-]+)$/)?.[1]);
  const entry = magazineEntry || notice || arrivalEntry || communityEntry;
  const wasStore = !storePage.hidden;
  const wasCart = !cartPage.hidden;
  const wasReviews = !reviewPage.hidden;
  const heading = product ? detailName : checkout ? checkoutTitle : group ? collectionTitle : showCart ? cartTitle : showBrands ? brandDirectoryTitle
    : showCommunity ? communityPageTitle : showArrivals ? arrivalsPageTitle : showReviews ? reviewPageTitle : showMagazine ? magazinePageTitle
      : showNotices ? noticePageTitle : entry ? editorialTitle : null;
  storePage.hidden = !heading;
  home.hidden = !storePage.hidden;
  productPage.hidden = !product;
  collectionPage.hidden = !group;
  checkoutPage.hidden = !checkout;
  cartPage.hidden = !showCart;
  if (showCart) cartLink.setAttribute('aria-current', 'page');
  else cartLink.removeAttribute('aria-current');
  brandDirectory.hidden = !showBrands;
  communityPage.hidden = !showCommunity;
  arrivalsPage.hidden = !showArrivals;
  reviewPage.hidden = !showReviews;
  magazinePage.hidden = !showMagazine;
  noticePage.hidden = !showNotices;
  editorialArticle.hidden = !entry;
  editorialOriginal.hidden = !arrivalEntry;
  skipLink.href = heading ? '#' + heading.id : '#main';

  if (product) {
    const returning = activeCheckout?.returnHash === hash ? activeCheckout.items[0] : undefined;
    if (!returning) detailReturnHash = wasCart ? '#cart' : wasReviews ? '#reviews/all' : currentCollectionHash;
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
      if (showArrivals) showArrivalSeries(arrivalSeries);
      const listPath = showCart ? '#cart' : showBrands ? '#brands/all' : showReviews ? '#reviews/all'
        : showCommunity || communityEntry ? '#community/all' : showArrivals || arrivalEntry ? arrivalHref(arrivalSeries)
          : showNotices || notice ? '#notices/all' : '#magazine/all';
      storeParent.href = listPath;
      const parent = entry ? notice ? noticePageTitle : communityEntry ? communityPageTitle : magazinePageTitle : heading;
      if (arrivalEntry) setLocalized(storeParent, ARRIVAL_SERIES[arrivalSeries].title);
      else setLocalized(storeParent, parent.dataset.ko, parent.dataset.en);
      if (entry) {
        storeParent.removeAttribute('aria-current');
        if (arrivalEntry) showArrivalEntry(arrivalEntry, listPath);
        else if (communityEntry) showCommunityEntry(communityEntry, listPath);
        else showEditorialEntry(entry, listPath);
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
  if (location.hash === '#notice') history.replaceState(history.state, '', '#notices/all');
  if (location.hash === '#review') history.replaceState(history.state, '', '#reviews/all');
  renderRoute(true);
});

// Homepage sections can scroll without putting the current section in the share URL.
const homeSectionIds = { '#top': 'top', '#weekly': 'weekly', '#classic': 'classic' };
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
const heroToggle = document.getElementById('hero-toggle');
const heroIntervalMs = 5000;
const heroFirst = 1;
const heroLast = heroSlides.length;
let heroPage = 0;
let heroWidth = 0;
let heroDestination;
let heroTimeout;
let heroVisible = false;
let heroPaused = reducedMotion.matches;

function copyHeroSlide(slide) {
  const copy = slide.cloneNode(true);
  copy.inert = true;
  copy.setAttribute('aria-hidden', 'true');
  const photo = copy.querySelector('img');
  photo.removeAttribute('fetchpriority');
  photo.loading = 'lazy';
  return copy;
}

// The end copies let either direction wrap by scrolling just one banner width.
heroTrack.prepend(copyHeroSlide(heroSlides.at(-1)));
heroTrack.append(copyHeroSlide(heroSlides[0]));

function syncHeroControls() {
  heroSlides.forEach((slide, index) => { slide.inert = index !== heroPage; });
  heroDots.forEach((button, index) => {
    if (index === heroPage) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function scheduleHero() {
  window.clearTimeout(heroTimeout);
  const keyboardFocus = heroTrack.matches(':focus-visible') || heroTrack.querySelector(':focus-visible');
  if (!heroVisible || heroPaused || home.hidden || document.hidden || keyboardFocus) return;
  heroTimeout = window.setTimeout(() => {
    if (document.querySelector('dialog[open]') || heroDestination !== undefined) scheduleHero();
    else moveHero({ step: 1 });
  }, heroIntervalMs);
}

function moveHero({ page, step }) {
  // Accept fresh input after the banner has settled.
  if (heroDestination !== undefined || !heroWidth) return;
  window.clearTimeout(heroTimeout);
  const count = heroSlides.length;
  const next = page ?? (heroPage + step + count) % count;
  const current = heroPage + heroFirst;
  let destination = next + heroFirst;
  if (current === heroLast && destination === heroFirst) destination = heroLast + 1;
  else if (current === heroFirst && destination === heroLast) destination = 0;

  if (!reducedMotion.matches && Math.abs(destination - current) === 1) {
    heroDestination = destination;
    heroTrack.scrollTo({ left: heroWidth * destination, behavior: 'smooth' });
  } else {
    heroTrack.scrollTo({ left: heroWidth * (next + heroFirst), behavior: 'instant' });
    settleHero();
  }
}

function settleHero() {
  if (!heroWidth) return;
  const position = Math.round(heroTrack.scrollLeft / heroWidth);
  if (heroDestination !== undefined && position !== heroDestination) return;
  heroDestination = undefined;
  heroPage = (position + heroSlides.length - heroFirst) % heroSlides.length;
  if (position < heroFirst || position > heroLast) {
    heroTrack.scrollTo({ left: heroWidth * (heroPage + heroFirst), behavior: 'instant' });
  }
  syncHeroControls();
  scheduleHero();
}

function interruptHeroMove() {
  heroDestination = undefined;
  scheduleHero();
}

function sizeHero() {
  const width = heroTrack.getBoundingClientRect().width;
  if (width === heroWidth) return;
  heroWidth = width;
  heroDestination = undefined;
  if (width) heroTrack.scrollTo({ left: width * (heroPage + heroFirst), behavior: 'instant' });
}

function updateHeroToggle() {
  setLocalized(heroToggle, heroPaused ? '배너 자동재생 시작' : '배너 자동재생 멈추기',
    heroPaused ? 'Play banner slideshow' : 'Pause banner slideshow', 'aria-label');
  heroToggle.firstElementChild.textContent = heroPaused ? '▶' : 'Ⅱ';
  scheduleHero();
}

heroDots.forEach((button) => button.addEventListener('click', () => moveHero({ page: Number(button.dataset.heroPage) })));
document.querySelectorAll('[data-hero-step]').forEach((button) => {
  button.addEventListener('click', () => moveHero({ step: Number(button.dataset.heroStep) }));
});
if ('onscrollend' in heroTrack) {
  heroTrack.addEventListener('scrollend', settleHero);
} else {
  let heroScrollTimeout;
  heroTrack.addEventListener('scroll', () => {
    window.clearTimeout(heroScrollTimeout);
    heroScrollTimeout = window.setTimeout(settleHero, 150);
  }, { passive: true });
}
heroTrack.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse') interruptHeroMove();
});
heroTrack.addEventListener('wheel', (event) => {
  if (event.deltaX || event.shiftKey) interruptHeroMove();
}, { passive: true });
heroTrack.addEventListener('keydown', (event) => {
  if (event.target !== heroTrack || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  moveHero({ step: event.key === 'ArrowRight' ? 1 : -1 });
});
heroTrack.addEventListener('focusin', scheduleHero);
heroTrack.addEventListener('focusout', () => queueMicrotask(scheduleHero));
heroToggle.addEventListener('click', () => {
  heroPaused = !heroPaused;
  updateHeroToggle();
});
document.addEventListener('visibilitychange', scheduleHero);
new ResizeObserver(sizeHero).observe(heroTrack);
new IntersectionObserver(([entry]) => {
  heroVisible = entry.intersectionRatio >= 0.35;
  scheduleHero();
}, { threshold: 0.35 }).observe(heroTrack);
sizeHero();
syncHeroControls();
updateHeroToggle();

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

function reviewProductLink(review) {
  const link = document.createElement('a');
  link.className = 'button outline review-product-link';
  link.href = '#product/' + review.productId;
  setLocalized(link, '해당 상품 보러가기', 'View product');
  setLocalized(link, '해당 상품 보러가기 · ' + review.title,
    'View product: ' + (REVIEW_TITLES_EN[review.title] || review.title), 'aria-label');
  return link;
}

function reviewDetail(review) {
  const content = reviewContent(review);
  const image = document.createElement('img');
  image.className = 'panel-review-image';
  image.src = asset(review.image);
  setLocalized(image, review.title, REVIEW_TITLES_EN[review.title], 'alt');
  content.prepend(image);
  content.append(reviewProductLink(review));
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

const reviewList = document.getElementById('review-page-list');
reviewList.append(...REVIEWS.map((review) => {
  const item = document.createElement('li');
  const image = document.createElement('img');
  image.src = asset(review.image);
  image.alt = '';
  image.loading = 'lazy';
  const title = document.createElement('h2');
  setLocalized(title, review.title, REVIEW_TITLES_EN[review.title]);
  const copy = reviewContent(review);
  copy.prepend(title);
  copy.append(reviewProductLink(review));
  item.append(image, copy);
  return item;
}));

const magazineById = new Map(MAGAZINE_ARTICLES.map(entry => [entry.id, entry]));
const noticesById = new Map(NOTICES.map(entry => [entry.id, entry]));
const arrivalsById = new Map(ARRIVAL_POSTS.map(entry => [entry.id, entry]));
const communityById = new Map(COMMUNITY_POSTS.map(entry => [entry.id, entry]));
const communityCommentPrefix = 'brandplanning-community-comment:';
const temporaryCommunityComments = new Map();
const commentFormVisibility = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
});

function editorialCard({ href, cover, title, titleEn, label, labelEn, date }) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'magazine-card';
  link.href = href;
  const frame = document.createElement('div');
  frame.className = 'magazine-image';
  const image = document.createElement('img');
  image.src = asset(cover);
  image.alt = '';
  image.loading = 'lazy';
  frame.append(image);
  const copy = document.createElement('span');
  copy.className = 'magazine-copy';
  const source = document.createElement(date ? 'time' : 'span');
  if (date) source.dateTime = date;
  setLocalized(source, label, labelEn);
  const heading = document.createElement('strong');
  setLocalized(heading, title, titleEn);
  copy.append(source, heading);
  link.append(frame, copy);
  item.append(link);
  return item;
}

function magazineCard(entry) {
  return editorialCard({
    href: '#magazine/' + entry.id,
    cover: entry.image,
    title: entry.title,
    titleEn: MAGAZINE_TITLES_EN[entry.id],
    label: '브랜드플래닝',
    labelEn: 'Brand Planning',
  });
}

for (const id of ['magazine-grid', 'magazine-page-grid']) {
  document.getElementById(id).append(...MAGAZINE_ARTICLES.map(magazineCard));
}

function arrivalHref(series = 'all') {
  return '#arrivals/' + series;
}

for (const [key, series] of Object.entries(ARRIVAL_SERIES)) {
  const latest = ARRIVAL_POSTS.find(entry => entry.series === key);
  if (latest) arrivalCategories.append(editorialCard({ ...series, href: arrivalHref(key), cover: latest.cover }));
}

function showArrivalSeries(key) {
  const series = ARRIVAL_SERIES[key];
  setLocalized(arrivalsPageTitle, series?.title ?? '입고 소식', series?.title ?? 'Arrivals');
  arrivalCategories.hidden = Boolean(series);
  arrivalPosts.hidden = !series;
  arrivalsTabs.hidden = !series;
  arrivalsBlogList.hidden = !series;
  if (!series) return;

  arrivalsBlogList.href = series.source;
  for (const link of arrivalsTabs.querySelectorAll('a')) {
    if (link.hash === arrivalHref(key)) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const posts = ARRIVAL_POSTS.filter(entry => entry.series === key);
  arrivalPosts.replaceChildren(...posts.map(entry => editorialCard({
    ...entry,
    href: arrivalHref(key) + '/' + entry.id,
    label: entry.date.replaceAll('-', '.'),
    labelEn: entry.date,
  })));
}

function showArrivalEntry(entry, listPath) {
  const title = ARRIVAL_SERIES[entry.series].title;
  setLocalized(document.getElementById('editorial-source'), `${title} · ${entry.date.replaceAll('-', '.')}`, `${title} · ${entry.date}`);
  setLocalized(editorialTitle, entry.title, entry.titleEn);

  const body = document.getElementById('editorial-body');
  body.classList.remove('magazine-body');
  body.removeAttribute('lang');
  const gallery = document.createElement('div');
  gallery.className = 'arrival-photo-grid';
  for (const photo of entry.photos) {
    const figure = magazineBlock({ images: [photo.image], caption: photo.caption });
    setLocalized(figure.querySelector('figcaption'), photo.caption, photo.captionEn);
    gallery.append(figure);
  }
  body.replaceChildren(description(entry.summary, entry.summaryEn), gallery);
  document.getElementById('editorial-back').href = listPath;
  editorialOriginal.href = 'https://blog.naver.com/brandplanning/' + entry.id;
}

function communityComments(post) {
  const comments = [...(temporaryCommunityComments.get(post.id) ?? [])];
  const prefix = communityCommentPrefix + post.id + ':';
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(prefix)) continue;
      try {
        const comment = JSON.parse(localStorage.getItem(key));
        if (typeof comment?.text === 'string' && typeof comment.author === 'string'
          && Number.isFinite(comment.createdAt) && !Number.isNaN(new Date(comment.createdAt).getTime())) {
          comments.push(comment);
        }
      } catch { /* Skip invalid entries. */ }
    }
  } catch { /* Keep comments available for this visit. */ }
  comments.sort((left, right) => left.createdAt - right.createdAt);
  return [...post.comments, ...comments];
}

function setCommunityMeta(meta, post, count) {
  const englishCount = count === 1 ? '1 comment' : count + ' comments';
  setLocalized(meta, post.topic + ' · 예시 글 · 댓글 ' + count, post.topicEn + ' · Sample post · ' + englishCount);
}

function communityRow(post) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'community-row';
  link.href = '#community/' + post.id;

  const copy = document.createElement('div');
  copy.className = 'community-row-copy';
  const title = document.createElement('strong');
  setLocalized(title, post.title, post.titleEn);
  const excerpt = description(post.text, post.textEn);
  excerpt.className = 'community-excerpt';
  const meta = document.createElement('p');
  meta.className = 'community-meta';
  meta.dataset.communityMeta = post.id;
  setCommunityMeta(meta, post, communityComments(post).length);
  copy.append(title, excerpt, meta);

  const image = document.createElement('img');
  image.src = asset(post.image);
  image.alt = '';
  image.loading = 'lazy';
  link.append(copy, image);
  item.append(link);
  return item;
}

document.getElementById('home-community-list').append(...COMMUNITY_POSTS.slice(0, 3).map(communityRow));
document.getElementById('community-list').append(...COMMUNITY_POSTS.map(communityRow));

function commentRow(comment) {
  const row = document.createElement('li');
  const meta = document.createElement('div');
  meta.className = 'community-comment-meta';
  const author = document.createElement('strong');
  if (comment.author) author.textContent = comment.author;
  else setLocalized(author, '방문자', 'Visitor');
  meta.append(author);
  if (comment.createdAt) {
    const time = document.createElement('time');
    const date = new Date(comment.createdAt);
    const options = { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' };
    time.dateTime = date.toISOString();
    setLocalized(time, new Intl.DateTimeFormat('ko-KR', options).format(date),
      new Intl.DateTimeFormat('en-US', options).format(date));
    meta.append(time);
  } else {
    const sample = document.createElement('span');
    setLocalized(sample, '예시 댓글', 'Sample comment');
    meta.append(sample);
  }
  const text = description(comment.text, comment.textEn);
  text.className = 'community-comment-text';
  row.append(meta, text);
  return row;
}

function renderCommentThread(thread, comments) {
  const count = comments.length;
  setLocalized(thread.querySelector('h2'), '댓글 ' + count, count === 1 ? '1 comment' : count + ' comments');
  thread.querySelector('.community-comment-list').replaceChildren(...comments.map(commentRow));
}

function refreshCommunityComments(post) {
  const comments = communityComments(post);
  for (const meta of document.querySelectorAll('[data-community-meta="' + post.id + '"]')) {
    setCommunityMeta(meta, post, comments.length);
  }
  const thread = document.querySelector('[data-community-thread="' + post.id + '"]');
  if (thread) renderCommentThread(thread, comments);
}

window.addEventListener('storage', event => {
  if (event.key === null) {
    COMMUNITY_POSTS.forEach(refreshCommunityComments);
  } else if (event.key.startsWith(communityCommentPrefix)) {
    const post = communityById.get(event.key.slice(communityCommentPrefix.length).split(':')[0]);
    if (post) refreshCommunityComments(post);
  }
});

function communityCommentThread(post) {
  const thread = document.getElementById('community-comments-template').content.firstElementChild.cloneNode(true);
  thread.dataset.communityThread = post.id;
  applyLanguage(thread);
  renderCommentThread(thread, communityComments(post));
  const form = thread.querySelector('form');
  const message = form.elements.message;
  const status = form.querySelector('.community-comment-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = message.value.trim();
    if (!text) {
      setLocalized(status, '댓글 내용을 입력해 주세요.', 'Enter a comment.');
      message.focus();
      return;
    }

    const comment = { author: form.elements.nickname.value.trim(), text, createdAt: Date.now() };
    const unique = crypto.getRandomValues(new Uint32Array(2)).join('-');
    const key = communityCommentPrefix + post.id + ':' + comment.createdAt + '-' + unique;
    try {
      localStorage.setItem(key, JSON.stringify(comment));
      setLocalized(status, '댓글을 등록했어요.', 'Comment posted.');
    } catch {
      const temporary = temporaryCommunityComments.get(post.id) ?? [];
      temporaryCommunityComments.set(post.id, [...temporary, comment]);
      setLocalized(status, '이 창을 열어 둔 동안 댓글을 볼 수 있어요.', 'Your comment is visible while this tab stays open.');
    }
    message.value = '';
    refreshCommunityComments(post);
    message.focus();
  });
  return thread;
}

function showCommunityEntry(post, listPath) {
  setLocalized(document.getElementById('editorial-source'), post.topic + ' · 예시 글', post.topicEn + ' · Sample post');
  setLocalized(editorialTitle, post.title, post.titleEn);
  const body = document.getElementById('editorial-body');
  body.classList.remove('magazine-body');
  body.removeAttribute('lang');
  body.replaceChildren(description(post.text, post.textEn), magazineBlock({ images: [post.image] }),
    communityCommentThread(post));
  commentFormVisibility.disconnect();
  commentFormVisibility.observe(body.querySelector('.community-comment-form'));
  document.getElementById('editorial-back').href = listPath;
}

const noticeList = document.getElementById('notice-list');
for (const entry of NOTICES) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = '#notices/' + entry.id;
  const copy = document.createElement('span');
  copy.className = 'notice-link-copy';
  const category = NOTICE_CATEGORIES[entry.category];
  if (category) {
    const label = document.createElement('span');
    label.className = 'notice-category';
    setLocalized(label, ...category);
    copy.append(label);
  }
  const title = document.createElement('span');
  setLocalized(title, entry.title, NOTICES_EN[entry.id]?.title);
  copy.append(title);
  link.append(copy);
  item.append(link);
  noticeList.append(item);
}

function showEditorialEntry(entry, listPath) {
  const isMagazine = listPath === '#magazine/all';
  const noticeEn = NOTICES_EN[entry.id];
  const source = document.getElementById('editorial-source');
  const category = NOTICE_CATEGORIES[entry.category];
  if (isMagazine) setLocalized(source, '브랜드플래닝', 'Brand Planning');
  else if (category) setLocalized(source, '브랜드플래닝 공지사항 · ' + category[0], 'Brand Planning announcements · ' + category[1]);
  else setLocalized(source, '브랜드플래닝 공지사항', 'Brand Planning announcements');
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
const campaignVideo = document.getElementById('classic-campaign-video');
let resumeCampaign = true;
let campaignVisible = false;
const campaignObserver = new IntersectionObserver(([entry]) => {
  const visible = !home.hidden && entry.intersectionRatio >= 0.25;
  if (visible === campaignVisible) return;
  campaignVisible = visible;
  if (visible) {
    campaignVideo.hidden = false;
    if (resumeCampaign && !reducedMotion.matches) campaignVideo.play().catch(() => {});
  } else {
    resumeCampaign = !campaignVideo.paused;
    campaignVideo.pause();
  }
}, { threshold: 0.25 });
campaignObserver.observe(campaign);
campaignVideo.querySelector('source').addEventListener('error', () => { campaignVideo.hidden = true; });
panel.addEventListener('close', () => {
  if (!panel.open) panelBody.replaceChildren();
  scheduleReview();
});

renderRoute();
updateSiteHeader();
