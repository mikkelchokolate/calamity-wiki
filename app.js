'use strict';
(() => {
  const D = window.CALAMITY;
  const PUBLIC = window.WIKI_PUBLIC || null;
  if (!D) {
    document.querySelector('#main').textContent = 'Не удалось загрузить базу. Откройте index.html из полной папки вики: рядом должна быть папка data.';
    return;
  }
  const G = window.WIKI_GUIDES || {classes: [], bosses: [], articles: []};
  const DIFF = window.WIKI_DIFFICULTY || {};
  const main = document.querySelector('#main');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => typeof value === 'number' ? value.toLocaleString('ru-RU', {maximumFractionDigits: 2}) : esc(value);
  const index = (rows = []) => Object.fromEntries(rows.map(r => [r.id, r]));
  const items = index(D.items), npcs = index(D.npcs), buffs = index(D.buffs), bosses = index(D.bosses);
  const guides = index(G.classes), bossGuides = index(G.bosses), articles = index(G.articles);
  const classes = {Summon:'Призыватель',Ranged:'Стрелок',Melee:'Воин',Magic:'Маг',Rogue:'Разбойник'};
  const groups = {weapons:'Оружие',armor:'Броня',accessories:'Аксессуары',materials:'Материалы',potions:'Зелья и еда',summons:'Призывалки',tools:'Инструменты',blocks:'Блоки и мебель',lore:'История мира',bags:'Сумки и ящики',pets:'Питомцы и ездовые',other:'Прочие предметы'};
  const iconItems = {Summon:'BelladonnaSpiritStaff',Ranged:'CrackshotColt',Melee:'Murasama',Magic:'Apotheosis',Rogue:'Crystalline'};
  const statNames = {damage:'Базовый урон',defense:'Защита',crit:'Крит. шанс предмета',mana:'Расход маны',useTime:'Время использования',useAnimation:'Анимация атаки',knockBack:'Отбрасывание',shootSpeed:'Скорость снаряда',pick:'Мощность кирки',axe:'Мощность топора × 5',hammer:'Мощность молота',healLife:'Восстановление HP',healMana:'Восстановление маны',bait:'Сила наживки',fishingPole:'Сила удочки',lifeMax:'Базовое здоровье',lifeRevengeance:'База Revengeance',lifeBossRush:'База Boss Rush',knockBackResist:'Множитель отбрасывания',maxStack:'Стак',autoReuse:'Автоиспользование',consumable:'Расходуемый'};
  const statUnits = {crit:'%',pick:'%',hammer:'%',bait:'%',fishingPole:'%',useTime:' тиков',useAnimation:' тиков'};
  const recipesByOutput = {}, recipesByInput = {};
  for (const r of D.recipes) {
    (recipesByOutput[r.output] ||= []).push(r);
    for (const i of r.ingredients) (recipesByInput[i.id] ||= []).push(r);
  }
  function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem('calamity-wiki-' + key)) ?? fallback; } catch { return fallback; } }
  function saveStore(key, value) { try { localStorage.setItem('calamity-wiki-' + key, JSON.stringify(value)); } catch { toast('Браузер запретил сохранение. Изменения останутся до закрытия вкладки.'); } }
  let favorites = readStore('favorites', []), defeated = readStore('defeated', []), difficulty = readStore('difficulty','classic');
  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(defeated)) defeated = [];
  const modes = [
    {id:'classic',label:'Классический',world:'classic',calamity:'normal',expert:false,master:false,revenge:false,death:false},
    {id:'expert',label:'Эксперт',world:'expert',calamity:'normal',expert:true,master:false,revenge:false,death:false},
    {id:'revenge',label:'Эксперт + Revengeance',world:'expert',calamity:'revenge',expert:true,master:false,revenge:true,death:false},
    {id:'master',label:'Мастер',world:'master',calamity:'normal',expert:true,master:true,revenge:false,death:false},
    {id:'death',label:'Мастер + Death',world:'master',calamity:'death',expert:true,master:true,revenge:true,death:true}
  ];
  if(difficulty==='masterRevenge')difficulty='death';
  const mode = () => modes.find(m => m.id === difficulty) || modes[0];
  let toastTimer;
  function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 3000); }
  function image(entry, className = '', eager = false) {
    return entry?.image ? '<img class="' + esc(className) + '" src="' + esc(entry.image) + '" alt="" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async">' : '<span class="sprite-empty" aria-hidden="true"></span>';
  }
  function path(type, id) { return '#/' + type + '/' + encodeURIComponent(id); }
  function normalizeItemId(id) {
    if (typeof id !== 'string') return '';
    if (id.startsWith('v:') && !/^\d+$/.test(id.slice(2))) return 'v:' + (D.vanillaIds[id.slice(2)] ?? id.slice(2));
    return id;
  }
  function item(id) {
    id = normalizeItemId(id);
    if (id.startsWith('v:')) return D.vanilla[id] || {id, name: String(id.slice(2)), en:'Terraria',vanilla:true};
    return items[id];
  }
  function itemLink(id, count, icons = true) {
    id = normalizeItemId(id);
    if (id.startsWith('g:')) {
      const key = id.slice(2), group = D.groups[key];
      return '<a class="item-link" href="' + path('group',key) + '">' + esc(group?.name || key.replace(/([a-z])([A-Z])/g,'$1 $2')) + '</a>' + (count ? ' <b>× ' + number(count) + '</b>' : '');
    }
    const it = item(id);
    if (!it) return '<span class="muted">' + esc(id) + '</span>';
    return '<a class="item-link" href="' + path('item',id) + '">' + (icons ? image(it) : '') + esc(it.name) + '</a>' + (count ? ' <b>× ' + number(count) + '</b>' : '');
  }
  function listLinks(ids) { return '<div class="item-links">' + [...new Set(ids || [])].map(id => itemLink(id)).join('') + '</div>'; }
  function textMarkup(value) {
    let text = esc(value);
    text = text.replace(/\[(?:c\/[0-9A-Fa-f]{6}|ceffect\/[\w]+):([^\]]*)\]/g,'$1');
    text = text.replace(/\[cbuff(?:plr)?:([^\]]+)\]/g,(_,ref)=>{
      const key=ref.split('/').pop(),buff=buffs[key];
      return buff?'<a class="item-link" href="'+path('buff',key)+'">'+image(buff)+esc(buff.name)+'</a>':esc(D.buffNames?.[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2'));
    });
    for(const match of [...text.matchAll(/\[i(?:\/(?:s(\d+)|Terraria))?:(?:CalamityMod\/|Terraria\/)?([\w]+)\]/g)].reverse()){
      const raw=match[2],id=/^\d+$/.test(raw)||(!items[raw]&&raw in D.vanillaIds)?'v:'+raw:raw,label=' '+esc(item(id)?.name||'');
      const end=match.index+match[0].length,duplicate=label.length>1&&text.slice(end).startsWith(label)?label.length:0;
      text=text.slice(0,match.index)+itemLink(id,match[1])+text.slice(end+duplicate);
    }
    return text.replace(/&lt;left&gt;/g,'ЛКМ').replace(/&lt;right&gt;/g,'ПКМ').replace(/\n/g,'<br>');
  }
  function paragraphs(value) { return (Array.isArray(value) ? value : [value]).filter(Boolean).map(p => '<p>' + textMarkup(p) + '</p>').join(''); }
  function evidenceLinks(paths=[],title='Источники') {return paths.length?'<details class="evidence"><summary>'+esc(title)+'</summary>'+[...new Set(paths)].map(p=>'<p class="small"><a href="'+esc(p)+'" target="_blank" rel="noopener">'+esc(p.split('/').pop())+'</a></p>').join('')+'</details>':'';}
  function linkPublicSources(){
    if(PUBLIC)for(const link of main.querySelectorAll('a[href^="sources/"]')){
      link.href='#/sources?file='+encodeURIComponent(link.getAttribute('href'));
      link.removeAttribute('target');
    }
  }
  function bulletList(values = []) { return '<ul>' + values.map(v => '<li>' + textMarkup(typeof v === 'string' ? v : v.body || v.text || '') + '</li>').join('') + '</ul>'; }
  function breadcrumb(...parts) { return '<div class="breadcrumb"><a href="#/">Вики</a>' + parts.map(p => ' <span aria-hidden="true">/</span> ' + (Array.isArray(p) ? '<a href="' + esc(p[1]) + '">' + esc(p[0]) + '</a>' : '<span>' + esc(p) + '</span>')).join('') + '</div>'; }
  const bookmarkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
  function favoriteButton(route) { return '<button class="button ' + (favorites.includes(route) ? 'selected' : '') + '" data-favorite="' + esc(route) + '">' + bookmarkIcon + (favorites.includes(route) ? 'В избранном' : 'В избранное') + '</button>'; }
  function pageHeading(title, route, subtitle = '') { return '<div class="page-heading"><div><h1>' + esc(title) + '</h1>' + (subtitle ? '<p class="muted small">' + esc(subtitle) + '</p>' : '') + '</div>' + (route ? favoriteButton(route) : '') + '</div>'; }
  function footer() { return '<footer class="footer"><span>Calamity 2.2.4 · '+(PUBLIC?'Неофициальная вики · Calamity © Azafure, LLC':'Локальная копия · Интернет для чтения не нужен')+'</span><a href="#/sources">Источники и точность данных</a></footer>'; }
  function sourceLine(source, extra = '') { return '<div class="source-line">Источник: <a href="' + esc(source) + '" target="_blank" rel="noopener">'+(PUBLIC?'сведения об источнике':source.startsWith('sources/vanilla/')?'локализация установленной Terraria':'код установленной версии 2.2.4')+'</a>' + (extra ? ' · ' + extra : '') + '</div>'; }
  function sourceDetails(kind, id, label = 'Точные правила из кода') {
    const data = window.CALAMITY_DETAILS?.[kind + '/' + id];
    if (!data) return '';
    return '<details><summary>' + esc(label) + '</summary>' + Object.entries(data).map(([name,code]) => '<h3 class="small">' + esc(name) + '</h3><pre>' + esc(code) + '</pre>').join('') + '</details>';
  }
  function statBox(entry, keys, extra = '') {
    if(entry.id?.startsWith('v:'))return '<div class="infobox"><h2>'+esc(entry.en||entry.name)+'</h2><div class="subtitle">Предмет Terraria</div></div>';
    const stats = entry.stats || {};
    return '<div class="infobox"><div class="portrait">' + image(entry,'',true) + '</div><h2>' + esc(entry.name) + '</h2><div class="subtitle">' + esc(entry.class ? classes[entry.class] : entry.group ? groups[entry.group] : 'Calamity Mod 2.2.4') + '</div><dl>' +
      keys.filter(k => stats[k] !== undefined).map(k => '<div><dt>' + esc(statNames[k] || k) + '</dt><dd>' + (typeof stats[k] === 'boolean' ? (stats[k] ? 'Да' : 'Нет') : number(stats[k]) + (statUnits[k] || '')) + '</dd></div>').join('') + extra + '</dl><p class="muted small">Значения до модификаторов игрока, префиксов, глобальных правил и настроек мира. 60 тиков = 1 секунда.</p></div>';
  }
  function toc(sections) { return '<nav class="toc" aria-label="На этой странице"><strong>На этой странице</strong>' + sections.map(([id,name]) => '<a href="#' + esc(id) + '" data-scroll="' + esc(id) + '">' + esc(name) + '</a>').join('') + '</nav>'; }
  function home() {
    const categoryIcons = {weapons:'Murasama',armor:'WulfrumHat',accessories:'RogueEmblem',materials:'AerialiteBar',potions:'BloodOrb',summons:'DesertMedallion',tools:'CrystylCrusher',blocks:'AstralBeaconItem'};
    const counts = Object.fromEntries(Object.keys(groups).map(key => [key,D.items.filter(i => i.group === key).length]));
    return breadcrumb('Главная') + '<section class="welcome"><div><h1>Твоя энциклопедия<br>мира Calamity.</h1><p class="lead">От первого вульфрумового механизма до последней битвы. Предметы, рецепты и маршруты прохождения для версии, в которую вы играете.</p><div class="button-row"><a class="button primary" href="#/progression">Продолжить путешествие</a><a class="button" href="#/items">Открыть каталог</a></div><div class="intro-counts"><span><b>' + number(D.items.length) + '</b> предметов</span><span><b>' + number(D.recipes.length) + '</b> рецептов</span><span><b>26</b> боссов</span><span>Все 5 классов</span></div></div><figure class="welcome-art"><img src="assets/theme/menu-modern.png" width="640" height="360" alt="Пиксельный пейзаж и воин из главного меню Calamity"><figcaption>Calamity Mod · мир, в котором вы играете</figcaption></figure></section>' +
      '<div class="home-columns"><div><section class="coop-panel"><h2>Ваш дуэт: призыватель и стрелок</h2><p>Два маршрута снаряжения, одна экспедиция. Сборки по этапам и советы для игры вдвоём.</p><div class="coop-classes">' + ['Summon','Ranged'].map(c => '<a href="' + path('class',c) + '" class="coop-class">' + image(items[iconItems[c]]) + '<span><strong>' + classes[c] + '</strong><small>' + (c === 'Summon' ? 'Миньоны, кнуты, турели' : 'Луки, пули, боеприпасы') + '</small></span></a>').join('') + '</div></section>' +
      '<div class="section-heading"><h2>Найти нужное</h2><a href="#/items">Все предметы →</a></div><div class="category-grid">' + Object.entries(categoryIcons).map(([group,id]) => '<a class="category-link" href="#/items?group=' + group + '">' + image(items[id] || D.items.find(i=>i.group === group)) + '<span>' + groups[group] + ' <small>' + number(counts[group]) + '</small></span><span class="arrow" aria-hidden="true">→</span></a>').join('') + '</div></div>' +
      '<div><div class="section-heading"><h2>Путеводитель</h2></div><ul class="quick-list"><li><a href="#/classes"><span>Выбрать свой класс<span class="sub">Оружие, броня и аксессуары по этапам</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/bosses"><span>Подготовиться к боссу<span class="sub">Призыв, арена, добыча и сложность</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/world"><span>Исследовать мир<span class="sub">Бездна, затонувшее море, лаборатории</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/mechanics"><span>Разобраться в механиках<span class="sub">Режимы, метки кнутов и развитие</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/favorites"><span>Мои заметки на полях<span class="sub">Сохранённые статьи и предметы</span></span><span aria-hidden="true">→</span></a></li></ul><div class="patch-note"><strong>Проверено по вашей версии</strong><p>В 2.2.4 Snow Ruffian относится к стрелку, а Desert Prowler — к разбойнику. Руководства учитывают эти изменения.</p><a class="small" href="#/sources">Как собрана эта вики →</a></div></div></div>';
  }
  const searchIndex = [
    ...D.items.map(e=>({id:e.id,title:e.name,type:'Предмет',route:path('item',e.id),image:e.image,text:[e.id,e.name,e.tooltip,classes[e.class],groups[e.group]].join(' ')})),
    ...D.bosses.map(e=>({id:e.id,title:bossGuides[e.id]?.title || e.name,type:e.kind==='boss'?'Босс':e.kind==='event'?'Событие':'Мини-босс',route:path('boss',e.id),image:e.image,text:[e.id,e.name,bossGuides[e.id]?.title,e.spawn].join(' ')})),
    ...D.npcs.map(e=>({id:e.id,title:e.name,type:'Существо',route:path('npc',e.id),image:e.image,text:[e.id,e.name,e.description,...e.biomeTags].join(' ')})),
    ...D.buffs.map(e=>({id:e.id,title:e.name,type:e.debuff?'Дебафф':'Бафф',route:path('buff',e.id),image:e.image,text:[e.id,e.name,e.description].join(' ')})),
    ...G.articles.map(e=>({id:e.id,title:e.title,type:'Руководство',route:path('article',e.id),text:[e.title,e.summary].join(' ')})),
    ...G.classes.map(e=>({id:e.id,title:e.title,type:'Класс',route:path('class',e.id),image:items[iconItems[e.id]]?.image,text:[e.title,e.id,e.summary].join(' ')})),
    ...Object.values(D.vanilla).map(e=>({id:e.id,title:e.name,type:'Terraria · рецепты мода',route:path('item',e.id),text:[e.name,e.en,e.key].join(' ')}))
  ];
  const normalize = value => String(value || '').toLowerCase().replace(/ё/g,'е').normalize('NFKC');
  for (const e of searchIndex) {e.query = normalize(e.text); e.titleQuery = normalize(e.title);e.idQuery = normalize(e.id);}
  function search(query) {
    const q = normalize(query).trim(), tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return searchIndex.filter(e => tokens.every(t=>e.query.includes(t))).map(e=>({entry:e,score:e.titleQuery===q||e.idQuery===q?0:e.titleQuery.startsWith(q)?1:e.titleQuery.includes(q)?2:3})).sort((a,b)=>a.score-b.score || a.entry.title.localeCompare(b.entry.title,'ru')).map(e=>e.entry);
  }
  function searchPage(params) {
    const query = params.get('q') || '', results = search(query), page = Math.max(1,Number(params.get('page'))||1), pageSize=50;
    return breadcrumb('Поиск') + pageHeading('Результаты поиска') + '<p class="muted">По запросу <strong>' + esc(query || '…') + '</strong>: ' + number(results.length) + '</p>' + (results.length ? '<div class="search-list">' + results.slice((page-1)*pageSize,page*pageSize).map(e=>'<div class="search-hit">' + image(e) + '<div><h3><a href="' + e.route + '">' + esc(e.title) + '</a></h3><p>' + esc(e.type) + '</p></div></div>').join('') + '</div>' + pagination(results.length,page,pageSize,params) : '<div class="empty-state"><h2>Совпадений нет</h2><p class="muted">Попробуйте английское название из игры или часть слова. Например: Wulfrum, кнуты, Бездна.</p><a href="#/items" class="button">Посмотреть каталог</a></div>');
  }
  function pagination(total,page,size,params) {
    const pages=Math.max(1,Math.ceil(total/size));
    const url=p=>{const next=new URLSearchParams(params);next.set('page',p);return '#/'+currentRoute+'?'+next;};
    return '<div class="pagination">' + (page>1?'<a class="button" href="'+url(page-1)+'">← Назад</a>':'<span></span>') + '<span>Страница '+page+' из '+pages+'</span>'+(page<pages?'<a class="button" href="'+url(page+1)+'">Далее →</a>':'<span></span>')+'</div>';
  }
  function select(name,options,value,label) {return '<label>'+esc(label)+'<select name="'+name+'">'+Object.entries(options).map(([id,text])=>'<option value="'+esc(id)+'" '+(id===value?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';}
  function catalog(kind,params) {
    let rows = kind==='items'?D.items:kind==='npcs'?D.npcs:D.buffs;
    const title=kind==='items'?'Предметы':kind==='npcs'?'Бестиарий':'Баффы и дебаффы';
    const q=normalize(params.get('q')||'');
    if(q) rows=rows.filter(e=>normalize([e.id,e.name,e.tooltip,e.description].join(' ')).includes(q));
    if(params.get('group')) rows=rows.filter(e=>e.group===params.get('group'));
    if(params.get('class')) rows=rows.filter(e=>e.class===params.get('class'));
    if(params.get('type')) rows=rows.filter(e=>params.get('type')==='debuff'?e.debuff:params.get('type')==='buff'?!e.debuff:params.get('type')==='town'?e.town:!e.town);
    const sort=params.get('sort')||'name';
    rows=[...rows].sort((a,b)=>sort==='damage'?(b.stats?.damage||0)-(a.stats?.damage||0)||a.name.localeCompare(b.name):a.name.localeCompare(b.name,'en'));
    const page=Math.min(Math.max(1,Number(params.get('page'))||1),Math.max(1,Math.ceil(rows.length/60)));
    let html=breadcrumb(title)+pageHeading(title)+'<p class="lead">'+(kind==='items'?'Все предметы Calamity из установленной сборки: характеристики, описания, рецепты и применение.':kind==='npcs'?'Существа, жители и части боссов. Включены все типы NPC из сборки; отдельные части составных боссов имеют собственные страницы.':'Игровые эффекты из текущей версии. Английские названия совпадают с оригиналом мода.')+'</p><form class="filters" id="catalog-filters"><label class="filter-search">Найти в разделе<input name="q" type="search" value="'+esc(params.get('q')||'')+'" placeholder="Название или часть описания"></label>';
    if(kind==='items') html+=select('group',{'':'Все категории',...groups},params.get('group')||'','Категория')+select('class',{'':'Все классы',...classes},params.get('class')||'','Класс оружия');
    if(kind==='npcs') html+=select('type',{'':'Все существа',town:'Городские NPC',enemy:'Остальные NPC'},params.get('type')||'','Тип');
    if(kind==='buffs') html+=select('type',{'':'Все эффекты',buff:'Баффы',debuff:'Дебаффы'},params.get('type')||'','Тип');
    html+=select('sort',{name:'По алфавиту',...(kind==='items'?{damage:'По базовому урону'}:{})},sort,'Сортировка')+'<button class="button" type="submit">Найти</button></form><div class="count-line"><span>'+number(rows.length)+' записей</span>'+(params.size?'<a href="#/'+kind+'">Сбросить фильтры</a>':'')+'</div>';
    if(!rows.length) return html+'<div class="empty-state"><h2>Ничего не найдено</h2><p class="muted">Измените название, категорию или класс оружия.</p><a class="button" href="#/'+kind+'">Сбросить фильтры</a></div>';
    return html+'<div class="table-wrap"><table><thead><tr><th>Название</th><th>Категория</th>'+(kind!=='buffs'?'<th>Урон</th><th class="hide-mobile">Защита</th>':'')+'</tr></thead><tbody>'+rows.slice((page-1)*60,page*60).map(e=>'<tr><td><a class="item-cell" href="'+path(kind==='items'?'item':kind==='npcs'?'npc':'buff',e.id)+'">'+image(e)+'<span>'+esc(e.name)+'<small>'+(classes[e.class]||'')+'</small></span></a></td><td class="numeric">'+esc(kind==='items'?groups[e.group]:kind==='npcs'?(e.town?'Житель':e.boss?'Босс':e.biomeTags?.join(', ')||e.namespace):(e.debuff?'Дебафф':'Бафф'))+'</td>'+(kind!=='buffs'?'<td class="numeric">'+(e.stats?.damage!==undefined?number(e.stats.damage):'—')+'</td><td class="numeric hide-mobile">'+(e.stats?.defense!==undefined?number(e.stats.defense):'—')+'</td>':'')+'</tr>').join('')+'</tbody></table></div>'+pagination(rows.length,page,60,params);
  }
  function conditionLabel(condition) {
    if (D.conditionText[condition]) return D.conditionText[condition];
    if (condition.startsWith('Condition.')) return D.conditionText[condition.replace('Condition.','Conditions.')] || ({'Condition.InGraveyard':'В биоме кладбища','Condition.NearWater':'Рядом с водой','Condition.NearShimmer':'Рядом с мерцанием','Condition.RemixWorld':'В мире с сидом remix','Condition.NotRemixWorld':'В обычном мире (не remix)'}[condition]) || condition;
    let m=condition.match(/ConstructRecipeCondition\((\d)/);
    if(m) return 'Изучена схема арсенала уровня '+m[1];
    m=condition.match(/ConstructRecipeCondition\("([^"]+)"/);
    if(m) return 'Найдена схема лаборатории: '+({'Hell':'Преисподняя','Ice':'Лёд','Jungle':'Джунгли','Planetoid':'Планетоид','Sunken Sea':'Затонувшее море'}[m[1]]||m[1]);
    if(condition.includes('Alchemy')) return 'Алхимический стол может сохранить ингредиенты';
    return condition;
  }
  function station(tile) {
    const alias=D.tileAliases[tile];
    if(alias) return itemLink(alias,undefined,false);
    const common={'16':'Наковальня','17':'Печь','18':'Верстак','26':'Демонический / кровавый алтарь','77':'Адская кузня','96':'Котёл','101':'Книжный шкаф','106':'Лесопилка','114':'Мастерская изобретателя','133':'Адамантитовая / титановая печь','134':'Мифриловая / орихалковая наковальня','247':'Автомолот','283':'Тяжёлый верстак','302':'Станок для клонирования плоти','303':'Стеклянная печь','354':'Древний манипулятор','355':'Алхимический стол','412':'Кристальный шар'};
    return esc(common[tile]||D.tileNames[tile]||tile.replace(/([a-z])([A-Z])/g,'$1 $2'));
  }
  function recipeCard(recipe,quantity=1) {
    const batches=typeof recipe.count==='number'?Math.ceil(quantity/recipe.count):1;
    return '<div class="recipe"><div class="recipe-title">'+itemLink(recipe.output)+' <span class="muted">× '+number(recipe.count*batches||recipe.count)+'</span></div><div class="ingredients">'+recipe.ingredients.map(i=>'<span class="ingredient">'+itemLink(i.id,typeof i.count==='number'?i.count*batches:i.count)+'</span>').join('')+'</div><div class="recipe-meta"><span>Место создания: '+(recipe.tiles.length?recipe.tiles.map(station).join(' / '):'Вручную')+'</span>'+recipe.conditions.map(c=>'<span>'+esc(conditionLabel(c))+'</span>').join('')+(recipe.contextDependent?'<span>У этого рецепта есть контекстные условия; смотрите сведения об источнике.</span>':'')+(recipe.decraft?.some(x=>x.startsWith('DisableDecraft'))?'<span>Разбор через мерцание отключён.</span>':'')+'</div><details><summary>Источник рецепта</summary>'+(recipe.raw?'<pre>'+esc(recipe.raw)+'</pre>':'')+'<a class="small" href="'+esc(recipe.source)+'" target="_blank" rel="noopener">'+(PUBLIC?'Сведения об источнике':'Открыть полный файл')+'</a></details></div>';
  }
  function ingredientUsage(id) {
    const rows=recipesByInput[id]||[];
    if(!rows.length) return '<p class="muted small">В извлечённых рецептах не используется как прямой ингредиент. Применение через группы материалов может быть указано отдельно.</p>';
    return '<div class="item-links">'+[...new Set(rows.map(r=>r.output))].map(output=>itemLink(output)).join('')+'</div>';
  }
  function itemPage(id) {
    id=normalizeItemId(id);const entry=item(id);
    if(!entry) return missing();
    const vanilla=id.startsWith('v:'),recipes=recipesByOutput[id]||[];
    const sections=[['description','Описание'],['obtaining','Как получить'],['recipes','Рецепты'],['used-in','Используется для']];
    let html=breadcrumb(['Предметы','#/items'],entry.name)+pageHeading(entry.name,path('item',id),vanilla?'Предмет Terraria · рецепты и связи в Calamity':(groups[entry.group]||'Предмет')+(entry.class?' · '+classes[entry.class]:''));
    html+='<div class="article-layout"><article class="article-body"><h2 id="description">Описание</h2>';
    if(entry.tooltip) html+='<div class="tooltip">'+textMarkup(entry.tooltip)+'</div>';
    else html+='<p>'+esc(vanilla?'Предмет базовой Terraria. Ниже показаны рецепты и применение, добавленные Calamity.':'Предмет категории «'+(groups[entry.group]||'Прочее')+'». Дополнительное игровое описание в локализации отсутствует; свойства и способы получения приведены ниже.')+'</p>';
    const unresolvedNote='<p class="small muted">Пометка «см. правило» означает, что параметр не вычислен из копии мода. Его исходное правило доступно внизу страницы; значение может зависеть от состояния игры или настроек.</p>';
    if(entry.tooltipIncomplete)html+=unresolvedNote;
    if(entry.wikiNote)html+='<p class="notice">'+esc(entry.wikiNote)+'</p>';
    if(vanilla)html+='<p class="small muted">'+esc(entry.en)+'. Характеристики и обычный рецепт — в базовой Terraria; ниже собраны рецепты и связи, добавленные Calamity.</p>';
    if(entry.keyControlNote)html+='<p class="small muted">«Назначенная клавиша» — клавиша способности из ваших настроек управления Calamity. Вики не читает и не меняет ваши настройки.</p>';
    if(entry.armorControlNote)html+='<p class="small muted">Активный бонус комплекта включается назначенной клавишей или двойным нажатием вниз/вверх — это зависит от ваших настроек управления Calamity.</p>';
    const extraNames={SetBonus:'Бонус комплекта',CommonSetBonus:'Общий бонус комплекта',SetBonusEffect:'Эффект комплекта',StealthStrike:'Скрытный удар',Lore:'История',ComboInfo:'Комбинация атак',ParryInfo:'Парирование',BlastInfo:'Особая атака',BlastInfoKeybind:'Особая атака: назначенная клавиша',TooltipNormal:'Обычный мир',TooltipGFB:'Особый сид get fixed boi',HoldShiftTooltip:'Подробности (Shift в игре)',SalesPitch:'Описание торговца',FlavorTooltip:'Дополнительное описание',DripEffect:'Эффект напитка',Equipped:'При экипировке',Unequipped:'Без экипировки',DefaultFunction:'Основное действие',DefaultPassive:'Пассивный эффект',MainInfo:'Основная атака',AltInfo:'Альтернативная атака',SetBonus1:'Бонус комплекта — часть 1',SetBonus2:'Бонус комплекта — часть 2',SetBonus3:'Бонус комплекта — часть 3'};
    if(entry.extra) for(const [key,value] of Object.entries(entry.extra)) if(value) html+='<details><summary>'+esc(extraNames[key]||(key.startsWith('Content')?'Текст записки':key.includes('GFB')?'Особый сид get fixed boi':key.includes('Locked')?'Условия разблокировки':'Дополнительные свойства'))+'</summary><div class="tooltip">'+textMarkup(value)+'</div>'+(entry.extraIncomplete?.includes(key)?unresolvedNote:'')+'</details>';
    if(entry.conditions) html+='<details><summary>Условия использования</summary><pre>'+esc(entry.conditions)+'</pre></details>';
    html+='<h2 id="obtaining">Как получить</h2>';
    if(entry.droppedBy?.length) html+='<p class="small muted">Присутствует в таблице добычи следующих источников. Точный шанс и условия смотрите на странице источника.</p><div class="item-links">'+entry.droppedBy.map(ref=>{const [kind,key]=ref.split('/');const source=kind==='item'?items[key]:npcs[key];return '<a class="item-link" href="'+path(kind,key)+'">'+image(source)+esc(source?.name||key)+'</a>';}).join('')+'</div>';
    if(entry.shops?.length) html+='<h3>Торговцы</h3><p class="small muted">Наличие товара зависит от прогресса и условий магазина.</p><div class="item-links">'+entry.shops.map(key=>'<a href="'+path('npc',key)+'">'+esc(npcs[key]?.name||key)+'</a>').join('')+'</div>';
    if(!entry.droppedBy?.length&&!entry.shops?.length) html+='<p class="muted small">'+(recipes.length?'Создаётся по рецептам ниже.':'Прямой рецепт или персональная таблица добычи не найдены. Предмет может выдаваться миром, рыбалкой, общим правилом добычи или быть служебным. Это не означает, что он недоступен.')+'</p>';
    if(entry.worldReferences?.length) html+='<details><summary>Упоминания в правилах мира и общей добычи</summary><p class="small muted">Это ссылки на использующие предмет правила, а не гарантированные места получения.</p>'+entry.worldReferences.map(source=>'<p class="small"><a href="'+esc(source)+'" target="_blank" rel="noopener">'+esc(source.split('/').pop().replace('.cs',''))+'</a></p>').join('')+'</details>';
    html+='<div class="recipe-controls"><h2 id="recipes">Рецепты</h2>'+(recipes.length?'<label class="quantity-label">Нужно штук<input id="craft-quantity" aria-label="Нужное количество предметов" type="number" min="1" max="999999" value="1"></label>':'')+'</div><div id="item-recipes">'+(recipes.length?recipes.map(r=>recipeCard(r)).join(''):'<p class="muted small">В этой версии прямой рецепт не зарегистрирован.</p>')+'</div><h2 id="used-in">Используется для</h2>'+ingredientUsage(id);
    if(entry.loot?.length) html+='<h2 id="contents">Содержимое</h2>'+difficultyControls()+lootTable(entry.loot);
    if(entry.source) html+=sourceDetails('item',id)+sourceLine(entry.source);
    else html+='<div class="source-line">Названия Terraria: локализация tModLoader. Рецепты: установленный Calamity 2.2.4. Полная ванильная энциклопедия сюда не включена.</div>';
    html+='</article><aside>'+statBox(entry,['damage','defense','crit','mana','useTime','useAnimation','knockBack','shootSpeed','pick','axe','hammer','healLife','healMana','bait','fishingPole','maxStack','autoReuse','consumable'])+toc(sections)+'</aside></div>';
    return html;
  }
  function difficultyControls() {
    const options=mode().world==='classic'?{normal:'Обычный'}:mode().world==='expert'?{normal:'Обычный',revenge:'Revengeance'}:{normal:'Обычный',death:'Death'};
    return '<form class="filters difficulty-controls" aria-label="Сложность мира и Calamity"><img class="mode-emblem" src="assets/theme/'+(difficulty==='revenge'?'rev':mode().id)+'.png" alt="">'+select('worldDifficulty',{classic:'Классический',expert:'Эксперт',master:'Мастер'},mode().world,'Сложность мира')+select('modDifficulty',options,mode().calamity,'Режим Calamity')+'<p class="small muted" style="margin:0">В 2.2.4 Мастер + Revengeance = Death.<br>Выбор меняет только данные вики.</p></form>';
  }
  function lootEligible(row) {
    const m=mode(),requirement=row.requirement;
    if(requirement==='normal') return !m.expert;
    if(requirement==='expert') return m.expert;
    if(requirement==='master') return m.master;
    if(requirement==='revenge') return m.revenge;
    if(requirement==='revOrMaster') return m.revenge||m.master;
    if(row.condition?.startsWith('Только обычный')||row.condition?.startsWith('Обычный режим:')) return !m.expert;
    if(row.condition?.startsWith('Эксперт / Мастер')) return m.expert;
    return true;
  }
  function lootTable(loot,bagName='') {
    const rows=loot.filter(lootEligible);
    if(!rows.length) return '<p class="muted small">Для выбранного режима в этой таблице нет подходящих записей.</p>';
    return '<div class="table-wrap"><table><thead><tr><th>Предмет</th><th>Количество</th><th>Шанс</th><th>Условия</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+itemLink(row.id)+'</td><td class="numeric">'+(row.min!=null?number(row.min)+(row.max&&row.max!==row.min?'–'+number(row.max):''):'Условно')+'</td><td class="numeric">'+(row.chance===null||row.chance===undefined?'Условный':number(row.chance)+'%')+'</td><td class="small muted">'+esc(row.condition||'Особое правило')+(bagName?'<br>Из сумки '+esc(bagName):'')+'</td></tr>').join('')+'</tbody></table></div><p class="small muted" style="margin-top:12px">Шанс действует при выполнении условий строки; удача и настройки могут влиять на итог. Группы оружия учитывают правило гарантированной хотя бы одной награды.</p>';
  }
  function bossList(params) {
    const type=params.get('type')||'boss', rows=D.bosses.filter(b=>type==='all'||b.kind===type);
    return breadcrumb('Боссы и события')+pageHeading('Боссы и события')+'<p class="lead">Порядок из реестра Calamity. Откройте бой: призыв, подготовка, тактика и добыча с переключателем сложности.</p><div class="chips">'+[['boss','Основные боссы · 26'],['miniboss','Мини-боссы · 5'],['event','События · 4'],['all','Все записи']].map(([id,label])=>'<a href="#/bosses?type='+id+'" class="chip '+(type===id?'active':'')+'">'+label+'</a>').join('')+'</div><div class="boss-grid">'+rows.map(b=>'<a href="'+path('boss',b.id)+'" class="boss-tile">'+image(b)+'<span><strong>'+esc(bossGuides[b.id]?.title||b.name)+'</strong><small>'+esc(b.name)+'</small><small>'+stageName(b.order)+'</small></span></a>').join('')+'</div>';
  }
  function stageName(order) {return order<7?'До хардмода':order<18?'Хардмод':'После Лунного лорда';}
  function bossHealthBox(boss) {
    const facts=DIFF.bosses?.[boss.id],npc=npcs[facts?.npc]||boss.npcs.map(id=>npcs[id]).find(n=>n?.stats?.lifeMax!==undefined);
    if(!npc) return '<div class="infobox"><div class="portrait">'+image(boss)+'</div><h2>'+esc(bossGuides[boss.id]?.title||boss.name)+'</h2><p class="small muted">Событие или составная встреча. Характеристики отдельных существ — на их страницах.</p></div>';
    const data=facts?.health?.[difficulty]??facts?.health?.[difficulty==='revenge'?'revengeance':difficulty];
    const base=mode().revenge?(npc.stats.lifeRevengeance??npc.stats.lifeMax):npc.stats.lifeMax;
    return '<div class="infobox"><div class="portrait">'+image(boss,'',true)+'</div><h2>'+esc(bossGuides[boss.id]?.title||boss.name)+'</h2><div class="subtitle">'+esc(mode().label)+'</div><dl><div><dt>'+(data!==null&&data!==undefined?'Здоровье':'Базовое здоровье')+'</dt><dd data-boss-health>'+number(data??base)+'</dd></div>'+['damage','defense'].filter(k=>npc.stats[k]!==undefined||facts?.[k]?.[difficulty]!==undefined).map(k=>'<div><dt>'+(k==='damage'?'Урон при появлении':'Защита при появлении')+'</dt><dd>'+number(facts?.[k]?.[difficulty]??npc.stats[k])+'</dd></div>').join('')+'</dl><p class="small muted">'+esc(facts?.healthLabel||'База из SetDefaults до масштабирования сложности и числа игроков.')+'</p><p class="small muted">Компонент: <a href="'+path('npc',npc.id)+'">'+esc(npc.name)+'</a>.</p><p class="small muted">Для одного игрока, обычный сид, усиление HP в настройках: 0%. В вашей игре вдвоём HP может отличаться. Урон фаз и снарядов здесь не рассчитан.</p>'+((facts?.notes||[]).map(note=>'<p class="small muted">'+esc(note)+'</p>').join(''))+'</div>';
  }
  function difficultyEvidence(id) {
    const facts=DIFF.bosses?.[id];if(!facts)return '';
    let html='';
    const rows=[...(facts.components||[]),...(facts.variants||[])];
    if(rows.length)html+='<h3>Части встречи и варианты</h3><div class="table-wrap"><table><thead><tr><th>Часть / вариант</th><th>HP · 1 игрок</th><th>Условия</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+(r.npc&&npcs[r.npc]?'<a href="'+path('npc',r.npc)+'">'+esc(r.name||npcs[r.npc].name)+'</a>':esc(r.name||r.label||'Вариант'))+'</td><td class="numeric">'+number(r.health?.[difficulty]??'—')+'</td><td class="small muted">'+esc(r.condition||r.label||r.notes?.join(' ')||r.healthLabel||'Отдельная часть встречи')+'</td></tr>').join('')+'</tbody></table></div>';
    return html+'<details><summary>Расчёт характеристик и источники</summary><p class="small">'+esc(facts.scaling)+'</p>'+(facts.evidence||[]).map(e=>'<p class="small"><a target="_blank" rel="noopener" href="'+esc(e.path)+'">'+esc(e.path.split('/').pop())+'</a>: '+esc(e.detail||'')+'</p>').join('')+'</details>';
  }
  function bossPage(id) {
    const b=bosses[id],g=bossGuides[id];if(!b)return missing();
    const loot=b.npcs.flatMap(key=>npcs[key]?.loot||[]);
    const uniqueLoot=[...new Map(loot.map(r=>[r.id+'|'+r.condition+'|'+r.min+'|'+r.max+'|'+r.chance,r])).values()];
    const bags=uniqueLoot.filter(r=>r.condition?.startsWith('Эксперт / Мастер')||items[r.id]?.group==='bags').map(r=>items[r.id]).filter(Boolean);
    let html=breadcrumb(['Боссы','#/bosses'],g?.title||b.name)+pageHeading(g?.title||b.name,path('boss',id),b.name)+'<p class="lead">'+esc(g?.summary||b.spawn)+'</p>'+difficultyControls();
    html+='<div class="article-layout"><article class="article-body"><h2 id="summon">Как призвать</h2>'+paragraphs(g?.summon||b.spawn)+listLinks(b.summons);
    if(g){html+='<h2 id="arena">Арена и подготовка</h2>'+paragraphs(g.arena)+'<h2 id="tactics">Тактика боя</h2>'+bulletList(g.tactics||[])+'<h3>Призыватель + стрелок</h3>'+paragraphs(g.coop)+'<h2 id="unlocks">Что открывает победа</h2>'+paragraphs(g.unlocks);}
    html+='<h2 id="loot">Добыча · '+esc(mode().label)+'</h2>'+(b.lootNote?'<p class="small muted">'+esc(b.lootNote)+'</p>':'')+lootTable(uniqueLoot);
    if(mode().expert) for(const bag of bags) if(bag.loot?.length) html+='<h3>Содержимое '+esc(bag.name)+'</h3><p class="small">'+itemLink(bag.id)+'</p>'+lootTable(bag.loot,bag.name);
    html+='<h2 id="parts">Участники и части босса</h2><div class="item-links">'+b.npcs.filter(key=>npcs[key]).map(key=>'<a class="item-link" href="'+path('npc',key)+'">'+image(npcs[key])+esc(npcs[key].name)+'</a>').join('')+'</div>'+difficultyEvidence(id)+evidenceLinks(g?.evidence,'Источники руководства')+'<div class="notice">Тактика — рекомендации для подготовки, не запись игрового теста. Сложные и особые условия добычи раскрыты в коде на страницах существ.</div>'+sourceLine('sources/decompiled/CalamityMod/WeakReferenceSupport.cs')+'</article><aside>'+bossHealthBox(b)+toc([['summon','Призыв'],['arena','Арена'],['tactics','Тактика'],['unlocks','После победы'],['loot','Добыча'],['parts','Состав встречи']])+'</aside></div>';
    return html;
  }
  function npcPage(id) {
    const e=npcs[id];if(!e)return missing();
    const boss=D.bosses.find(b=>b.npcs.includes(id));
    return breadcrumb(['Бестиарий','#/npcs'],e.name)+pageHeading(e.name,path('npc',id))+(boss?'<p class="small"><a href="'+path('boss',boss.id)+'">Полное руководство: '+esc(bossGuides[boss.id]?.title||boss.name)+' →</a></p>':'')+'<div class="article-layout"><article class="article-body"><h2>Бестиарий</h2>'+(e.description?'<div class="tooltip">'+textMarkup(e.description)+'</div>':'<p class="muted">Отдельное описание в бестиарии не задано. Для составных боссов смотрите страницу встречи.</p>')+(e.biomeTags?.length?'<p class="small">Места из бестиария: '+esc(e.biomeTags.join(', '))+'</p>':'')+(e.vulnerabilities&&Object.keys(e.vulnerabilities).length?'<h3>Уязвимости по типам эффектов</h3><p class="small">'+Object.entries(e.vulnerabilities).map(([k,v])=>esc(({Heat:'Жар',Cold:'Холод',Sickness:'Болезнь',Water:'Вода',Electricity:'Электричество'}[k])||k)+': '+(v?'уязвим':'устойчив')).join(' · ')+'</p>':'')+(e.loot?.length?'<h2>Добыча</h2>'+difficultyControls()+lootTable(e.loot):'')+(e.shopItems?.length?'<h2>Ассортимент магазина</h2><p class="muted small">Часть товаров открывается только после определённых побед или в особых условиях. Полные условия есть в правилах магазина ниже.</p>'+listLinks(e.shopItems):'')+sourceDetails('npc',id)+sourceLine(e.source)+'</article><aside>'+statBox(e,['lifeMax','lifeRevengeance','lifeBossRush','damage','defense','knockBackResist'])+'</aside></div>';
  }
  function buffPage(id) {
    const e=buffs[id];if(!e)return missing();
    return breadcrumb(['Эффекты','#/buffs'],e.name)+pageHeading(e.name,path('buff',id),e.debuff?'Дебафф':'Бафф')+'<div class="article-layout"><article class="article-body"><h2>Эффект</h2>'+(e.description?'<div class="tooltip">'+textMarkup(e.description)+'</div>':'<p class="muted">Этот эффект не имеет отдельной строки описания. Его действие определяется правилом Update ниже.</p>')+sourceDetails('buff',id,'Правило эффекта')+sourceLine(e.source)+'</article><aside>'+statBox(e,[])+'</aside></div>';
  }
  function classesPage() {return breadcrumb('Классы')+pageHeading('Пять путей через Calamity')+'<p class="lead">Сборки по этапам, принципы класса и практические советы. Призыватель и стрелок вынесены вперёд для вашего совместного прохождения.</p><div class="class-directory">'+Object.entries(classes).map(([id,label])=>'<a href="'+path('class',id)+'">'+image(items[iconItems[id]])+'<div><h2>'+label+'</h2><p>'+esc(guides[id]?.summary||'Оружие, броня, аксессуары и механики класса.')+'</p></div></a>').join('')+'</div>';}
  function classPage(id,params) {
    const g=guides[id];if(!g)return missing();
    const choice=params.get('stage')??readStore('stage','all'),selected=g.stages.some(s=>s.id===choice)?choice:'all';
    const stageOptions={all:'Все 12 этапов',...Object.fromEntries(g.stages.map(s=>[s.id,s.title]))};
    let html=breadcrumb(['Классы','#/classes'],g.title)+pageHeading(g.title,path('class',id))+'<p class="lead">'+esc(g.summary)+'</p><div class="button-row"><a class="button" href="#/items?group=weapons&class='+encodeURIComponent(id)+'">Всё оружие класса</a>'+(id==='Summon'||id==='Ranged'?'<a class="button" href="'+path('class',id==='Summon'?'Ranged':'Summon')+'?stage='+encodeURIComponent(selected)+'">Сборка напарника →</a>':'')+'<a class="button" href="#class-mechanics" data-scroll="class-mechanics">Механики класса ↓</a></div><form class="filters stage-filters">'+select('stage',stageOptions,selected,'Этап снаряжения')+'<span class="small muted">Нажмите на предмет, чтобы открыть его рецепт.</span></form><div class="guide-sections">';
    for(const s of g.stages.filter(s=>selected==='all'||s.id===selected))html+='<section class="build-stage" id="stage-'+esc(s.id)+'"><h2>'+esc(s.title)+'</h2>'+paragraphs(s.description)+'<dl class="loadout"><dt>Оружие</dt><dd>'+listLinks(s.weapons)+'</dd><dt>Броня</dt><dd>'+listLinks(s.armor)+'</dd><dt>Аксессуары</dt><dd>'+listLinks(s.accessories)+'</dd></dl>'+ (s.notes?'<p class="stage-note">'+textMarkup(s.notes)+'</p>':'')+evidenceLinks(s.evidence,'Источники этапа')+'</section>';
    html+='<h2 id="class-mechanics">Как работает класс</h2>';
    for(const section of g.mechanics||[])html+='<h3>'+esc(section.title)+'</h3>'+paragraphs(section.body);
    if(g.coop?.length)html+='<h2>Игра вдвоём</h2>'+bulletList(g.coop);
    if(g.tips?.length)html+='<h2>Практические советы</h2>'+bulletList(g.tips);
    return html+'</div><div class="source-line">Рекомендации сверены с рецептами и правилами установленной 2.2.4. Характеристики конкретных предметов — на их страницах.</div>';
  }
  function articleDirectory(section) {
    const world=section==='world',rows=G.articles.filter(a=>world?['biome','event','world'].includes(a.category):!['biome','event','world'].includes(a.category));
    return breadcrumb(world?'Биомы и мир':'Механики')+pageHeading(world?'Мир за привычной Террарией':'Механики и руководства')+'<p class="lead">'+(world?'Исследование новых областей, ресурсов и событий. Условия доступа и полезная подготовка в одной подборке.':'Правила текущей версии: сложность, развитие персонажа и совместная игра.')+'</p><div class="article-directory">'+rows.map(a=>'<a href="'+path('article',a.id)+'"><h2>'+esc(a.title)+'</h2><p>'+esc(a.summary)+'</p></a>').join('')+'</div>'+(world?'<details><summary>Все определения биомов из сборки · '+D.biomes.length+'</summary>'+D.biomes.map(b=>'<p class="small">'+esc(b.name)+' · <a href="'+esc(b.source)+'" target="_blank" rel="noopener">Условия биома</a></p>').join('')+'</details>':'');
  }
  function articlePage(id) {
    const a=articles[id];if(!a)return missing();
    const world=['biome','event','world'].includes(a.category);
    return breadcrumb([world?'Биомы и мир':'Механики',world?'#/world':'#/mechanics'],a.title)+pageHeading(a.title,path('article',id))+'<p class="lead">'+esc(a.summary)+'</p><div class="guide-sections">'+a.sections.map(s=>'<section><h2>'+esc(s.title)+'</h2>'+paragraphs(s.body)+'</section>').join('')+'</div>'+(a.relatedItems?.length?'<h2>Связанные предметы</h2>'+listLinks(a.relatedItems):'')+evidenceLinks(a.evidence,'Источники статьи');
  }
  function progression() {
    const count=D.bosses.filter(b=>defeated.includes(b.id)).length;
    let html=breadcrumb('Прохождение')+pageHeading('Маршрут прохождения')+'<p class="lead">Отмечайте пройденные встречи. Порядок рекомендован реестром Calamity; дополнительные ветки можно проходить раньше или позже по готовности.</p><p class="small muted">Это ваши личные отметки в браузере. Вики не читает мир и не меняет игру.</p><div class="count-line"><span id="progress-count">'+count+' из '+D.bosses.length+' встреч отмечено</span><a href="#/classes">Сверить снаряжение →</a></div><div class="progress-meter" role="progressbar" aria-label="Прогресс по встречам" aria-valuenow="'+count+'" aria-valuemin="0" aria-valuemax="'+D.bosses.length+'"><div style="width:'+count/D.bosses.length*100+'%"></div></div>';
    for(const stage of ['До хардмода','Хардмод','После Лунного лорда']){
      html+='<section class="progression-group"><h2>'+stage+'</h2>';
      if(stage==='Хардмод')html+='<p class="small muted">Перед этим этапом победите Стену плоти. Механические боссы, Плантера, Голем и другие ванильные встречи остаются частью маршрута.</p>';
      if(stage==='После Лунного лорда')html+='<p class="small muted">Этот этап начинается после победы над Лунным лордом.</p>';
      html+=D.bosses.filter(b=>stageName(b.order)===stage).map(b=>'<div class="progress-row '+(defeated.includes(b.id)?'done':'')+'"><input type="checkbox" data-boss-done="'+b.id+'" aria-label="Отметить: '+esc(bossGuides[b.id]?.title||b.name)+'" '+(defeated.includes(b.id)?'checked':'')+'>'+image(b)+'<div class="progress-title"><a href="'+path('boss',b.id)+'">'+esc(bossGuides[b.id]?.title||b.name)+'</a><small>'+esc(b.name)+'</small></div><span class="stage-label">'+({boss:'Босс',miniboss:'Мини-босс',event:'Событие'}[b.kind])+'</span></div>').join('')+'</section>';
    }
    return html;
  }
  function favoritesPage() {
    const rows=favorites.map(route=>searchIndex.find(e=>e.route===route)).filter(Boolean);
    return breadcrumb('Избранное')+pageHeading('Избранное')+'<p class="lead">Предметы и статьи, к которым хочется вернуться. Сохраняются в этом браузере.</p>'+(rows.length?'<div class="search-list">'+rows.map(e=>'<div class="search-hit">'+image(e)+'<div style="flex:1"><h3><a href="'+e.route+'">'+esc(e.title)+'</a></h3><p>'+esc(e.type)+'</p></div>'+favoriteButton(e.route)+'</div>').join('')+'</div>':'<div class="empty-state"><h2>Здесь будут ваши находки</h2><p class="muted">Нажмите «В избранное» в статье, на странице предмета или босса.</p><a href="#/items" class="button">Найти первый предмет</a></div>');
  }
  function groupPage(id) {
    const g=D.groups[id];const name=g?.name||id;
    return breadcrumb(['Предметы','#/items'],'Группа материалов')+pageHeading(name)+'<p class="lead">В рецептах можно использовать подходящий предмет из этой группы. Состав берётся из регистрации групп мода.</p>'+(g?.rule?'<p>'+esc(g.rule)+'</p>':'')+(g?.items?.length?listLinks(g.items):'<p class="muted small">Полный список зависит от загруженных модов и не вычислен в этой офлайн-копии.</p>')+'<h2>Используется для</h2>'+ingredientUsage('g:'+id)+sourceLine('sources/decompiled/CalamityMod.Systems/RecipeSystem.cs');
  }
  function publicSources(file) {
    if(file&&!PUBLIC.sources[file])return missing();
    const provenance=file?'<h2>'+esc(file.split('/').pop())+'</h2><p>Данные сверены с этим файлом из локальной копии установленной сборки. Полный файл в публичный сайт не включён.</p><p class="small">'+esc(file)+'</p><p class="small">SHA-256 проверенного файла:</p><pre>'+esc(PUBLIC.sources[file])+'</pre>':'';
    return breadcrumb('Источники')+pageHeading('Источники и точность данных')+provenance+'<div class="guide-sections"><h2>Версия и покрытие</h2><p>Неофициальная справочная вики Calamity 2.2.4: '+number(D.items.length)+' предмет, '+number(D.recipes.length)+' рецепта, все пять классов, боссы, биомы и механики. Источник чисел — отдельная копия установленного мода. Публичная ветка исходников может отставать от этой версии.</p><h2>Как читать данные</h2><p>Характеристики предметов — исходные значения до модификаторов игрока. Здоровье боссов рассчитано для одного игрока, обычного сида и усиления HP 0%; мультиплеер, фазы и снаряды могут отличаться. Специальные условия добычи отмечены отдельно. Невычисленные динамические свойства обозначены в описаниях.</p><p>Каталог включает прямые регистрации рецептов; дополнительные моды, магазины и изменения во время игры могут влиять на результат. Тактика — рекомендации по исходникам; боевые проверки не проводились.</p><h2>Происхождение</h2><p>Архив мода, DLL и полные декомпилированные файлы не распространяются через этот сайт. Карточки источников сохраняют имена и контрольные суммы проверенных локальных файлов; полный код доступен в локальной копии вики.</p><p><a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener">Публичный проект Calamity</a> · <a href="https://calamitymod.wiki.gg/wiki/Version_history" target="_blank" rel="noopener">Официальная история версий</a> · <a href="data/coverage.json" target="_blank" rel="noopener">Покрытие данных</a></p><h2>Авторы и материалы</h2><p>Calamity и связанные изображения, названия и тексты принадлежат Azafure, LLC и соответствующим авторам. Terraria принадлежит Re-Logic; tModLoader — его разработчикам. Этот справочный сайт не является официальным проектом этих команд.</p><p><a href="THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">Авторство и условия использования материалов</a> · <a href="'+esc(PUBLIC.repository)+'" target="_blank" rel="noopener">Репозиторий сайта</a></p><h2>Ваше прохождение</h2><p>Избранное, тема и отметки боссов сохраняются только в вашем браузере. Сайт не читает игру и не передаёт отметки другим игрокам. При очистке браузера они могут исчезнуть. Скачанные файлы сайта можно открыть локально без сервера.</p></div>';
  }
  function sources() {
    if(PUBLIC)return publicSources(currentParams.get('file'));
    return breadcrumb('Источники')+pageHeading('Об этой вики')+'<p class="lead">Персональная офлайн-энциклопедия для вашей установленной Calamity 2.2.4. Каталог и справочные числа извлечены из отдельной копии мода; русские руководства написаны по его правилам.</p><div class="guide-sections"><h2>Что включено</h2><dl class="definition-list"><dt>'+number(D.items.length)+' предметов и '+number(D.recipes.length)+' рецептов</dt><dd>Все найденные не абстрактные типы ModItem, их спрайты, игровые описания, прямые регистрации рецептов, связи ингредиентов и результатов. Включены добавленные модом рецепты ванильных предметов.</dd><dt>'+D.npcs.length+' типов существ, '+D.buffs.length+' эффектов, '+D.biomes.length+' определений биомов</dt><dd>Включены служебные существа и отдельные части боссов. Поэтому число типов больше числа самостоятельных противников.</dd><dt>26 боссов, 5 мини-боссов и 4 события</dt><dd>Реестр встреч и порядок взяты из интеграции Boss Checklist. Для пяти классов есть отдельные руководства со сборками.</dd></dl><h2>Как читать характеристики</h2><p>Числа предметов и существ — значения, явно заданные в SetDefaults. Они не включают экипировку игрока, префиксы, глобальные изменения, настройки сервера, фазы босса и число участников. На странице босса переключатель выбирает режим и соответствующую таблицу добычи. Там, где конечное здоровье не подтверждено формулой, число подписано как базовое.</p><p>В обычном режиме оружие часто выпадает из самого босса; в Эксперте и Мастере — из сумки. Для групп оружия Calamity учитывается дополнительный выбор одного предмета, если все обычные броски оказались неудачными. Особые сиды, первая победа и испытания помечаются как отдельные условия.</p><h2>Границы автоматического разбора</h2><p>Каталог сохраняет прямые рецепты и их исходные правила. Изменения рецептов после регистрации, наследуемые настройки, динамические магазины и содержимое мира могут зависеть от дополнительных правил. Ссылки на исходные файлы и раскрывающиеся блоки позволяют проверить их без интернета. Отсутствие найденного рецепта или источника не означает, что предмет нельзя получить.</p><p>В моде есть только английская локализация. Названия и игровые описания сохранены без выдуманного «официального перевода»; интерфейс, тактика и руководства — на русском. Некоторые описания содержат динамические поля, которые игра подставляет во время работы.</p><h2>Откуда взяты данные</h2><ul><li><a href="sources/archive-index.json" target="_blank" rel="noopener">Манифест скопированного архива</a> — версия 2.2.4, tModLoader 2026.6.3.4.</li><li><a href="data/coverage.json" target="_blank" rel="noopener">Отчёт о покрытии</a> и <a href="data/catalog.json" target="_blank" rel="noopener">каталог в JSON</a>.</li><li><a href="https://calamitymod.wiki.gg/wiki/Version_history" target="_blank" rel="noopener">Официальная история версий</a> — сверка последней версии, нужен интернет.</li><li><a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener">Публичные исходники Calamity</a> — дополнительная ссылка. Основа этой вики — установленная сборка, поскольку публичная ветка может отставать.</li></ul><h3>Контрольная сумма копии</h3><pre>'+esc(D.meta.sha256)+'</pre><h2>Локальная работа</h2><p>Откройте index.html или «Открыть вики.cmd». Сервер, аккаунт и интернет не нужны. Избранное, тема и отметки прохождения хранятся в localStorage браузера. При переносе папки или смене браузера сохранённые отметки могут не перенестись.</p><p>Игра, моды, персонажи и миры не изменялись. Во время сборки игра не запускалась и не перезагружалась; игровые проверки боя не проводились.</p><h2>Авторы оригинала</h2><p>Calamity Mod и его изображения созданы командой и художниками Calamity. Terraria — Re-Logic, tModLoader — его разработчиками. Это личная локальная справка, не официальный сайт и не сборка мода для распространения. Материалы не опубликованы в интернете.</p></div>';
  }
  function missing(){return '<div class="empty-state"><h1>Страница не найдена</h1><p class="muted">Такой записи нет в этой версии локальной базы.</p><a class="button" href="#/">Вернуться на главную</a></div>';}
  let currentRoute='',currentParams=new URLSearchParams();
  function render(keepScroll=false) {
    const scroll=window.scrollY;
    const focused=document.activeElement,focusKey=main.contains(focused)?['id','name','data-favorite'].find(key=>focused.hasAttribute(key)):null;
    const focusValue=focusKey?focused.getAttribute(focusKey):null;
    const hash=location.hash.startsWith('#/')?location.hash.slice(2):'';
    const [route,query='']=hash.split('?');currentRoute=route;currentParams=new URLSearchParams(query);
    const [section,rawId]=route.split('/');let id='';try{id=decodeURIComponent(rawId||'');}catch{}
    let content;
    if(!section)content=home();
    else if(section==='search')content=searchPage(currentParams);
    else if(['items','npcs','buffs'].includes(section))content=catalog(section,currentParams);
    else if(section==='item')content=itemPage(id);
    else if(section==='bosses')content=bossList(currentParams);
    else if(section==='boss')content=bossPage(id);
    else if(section==='npc')content=npcPage(id);
    else if(section==='buff')content=buffPage(id);
    else if(section==='classes')content=classesPage();
    else if(section==='class')content=classPage(id,currentParams);
    else if(section==='world'||section==='mechanics')content=articleDirectory(section);
    else if(section==='article')content=articlePage(id);
    else if(section==='progression')content=progression();
    else if(section==='favorites')content=favoritesPage();
    else if(section==='group')content=groupPage(id);
    else if(section==='sources')content=sources();
    else content=missing();
    main.innerHTML='<div class="page-content">'+content+'</div>'+footer();
    linkPublicSources();
    document.title=(main.querySelector('h1')?.textContent||'Calamity Wiki')+' · Calamity 2.2.4';
    const active=section==='class'?id:section==='article'?(['biome','event','world'].includes(articles[id]?.category)?'world':'mechanics'):({item:'items',npc:'npcs',boss:'bosses',buff:'buffs',group:'items'}[section]||section||'home');
    document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===active);if(a.dataset.nav===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');
    document.querySelector('#search-results').hidden=true;
    if(keepScroll)window.scrollTo(0,scroll);else window.scrollTo(0,0);
    const quantity=document.querySelector('#craft-quantity');
    if(quantity)quantity.addEventListener('input',()=>{const n=Math.min(999999,Math.max(1,Number(quantity.value)||1));document.querySelector('#item-recipes').innerHTML=(recipesByOutput[normalizeItemId(id)]||[]).map(r=>recipeCard(r,n)).join('');linkPublicSources();});
    const form=document.querySelector('#catalog-filters');
    if(form){const submit=()=>{const params=new URLSearchParams();for(const [key,value]of new FormData(form))if(value)params.set(key,value);location.hash='#/'+section+'?'+params;};form.addEventListener('submit',e=>{e.preventDefault();submit();});form.querySelectorAll('select').forEach(s=>s.addEventListener('change',submit));}
    const stageSelect=document.querySelector('.stage-filters select');
    if(stageSelect)stageSelect.addEventListener('change',()=>{saveStore('stage',stageSelect.value);location.hash=path('class',id)+'?stage='+encodeURIComponent(stageSelect.value);});
    if(focusKey)main.querySelector('['+focusKey+'="'+CSS.escape(focusValue)+'"]')?.focus({preventScroll:true});
  }
  main.addEventListener('change',e=>{
    if(e.target.matches('[data-boss-done]')){
      const id=e.target.dataset.bossDone;defeated=e.target.checked?[...new Set([...defeated,id])]:defeated.filter(x=>x!==id);saveStore('defeated',defeated);
      e.target.closest('.progress-row').classList.toggle('done',e.target.checked);
      const count=D.bosses.filter(b=>defeated.includes(b.id)).length;
      document.querySelector('#progress-count').textContent=count+' из '+D.bosses.length+' встреч отмечено';
      const bar=document.querySelector('.progress-meter');bar.setAttribute('aria-valuenow',count);bar.firstElementChild.style.width=count/D.bosses.length*100+'%';
    }
    if(e.target.closest('.difficulty-controls')){
      const form=e.target.closest('form');let world=form.elements.worldDifficulty.value,calamity=form.elements.modDifficulty.value;
      if(world==='classic')calamity='normal';
      else if(world==='master'&&calamity==='revenge')calamity='death';
      else if(world==='expert'&&calamity==='death')calamity='revenge';
      difficulty=modes.find(m=>m.world===world&&m.calamity===calamity)?.id||'classic';saveStore('difficulty',difficulty);render(true);
    }
  });
  document.addEventListener('click',e=>{
    const scroll=e.target.closest('[data-scroll]');
    if(scroll){e.preventDefault();document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
    const favorite=e.target.closest('[data-favorite]');
    if(favorite){const route=favorite.dataset.favorite;favorites=favorites.includes(route)?favorites.filter(x=>x!==route):[...favorites,route];saveStore('favorites',favorites);render(true);return;}
    if(!e.target.closest('.global-search'))document.querySelector('#search-results').hidden=true;
  });
  const searchInput=document.querySelector('#search'),searchResults=document.querySelector('#search-results');
  let searchTimer;
  searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const query=searchInput.value.trim();if(!query){searchResults.hidden=true;return;}const results=search(query);searchResults.innerHTML=results.slice(0,7).map(e=>'<a href="'+e.route+'">'+image(e)+'<span>'+esc(e.title)+'<small>'+esc(e.type)+'</small></span></a>').join('')+(results.length?'<a class="all-results" href="#/search?q='+encodeURIComponent(query)+'">Все результаты · '+number(results.length)+'</a>':'<div class="search-empty">Совпадений нет. Попробуйте часть английского названия.</div>');searchResults.hidden=false;},100);});
  searchInput.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&!searchResults.hidden){e.preventDefault();searchResults.querySelector('a')?.focus();}});
  searchResults.addEventListener('keydown',e=>{const links=[...searchResults.querySelectorAll('a')],i=links.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();links[Math.min(i+1,links.length-1)]?.focus();}if(e.key==='ArrowUp'){e.preventDefault();if(i<=0)searchInput.focus();else links[i-1].focus();}});
  document.querySelector('#search-form').addEventListener('submit',e=>{e.preventDefault();const target='#/search?q='+encodeURIComponent(searchInput.value.trim());if(location.hash===target)render();else location.hash=target;});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){e.preventDefault();searchInput.focus();}if(e.key==='Escape'){searchResults.hidden=true;document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}});
  document.querySelector('#menu-toggle').addEventListener('click',()=>{const open=document.querySelector('#sidebar').classList.toggle('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));});
  const themeButton=document.querySelector('#theme-toggle');
  function applyTheme(theme){document.documentElement.dataset.theme=theme;themeButton.setAttribute('aria-label','Включить '+(theme==='dark'?'светлую':'тёмную')+' тему');}
  applyTheme(readStore('theme','dark'));
  themeButton.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);saveStore('theme',theme);});
  document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();main.focus();});
  document.querySelector('#nav-item-count').textContent=number(D.items.length);
  const navIcons={home:'LoreCalamitas',progression:'DesertMedallion',classes:'RogueEmblem',items:'Murasama',bosses:'DesertMedallion',npcs:'CrawCarapace',world:'AstralBeaconItem',mechanics:'DraedonsLogPlanetoid',buffs:'BloodOrb',Summon:iconItems.Summon,Ranged:iconItems.Ranged,favorites:'AerialiteBar'};
  document.querySelectorAll('[data-nav]').forEach(link=>{const entry=items[navIcons[link.dataset.nav]];if(entry)link.insertAdjacentHTML('afterbegin',image(entry,'nav-icon',true));});
  window.addEventListener('hashchange',()=>render());
  render();
})();
