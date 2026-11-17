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
  let mechProgress=readStore('mech-progress','first');
  if(!['first','second','full'].includes(mechProgress))mechProgress='first';
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
      return '<a class="item-link" href="' + path('group',key) + '">' + (icons&&group?.items?.length?image(item(group.items[0])):'') + esc(group?.name || key.replace(/([a-z])([A-Z])/g,'$1 $2')) + '</a>' + (count ? ' <b>× ' + number(count) + '</b>' : '');
    }
    const it = item(id);
    if (!it) return '<span class="muted">' + esc(id) + '</span>';
    return '<a class="item-link" href="' + path('item',id) + '">' + (icons ? image(it) : '') + esc(it.name) + '</a>' + (count ? ' <b>× ' + number(count) + '</b>' : '');
  }
  function listLinks(ids) { return '<div class="item-links">' + [...new Set(ids || [])].map(id => itemLink(id)).join('') + '</div>'; }
  function textMarkup(value) {
    let text = esc(value);
    // Strip only the outer formatting wrapper; nested item/buff tags keep their brackets.
    text = stripFormatTags(text);
    text = text.replace(/\[cbuff(?:plr)?:([^\]]+)\]/g,(_,ref)=>{
      const key=ref.split('/').pop(),buff=buffs[key]||buffs[D.vanillaBuffIds?.[key]];
      return buff?'<a class="item-link" href="'+path('buff',buff.id)+'">'+image(buff)+esc(buff.name)+'</a>':esc(D.buffNames?.[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2'));
    });
    for(const match of [...text.matchAll(/\[i(?:\/(?:s(\d+)|Terraria))?:(?:CalamityMod\/|Terraria\/)?([\w]+)\]/g)].reverse()){
      const raw=match[2],id=/^\d+$/.test(raw)||(!items[raw]&&raw in D.vanillaIds)?'v:'+raw:raw,label=' '+esc(item(id)?.name||'');
      const end=match.index+match[0].length,duplicate=label.length>1&&text.slice(end).startsWith(label)?label.length:0;
      text=text.slice(0,match.index)+itemLink(id,match[1])+text.slice(end+duplicate);
    }
    return text.replace(/&lt;left&gt;/g,'ЛКМ').replace(/&lt;right&gt;/g,'ПКМ').replace(/\n/g,'<br>');
  }
  function stripFormatTags(text) {
    const tag = /\[(?:c\/[^:\]\r\n]+|ceffect\/[\w]+):/g;
    let match;
    while ((match = tag.exec(text))) {
      let end = tag.lastIndex, depth = 1;
      for (; end < text.length && depth; end++) {
        if (text[end] === '[') depth++;
        if (text[end] === ']') depth--;
      }
      if (depth) break;
      text = text.slice(0,match.index) + text.slice(tag.lastIndex,end-1) + text.slice(end);
      tag.lastIndex = match.index;
    }
    return text;
  }
  function paragraphs(value) { return (Array.isArray(value) ? value : [value]).filter(Boolean).map(p => '<p>' + textMarkup(p) + '</p>').join(''); }
  function evidenceLinks(paths=[],title='Источники') {return paths.length?'<details class="evidence"><summary>'+esc(title)+'</summary>'+[...new Set(paths)].map(p=>'<p class="small"><a href="'+esc(p)+'" target="_blank" rel="noopener">'+esc(p.split('/').pop())+'</a></p>').join('')+'</details>':'';}
  function linkPublicSources(){
    if(PUBLIC)for(const link of main.querySelectorAll('a[href^="sources/"]')){
      link.href='#/sources?file='+encodeURIComponent(link.getAttribute('href'));
      link.removeAttribute('target');
    }
  }
  const mentionTargets = new Map();
  function registerMention(name, route) {
    if (name && name.length > 2 && !mentionTargets.has(name.toLocaleLowerCase('ru-RU')))
      mentionTargets.set(name.toLocaleLowerCase('ru-RU'), route);
  }
  registerMention('Calamity','#/sources');
  registerMention('Terraria','#/article/terraria-and-calamity');
  for(const [name,route] of Object.entries(D.linkAliases||{}))registerMention(name,route);
  for (const b of D.bosses) for (const name of [b.name,bossGuides[b.id]?.title,...(bossGuides[b.id]?.aliases||[])]) registerMention(name,path('boss',b.id));
  for (const a of G.articles) for (const name of [a.title,...(a.aliases||[])]) registerMention(name,path('article',a.id));
  for (const e of [...D.items,...Object.values(D.vanilla)]) for (const name of [e.name,e.en,e.nameRu,...(e.aliases||[])]) registerMention(name,path('item',e.id));
  for (const e of D.npcs) for (const name of [e.name,e.en,e.nameRu]) registerMention(name,path('npc',e.id));
  for (const e of D.buffs) for (const name of [e.name,e.nameRu]) if(name?.toLocaleLowerCase('ru-RU')!=='скорость')registerMention(name,path('buff',e.id));
  const mentionPattern = new RegExp('(?<![\\p{L}\\p{N}_])(?:'+[...mentionTargets.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}_])','giu');
  function linkMentions(root=main) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(node.parentElement.closest('a,button,label,select,option,pre,code,h1,h2,h3,summary,.breadcrumb,.source-line,.footer,.evidence,.infobox,.filters'))continue;
      if(node.textContent.trim().length>2)nodes.push(node);
    }
    for(const node of nodes){
      const text=node.textContent;mentionPattern.lastIndex=0;
      const matches=[...text.matchAll(mentionPattern)].filter(m=>mentionTargets.get(m[0].toLocaleLowerCase('ru-RU'))!=='#/'+currentRoute);
      if(!matches.length)continue;
      const fragment=document.createDocumentFragment();let offset=0;
      for(const match of matches){
        fragment.append(text.slice(offset,match.index));
        const link=document.createElement('a');link.href=mentionTargets.get(match[0].toLocaleLowerCase('ru-RU'));link.textContent=match[0];link.className='wiki-mention';fragment.append(link);offset=match.index+match[0].length;
      }
      fragment.append(text.slice(offset));node.replaceWith(fragment);
    }
  }
  function coins(value) {
    if(!Number.isFinite(value))return 'Не определена';
    if(value===0)return 'Не продаётся';
    let rest=Math.floor(value);
    return [[1000000,74,'плат.'],[10000,73,'зол.'],[100,72,'сер.'],[1,71,'мед.']].map(([unit,id,label])=>{
      const count=Math.floor(rest/unit);rest%=unit;
      return count?'<span class="coin-value"><img src="assets/vanilla/Item_'+id+'.png" alt="">'+count+' '+label+'</span>':'';
    }).join(' ');
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
  function formatStat(value,key) {return value===undefined||value===null?'Не определено':typeof value==='boolean'?(value?'Да':'Нет'):number(value)+(statUnits[key]||'');}
  function shopTable(offers,view) {
    const title=view==='npc'?'Торговец':'Предмет';
    return '<p class="small muted">Цена покупки зависит от счастья торговца, скидок и других условий. Указана базовая цена из правила магазина или свойств предмета. Для появления продавца также могут требоваться отдельные условия.</p><div class="table-wrap"><table><thead><tr><th>'+title+'</th><th>Условия продажи</th><th>Базовая цена покупки</th><th>Источник</th></tr></thead><tbody>'+offers.map(offer=>{
      const person=npcs[offer.npc];
      const link=view==='npc'?'<a class="item-link" href="'+path('npc',offer.npc)+'">'+image(person)+esc(person?.name||offer.npc)+'</a>':itemLink(offer.item);
      return '<tr><td>'+link+'</td><td>'+(offer.conditions?.length?offer.conditions.map(textMarkup).join('; '):'Дополнительные условия товара не указаны')+'</td><td>'+(offer.price===null||offer.price===undefined?'Не определена':offer.price===0?'Бесплатно':coins(offer.price))+'</td><td><a href="'+esc(offer.source)+'" target="_blank" rel="noopener">Источник</a></td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  function statBox(entry, keys, extra = '') {
    const stats = entry.stats || {};
    const itemEntry=items[entry.id]===entry||D.vanilla[entry.id]===entry;
    return '<div class="infobox"><div class="portrait">' + image(entry,'',true) + '</div><h2>' + esc(entry.name) + '</h2><div class="subtitle">' + esc(entry.class ? classes[entry.class] : entry.group ? groups[entry.group] : entry.vanilla?'Terraria':'Calamity Mod 2.2.4') + '</div><dl>' +
      keys.filter(k => stats[k] !== undefined).map(k => '<div><dt>' + esc(statNames[k] || k) + '</dt><dd>' + formatStat(stats[k],k) + '</dd></div>').join('') + (entry.sellValue!==undefined?'<div><dt>Продажа за 1 шт.</dt><dd>'+coins(entry.sellValue)+'</dd></div>':'') + extra + '</dl>'+(itemEntry?'<p class="muted small">'+(entry.vanilla?'Свойства Terraria с учётом распознанных изменений Calamity; отдельные динамические изменения могут отсутствовать. ':'')+'Без префикса и бонусов игрока. Цена продажи базовая, без счастья торговца и скидок. 60 тиков = 1 секунда.</p>':'')+'</div>';
  }
  function toc(sections) { return '<nav class="toc" aria-label="На этой странице"><strong>На этой странице</strong>' + sections.map(([id,name]) => '<a href="#' + esc(id) + '" data-scroll="' + esc(id) + '">' + esc(name) + '</a>').join('') + '</nav>'; }
  function home() {
    const categoryIcons = {weapons:'Murasama',armor:'WulfrumHat',accessories:'RogueEmblem',materials:'AerialiteBar',potions:'BloodOrb',summons:'DesertMedallion',tools:'CrystylCrusher',blocks:'AstralBeaconItem'};
    const counts = Object.fromEntries(Object.keys(groups).map(key => [key,D.items.filter(i => i.group === key).length]));
    return breadcrumb('Главная') + '<section class="welcome"><div><h1>Твоя энциклопедия<br>мира Calamity.</h1><p class="lead">От первого вульфрумового механизма до последней битвы. Предметы, рецепты и маршруты прохождения для версии, в которую вы играете.</p><div class="button-row"><a class="button primary" href="#/progression">Продолжить путешествие</a><a class="button" href="#/items">Открыть каталог</a></div><div class="intro-counts"><span><b>' + number(D.items.length) + '</b> предметов</span><span><b>' + number(D.recipes.length) + '</b> рецептов</span><span><b>' + D.bosses.filter(b=>b.kind==='boss').length + '</b> боссов</span><span>Все 5 классов</span></div></div><figure class="welcome-art"><img src="assets/theme/menu-modern.png" width="640" height="360" alt="Пиксельный пейзаж и воин из главного меню Calamity"><figcaption>Calamity Mod · мир, в котором вы играете</figcaption></figure></section>' +
      '<div class="home-columns"><div><section class="coop-panel"><h2>Ваш дуэт: призыватель и стрелок</h2><p>Два маршрута снаряжения, одна экспедиция. Сборки по этапам и советы для игры вдвоём.</p><div class="coop-classes">' + ['Summon','Ranged'].map(c => '<a href="' + path('class',c) + '" class="coop-class">' + image(items[iconItems[c]]) + '<span><strong>' + classes[c] + '</strong><small>' + (c === 'Summon' ? 'Миньоны, кнуты, турели' : 'Луки, пули, боеприпасы') + '</small></span></a>').join('') + '</div></section>' +
      '<div class="section-heading"><h2>Найти нужное</h2><a href="#/items">Все предметы →</a></div><div class="category-grid">' + Object.entries(categoryIcons).map(([group,id]) => '<a class="category-link" href="#/items?group=' + group + '">' + image(items[id] || D.items.find(i=>i.group === group)) + '<span>' + groups[group] + ' <small>' + number(counts[group]) + '</small></span><span class="arrow" aria-hidden="true">→</span></a>').join('') + '</div></div>' +
      '<div><div class="section-heading"><h2>Путеводитель</h2></div><ul class="quick-list"><li><a href="#/classes"><span>Выбрать свой класс<span class="sub">Оружие, броня и аксессуары по этапам</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/bosses"><span>Подготовиться к боссу<span class="sub">Призыв, арена, добыча и сложность</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/world"><span>Исследовать мир<span class="sub">Бездна, затонувшее море, лаборатории</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/mechanics"><span>Разобраться в механиках<span class="sub">Режимы, метки кнутов и развитие</span></span><span aria-hidden="true">→</span></a></li><li><a href="#/favorites"><span>Мои заметки на полях<span class="sub">Сохранённые статьи и предметы</span></span><span aria-hidden="true">→</span></a></li></ul><div class="patch-note"><strong>Проверено по вашей версии</strong><p>В 2.2.4 Snow Ruffian относится к стрелку, а Desert Prowler — к разбойнику. Руководства учитывают эти изменения.</p><a class="small" href="#/sources">Как собрана эта вики →</a></div></div></div>';
  }
  const searchIndex = [
    ...D.items.map(e=>({id:e.id,title:e.name,type:'Предмет',route:path('item',e.id),image:e.image,text:[e.id,e.name,e.tooltip,e.tooltipRu,e.descriptionRu,classes[e.class],groups[e.group]].join(' ')})),
    ...D.bosses.map(e=>({id:e.id,title:bossGuides[e.id]?.title || e.name,type:e.kind==='boss'?'Босс':e.kind==='event'?'Событие':'Мини-босс',route:path('boss',e.id),image:e.image,text:[e.id,e.name,bossGuides[e.id]?.title,e.spawn].join(' ')})),
    ...D.npcs.map(e=>({id:e.id,title:e.name,type:'Существо',route:path('npc',e.id),image:e.image,text:[e.id,e.name,e.description,e.en,...(e.biomeTags||[]),...(e.spawnInfo?.summary||[]),...(e.spawnInfo?.environment||[])].join(' ')})),
    ...D.buffs.map(e=>({id:e.id,title:e.name,type:e.debuff===true?'Дебафф':e.debuff===false?'Бафф':'Эффект',route:path('buff',e.id),image:e.image,text:[e.id,e.name,e.description].join(' ')})),
    ...G.articles.map(e=>({id:e.id,title:e.title,type:'Руководство',route:path('article',e.id),text:[e.title,e.summary].join(' ')})),
    ...G.classes.map(e=>({id:e.id,title:e.title,type:'Класс',route:path('class',e.id),image:items[iconItems[e.id]]?.image,text:[e.title,e.id,e.summary].join(' ')})),
    ...Object.values(D.vanilla).map(e=>({id:e.id,title:e.name,type:'Предмет Terraria',route:path('item',e.id),image:e.image,text:[e.name,e.en,e.key,e.tooltip,e.descriptionRu].join(' ')}))
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
    const source=params.get('source')||'calamity';
    let rows = kind==='items'?(source==='terraria'?Object.values(D.vanilla):source==='all'?[...D.items,...Object.values(D.vanilla)]:D.items):kind==='npcs'?D.npcs:D.buffs;
    const title=kind==='items'?'Предметы':kind==='npcs'?'Бестиарий':'Баффы и дебаффы';
    const q=normalize(params.get('q')||'');
    if(q) rows=rows.filter(e=>normalize([e.id,e.name,e.en,e.tooltip,e.tooltipRu,e.descriptionRu,e.description].join(' ')).includes(q));
    if(params.get('group')) rows=rows.filter(e=>e.group===params.get('group'));
    if(params.get('class')) rows=rows.filter(e=>e.class===params.get('class'));
    if(params.get('type')) rows=rows.filter(e=>params.get('type')==='debuff'?e.debuff:params.get('type')==='buff'?e.debuff===false:params.get('type')==='town'?e.town:!e.town);
    const sort=params.get('sort')||'name';
    rows=[...rows].sort((a,b)=>sort==='damage'?(b.stats?.damage||0)-(a.stats?.damage||0)||a.name.localeCompare(b.name):a.name.localeCompare(b.name,'en'));
    const page=Math.min(Math.max(1,Number(params.get('page'))||1),Math.max(1,Math.ceil(rows.length/60)));
    let html=breadcrumb(title)+pageHeading(title)+'<p class="lead">'+(kind==='items'?'Предметы установленной сборки: выбирайте Calamity, Terraria или общую базу; открывайте характеристики, рецепты и источники.':kind==='npcs'?'Существа, жители и части боссов. Включены все типы NPC из сборки; отдельные части составных боссов имеют собственные страницы.':'Игровые эффекты из текущей версии. Английские названия совпадают с оригиналом мода.')+'</p><form class="filters" id="catalog-filters"><label class="filter-search">Найти в разделе<input name="q" type="search" value="'+esc(params.get('q')||'')+'" placeholder="Название или часть описания"></label>';
    if(kind==='items') html+=select('source',{calamity:'Calamity',terraria:'Terraria',all:'Все предметы'},source,'Игра')+select('group',{'':'Все категории',...groups},params.get('group')||'','Категория')+select('class',{'':'Все классы',...classes},params.get('class')||'','Класс оружия');
    if(kind==='npcs') html+=select('type',{'':'Все существа',town:'Городские NPC',enemy:'Остальные NPC'},params.get('type')||'','Тип');
    if(kind==='buffs') html+=select('type',{'':'Все эффекты',buff:'Баффы',debuff:'Дебаффы'},params.get('type')||'','Тип');
    html+=select('sort',{name:'По алфавиту',...(kind==='items'?{damage:'По базовому урону'}:{})},sort,'Сортировка')+'<button class="button" type="submit">Найти</button></form><div class="count-line"><span>'+number(rows.length)+' записей</span>'+(params.size?'<a href="#/'+kind+'">Сбросить фильтры</a>':'')+'</div>';
    if(!rows.length) return html+'<div class="empty-state"><h2>Ничего не найдено</h2><p class="muted">Измените название, категорию или класс оружия.</p><a class="button" href="#/'+kind+'">Сбросить фильтры</a></div>';
    return html+'<div class="table-wrap"><table><thead><tr><th>Название</th><th>Категория</th>'+(kind!=='buffs'?'<th>Урон</th><th class="hide-mobile">Защита</th>':'')+'</tr></thead><tbody>'+rows.slice((page-1)*60,page*60).map(e=>'<tr><td><a class="item-cell" href="'+path(kind==='items'?'item':kind==='npcs'?'npc':'buff',e.id)+'">'+image(e)+'<span>'+esc(e.name)+'<small>'+(classes[e.class]||'')+'</small></span></a></td><td class="numeric">'+esc(kind==='items'?groups[e.group]:kind==='npcs'?(spawnKindLabels[e.spawnInfo?.kind]||(e.town?'Житель':e.boss?'Босс':e.namespace))+(e.spawnInfo?.rules?.length?' · '+[...new Set(e.spawnInfo.rules.flatMap(r=>r.conditions?.biomes||[]))].join(', '):''):(e.debuff===true?'Дебафф':e.debuff===false?'Бафф':'Эффект'))+'</td>'+(kind!=='buffs'?'<td class="numeric">'+(e.stats?.damage!==undefined?number(e.stats.damage):'—')+'</td><td class="numeric hide-mobile">'+(e.stats?.defense!==undefined?number(e.stats.defense):'—')+'</td>':'')+'</tr>').join('')+'</tbody></table></div>'+pagination(rows.length,page,60,params);
  }
  function conditionLabel(condition) {
    const known={'Condition.NearHoney':'Рядом с мёдом','Condition.NearLava':'Рядом с лавой','Condition.InSnow':'В снежном биоме','Condition.ZenithWorld':'Только в мире get fixed boi'};
    if(known[condition])return known[condition];
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
    const equivalents={'16':['v:35','v:716'],'133':['v:524','v:1221'],'134':['v:525','v:1220']};
    if(equivalents[tile])return equivalents[tile].map(id=>itemLink(id,undefined,false)).join(' / ');
    const alias=D.tileAliases[tile]||D.stationItems?.[tile];
    if(alias) return itemLink(alias,undefined,false);
    const common={'16':'Наковальня','17':'Печь','18':'Верстак','26':'Демонический / кровавый алтарь','77':'Адская кузня','96':'Котёл','101':'Книжный шкаф','106':'Лесопилка','114':'Мастерская изобретателя','133':'Адамантитовая / титановая печь','134':'Мифриловая / орихалковая наковальня','247':'Автомолот','283':'Тяжёлый верстак','302':'Станок для клонирования плоти','303':'Стеклянная печь','354':'Древний манипулятор','355':'Алхимический стол','412':'Кристальный шар'};
    return esc(common[tile]||D.tileNames[tile]||tile.replace(/([a-z])([A-Z])/g,'$1 $2'));
  }
  function recipeCard(recipe,quantity=1) {
    const batches=typeof recipe.count==='number'?Math.ceil(quantity/recipe.count):1;
    const decraftNotes={'DecraftCondition.CorruptWorld':'Разбор через мерцание: только в мире с Искажением.','DecraftCondition.CrimsonWorld':'Разбор через мерцание: только в мире с Багрянцем.','CustomShimmerResult':'Разбор через мерцание даёт особые материалы; см. источник.'};
    return '<div class="recipe"><div class="craft-flow"><div><h3>Ингредиенты</h3><ul class="ingredients">'+recipe.ingredients.map(i=>'<li class="ingredient">'+itemLink(i.id,typeof i.count==='number'?i.count*batches:i.count)+'</li>').join('')+'</ul></div><svg class="craft-arrow" viewBox="0 0 32 24" aria-label="Получается"><path d="M2 12h26M20 4l8 8-8 8"/></svg><div class="craft-result"><h3>Результат</h3>'+itemLink(recipe.output,recipe.count*batches||recipe.count)+'</div></div><div class="recipe-meta"><span><strong>Станция создания:</strong> '+(recipe.tiles.length?recipe.tiles.map(station).join(' / '):'Вручную')+'</span>'+recipe.conditions.map(c=>'<span>'+esc(conditionLabel(c))+'</span>').join('')+(recipe.contextDependent?'<span>Дополнительные условия: '+esc(recipe.contextNote||'не все условия вычислены; см. источник рецепта.')+'</span>':'')+(recipe.decraft?.some(x=>x.startsWith('DisableDecraft'))?'<span>Разбор через мерцание отключён.</span>':'')+(recipe.decraft||[]).filter(x=>decraftNotes[x]).map(x=>'<span>'+esc(decraftNotes[x])+'</span>').join('')+'</div><details><summary>Источник рецепта</summary>'+(recipe.raw?'<pre>'+esc(recipe.raw)+'</pre>':'')+'<a class="small" href="'+esc(recipe.source)+'" target="_blank" rel="noopener">'+(PUBLIC?'Сведения об источнике':'Открыть полный файл')+'</a></details></div>';
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
    if(entry.descriptionRu)html+=paragraphs(entry.descriptionRu);
    if(entry.armorSet)html+='<p>Комплект: <a href="'+path('article',entry.armorSet)+'">'+esc(articles[entry.armorSet]?.title||'Все части брони')+'</a>.</p>';
    if(entry.tooltipRu)html+='<div class="tooltip">'+textMarkup(entry.tooltipRu)+'</div>'+(entry.translationDraft?'<p class="small muted">Русский перевод подсказки подготовлен автоматически; оригинал доступен ниже.</p>':'');
    else if(vanilla&&entry.tooltipUnverifiedCalamity)html+='<p class="notice">Calamity изменяет подсказку этого предмета; изменения ещё не разобраны полностью.</p><details><summary>Оригинал Terraria без изменений Calamity</summary><div class="tooltip">'+textMarkup(entry.tooltip)+'</div></details>';
    else if(vanilla&&entry.tooltip) html+='<div class="tooltip">'+textMarkup(entry.tooltip)+'</div>';
    if(vanilla&&!entry.tooltipUnverifiedCalamity&&entry.terrariaTooltip&&entry.terrariaTooltip!==entry.tooltipRu)html+='<details><summary>Исходная подсказка Terraria без изменений Calamity</summary><div class="tooltip">'+textMarkup(entry.terrariaTooltip)+'</div></details>';
    if(!vanilla&&entry.tooltip)html+='<details class="original-tooltip"><summary>Оригинальная подсказка из игры (English)</summary><div class="tooltip">'+textMarkup(entry.tooltip)+'</div></details>';
    if(entry.tooltipDraftRu&&!entry.tooltipRu)html+='<details class="translation-draft"><summary>Русский перевод подсказки · черновик</summary><p class="small muted">Автоматический перевод ещё не прошёл редакторскую проверку. Для точных формулировок доступен оригинал выше.</p><div class="tooltip">'+textMarkup(entry.tooltipDraftRu)+'</div></details>';
    if(!entry.descriptionRu&&!entry.tooltipRu&&!entry.tooltip)html+='<p>Назначение и способы получения предмета приведены ниже.</p>';
    if(entry.calamityStatChanges&&Object.keys(entry.calamityStatChanges).length){
      const changes=Object.entries(entry.calamityStatChanges).filter(([key])=>statNames[key]);
      if(changes.length)html+='<details><summary>Изменения характеристик Calamity</summary><div class="table-wrap"><table><thead><tr><th>Свойство</th><th>Terraria</th><th>С Calamity</th></tr></thead><tbody>'+changes.map(([key,value])=>'<tr><td>'+esc(statNames[key])+'</td><td>'+formatStat(value.before,key)+'</td><td>'+formatStat(value.after,key)+'</td></tr>').join('')+'</tbody></table></div><p class="small muted">Показаны распознанные изменения базовых значений; другие свойства могут зависеть от условий игры.</p>'+evidenceLinks([entry.calamityStatSource].filter(Boolean),'Источник изменений')+'</details>';
    }
    if(entry.summonTagSource)html+=evidenceLinks([entry.summonTagSource],'Источник изменений метки');
    if(entry.tooltipSource?.length)html+=evidenceLinks(entry.tooltipSource,'Источник изменений подсказки');
    if(entry.availability)html+='<div class="availability"><strong>'+esc(entry.availability.label)+'</strong><p>'+textMarkup(entry.availability.detail||'')+'</p></div>';
    const unresolvedNote='<p class="small muted">«См. правило» — параметр, зависящий от состояния игры или ещё не вычисленный. '+(PUBLIC?'На сайте доступны сведения о проверенном источнике; полный код хранится в локальной исследовательской копии.':'Исходное правило раскрывается внизу страницы.')+'</p>';
    if(entry.tooltipIncomplete)html+=unresolvedNote;
    if(entry.wikiNote)html+='<p class="notice">'+esc(entry.wikiNote)+'</p>';
    if(vanilla)html+='<p class="small muted">Название в английской игре: '+esc(entry.en)+'.</p>';
    if(entry.keyControlNote)html+='<p class="small muted">«Назначенная клавиша» — клавиша способности из ваших настроек управления Calamity. Вики не читает и не меняет ваши настройки.</p>';
    if(entry.armorControlNote)html+='<p class="small muted">Активный бонус комплекта включается назначенной клавишей или двойным нажатием вниз/вверх — это зависит от ваших настроек управления Calamity.</p>';
    const extraNames={SetBonus:'Бонус комплекта',CommonSetBonus:'Общий бонус комплекта',SetBonusEffect:'Эффект комплекта',StealthStrike:'Скрытный удар',Lore:'История',ComboInfo:'Комбинация атак',ParryInfo:'Парирование',BlastInfo:'Особая атака',BlastInfoKeybind:'Особая атака: назначенная клавиша',TooltipNormal:'Обычный мир',TooltipGFB:'Особый сид get fixed boi',HoldShiftTooltip:'Подробности (Shift в игре)',SalesPitch:'Описание торговца',FlavorTooltip:'Дополнительное описание',DripEffect:'Эффект напитка',Equipped:'При экипировке',Unequipped:'Без экипировки',DefaultFunction:'Основное действие',DefaultPassive:'Пассивный эффект',MainInfo:'Основная атака',AltInfo:'Альтернативная атака',SetBonus1:'Бонус комплекта — часть 1',SetBonus2:'Бонус комплекта — часть 2',SetBonus3:'Бонус комплекта — часть 3'};
    if(entry.extraRu)for(const [key,value] of Object.entries(entry.extraRu))if(value)html+='<h3>'+esc(extraNames[key]||'Дополнительные свойства')+'</h3>'+paragraphs(value);
    if(entry.extra) for(const [key,value] of Object.entries(entry.extra)) if(value) html+='<details><summary>'+esc(extraNames[key]||(key.startsWith('Content')?'Текст записки':key.includes('GFB')?'Особый сид get fixed boi':key.includes('Locked')?'Условия разблокировки':'Дополнительные свойства'))+' · оригинал</summary><div class="tooltip">'+textMarkup(value)+'</div>'+(entry.extraIncomplete?.includes(key)?unresolvedNote:'')+'</details>';
    if(entry.conditions) html+='<details><summary>Условия использования</summary><pre>'+esc(entry.conditions)+'</pre></details>';
    html+='<h2 id="obtaining">Как получить</h2>';
    const acquisition=acquisitionByItem[id]||[];
    if(entry.obtainRu)html+=paragraphs(entry.obtainRu);
    if(entry.obtainEvidence?.length)html+=evidenceLinks(entry.obtainEvidence,'Источники получения');
    if(acquisition.length)html+=difficultyControls()+acquisitionTable(acquisition);
    if(entry.shopOffers?.length)html+='<h3>Продажа у торговцев</h3>'+shopTable(entry.shopOffers,'npc');
    else if(entry.shops?.length) html+='<h3>Торговцы</h3><p class="small muted">Наличие товара зависит от прогресса и условий магазина.</p><div class="item-links">'+entry.shops.map(key=>'<a href="'+path('npc',key)+'">'+esc(npcs[key]?.name||key)+'</a>').join('')+'</div>';
    if(!acquisition.length&&!entry.shopOffers?.length&&!entry.shops?.length&&!entry.obtainRu) html+='<p class="muted small">'+(recipes.length?'Создаётся по рецептам ниже: нажмите на недостающий ингредиент, чтобы узнать, где его взять.':'Источник ещё не разобран полностью: возможны сундуки, рыбалка или особое правило. Недостающие данные не означают, что предмет недоступен.')+'</p>';
    if(entry.worldReferences?.length) html+='<details><summary>Упоминания в правилах мира и общей добычи</summary><p class="small muted">Это ссылки на использующие предмет правила, а не гарантированные места получения.</p>'+entry.worldReferences.map(source=>'<p class="small"><a href="'+esc(source)+'" target="_blank" rel="noopener">'+esc(source.split('/').pop().replace('.cs',''))+'</a></p>').join('')+'</details>';
    html+='<div class="recipe-controls"><h2 id="recipes">Рецепты</h2>'+(recipes.length?'<label class="quantity-label">Нужно штук<input id="craft-quantity" aria-label="Нужное количество предметов" type="number" min="1" max="999999" value="1"></label>':'')+'</div><div id="item-recipes">'+(recipes.length?recipes.map(r=>recipeCard(r)).join(''):'<p class="muted small">Прямой рецепт не найден при разборе источников. Это не доказывает отсутствие рецепта в игре.</p>')+'</div><h2 id="used-in">Используется для</h2>'+ingredientUsage(id);
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
  const acquisitionByItem={};
  for(const [kind,entries] of [['npc',D.npcs],['item',[...D.items,...Object.values(D.vanilla)]]])for(const source of entries)for(const row of source.loot||[]){
    (acquisitionByItem[row.id]||=[]).push({...row,source:source.id,kind});
  }
  function acquisitionTable(rows){
    const visible=rows.filter(r=>lootEligible(r)&&(r.kind!=='item'||mode().expert||!(item(r.source)?.bossBag)));
    if(!visible.length)return '<p>Для выбранной сложности подходящих правил не найдено. Проверьте другой режим.</p>';
    return '<div class="table-wrap"><table class="acquisition-table"><thead><tr><th>Источник</th><th>Количество</th><th>Шанс</th><th>Условия получения</th></tr></thead><tbody>'+visible.map(r=>{
      const source=r.kind==='item'?item(r.source):npcs[r.source],boss=r.kind==='npc'?D.bosses.find(b=>b.npcs.includes(r.source)):null;
      return '<tr><td><a class="item-link" href="'+path(boss?'boss':r.kind,boss?.id||r.source)+'">'+image(source)+esc(boss?bossGuides[boss.id]?.title||boss.name:source?.name||r.source)+'</a></td><td>'+number(r.min??'—')+(r.max&&r.max!==r.min?'–'+number(r.max):'')+'</td><td>'+ (r.chance==null?'Особое правило':number(r.chance)+'%')+'</td><td>'+textMarkup(r.condition)+'</td></tr>';
    }).join('')+'</tbody></table></div><p class="small muted">Шансы относятся к указанному источнику при выполнении условий. Удача, особые сиды и другие моды могут их изменить.</p>';
  }
  function lootEligible(row) {
    const m=mode(),requirement=row.requirement;
    if(row.condition?.includes('Revengeance без режима Мастер'))return m.revenge&&!m.master;
    if(requirement==='normal') return !m.expert;
    if(requirement==='expert') return m.expert;
    if(requirement==='master') return m.master;
    if(requirement==='notMaster') return !m.master;
    if(requirement==='expertOnly') return m.expert&&!m.master;
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
    return breadcrumb('Боссы и события')+pageHeading('Боссы и события')+'<p class="lead">Единый маршрут Terraria и Calamity. Откройте бой: призыв, подготовка, тактика и добыча с переключателем сложности.</p><div class="chips">'+[['boss','Основные боссы · '+D.bosses.filter(b=>b.kind==='boss').length],['miniboss','Мини-боссы · 5'],['event','События · 4'],['all','Все записи']].map(([id,label])=>'<a href="#/bosses?type='+id+'" class="chip '+(type===id?'active':'')+'">'+label+'</a>').join('')+'</div><div class="boss-grid">'+rows.map(b=>'<a href="'+path('boss',b.id)+'" class="boss-tile">'+image(b)+'<span><strong>'+esc(bossGuides[b.id]?.title||b.name)+'</strong><small>'+esc(b.name)+'</small><small>'+stageName(b.order)+'</small></span></a>').join('')+'</div>';
  }
  function stageName(order) {return order<7?'До хардмода':order<18?'Хардмод':'После Лунного лорда';}
  function bossHealthBox(boss) {
    const facts=DIFF.bosses?.[boss.id],npc=npcs[facts?.npc]||boss.npcs.map(id=>npcs[id]).find(n=>n?.stats?.lifeMax!==undefined);
    if(!npc) return '<div class="infobox"><div class="portrait">'+image(boss)+'</div><h2>'+esc(bossGuides[boss.id]?.title||boss.name)+'</h2><p class="small muted">Событие или составная встреча. Характеристики отдельных существ — на их страницах.</p></div>';
    const data=(facts?.earlyHealth?.[mechProgress]||facts?.health)?.[difficulty]??facts?.health?.[difficulty==='revenge'?'revengeance':difficulty];
    const base=mode().revenge?(npc.stats.lifeRevengeance??npc.stats.lifeMax):npc.stats.lifeMax;
    return '<div class="infobox"><div class="portrait">'+image(boss,'',true)+'</div><h2>'+esc(bossGuides[boss.id]?.title||boss.name)+'</h2><div class="subtitle">'+esc(mode().label)+'</div><dl><div><dt>'+(data!==null&&data!==undefined?'Здоровье':'Базовое здоровье')+'</dt><dd data-boss-health>'+number(data??base)+'</dd></div>'+['damage','defense'].filter(k=>npc.stats[k]!==undefined||facts?.[k]?.[difficulty]!==undefined).map(k=>{const adjusted=k==='damage'&&facts?.earlyDamage?.[mechProgress]||facts?.[k];return '<div><dt>'+(k==='damage'?(adjusted?'Урон при появлении':'Базовый урон'):(adjusted?'Защита при появлении':'Базовая защита'))+'</dt><dd>'+number(adjusted?.[difficulty]??npc.stats[k])+'</dd></div>';}).join('')+'</dl><p class="small muted">'+esc(facts?.healthLabel||'База из SetDefaults до масштабирования сложности и числа игроков.')+'</p><p class="small muted">Компонент: <a href="'+path('npc',npc.id)+'">'+esc(npc.name)+'</a>.</p><p class="small muted">Для одного игрока, обычный сид, усиление HP в настройках: 0%. В вашей игре вдвоём HP может отличаться. Урон фаз и снарядов здесь не рассчитан.</p>'+((facts?.notes||[]).map(note=>'<p class="small muted">'+esc(note)+'</p>').join(''))+'</div>';
  }
  function difficultyEvidence(id) {
    const facts=DIFF.bosses?.[id];if(!facts)return '';
    let html='';
    const rows=[...(facts.components||[]),...(facts.variants||[])];
    if(rows.length)html+='<h3>Части встречи и варианты</h3><div class="table-wrap"><table><thead><tr><th>Часть / вариант</th><th>HP · 1 игрок</th><th>Условия</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+(r.npc&&npcs[r.npc]?'<a href="'+path('npc',r.npc)+'">'+esc(r.name||npcs[r.npc].name)+'</a>':esc(r.name||r.label||'Вариант'))+'</td><td class="numeric">'+number((r.earlyHealth?.[mechProgress]||r.health)?.[difficulty]??'—')+'</td><td class="small muted">'+esc(r.condition||r.label||r.notes?.join(' ')||r.healthLabel||'Отдельная часть встречи')+'</td></tr>').join('')+'</tbody></table></div>';
    return html+'<details><summary>Расчёт характеристик и источники</summary><p class="small">'+esc(facts.scaling)+'</p>'+(facts.evidence||[]).map(e=>'<p class="small"><a target="_blank" rel="noopener" href="'+esc(e.path)+'">'+esc(e.path.split('/').pop())+'</a>: '+esc(e.detail||'')+'</p>').join('')+'</details>';
  }
  function bossPage(id) {
    const b=bosses[id],g=bossGuides[id];if(!b)return missing();
    const loot=b.npcs.flatMap(key=>npcs[key]?.loot||[]);
    const uniqueLoot=[...new Map(loot.map(r=>[r.id+'|'+r.condition+'|'+r.min+'|'+r.max+'|'+r.chance,r])).values()];
    const bags=uniqueLoot.filter(r=>r.condition?.startsWith('Эксперт / Мастер')||items[r.id]?.group==='bags').map(r=>item(r.id)).filter(Boolean);
    let html=breadcrumb(['Боссы','#/bosses'],g?.title||b.name)+pageHeading(g?.title||b.name,path('boss',id),b.name)+'<p class="lead">'+esc(g?.summary||b.spawn)+'</p>'+difficultyControls();
    if(DIFF.bosses?.[id]?.earlyHealth)html+='<div class="filters mech-controls">'+select('mechProgress',{first:'Ещё не побеждён ни один',second:'Побеждён один из трёх',full:'Побеждены два / переработка выключена'},mechProgress,'Переработка раннего хардмода: победы над мехами')+'</div>';
    html+='<div class="article-layout"><article class="article-body"><h2 id="summon">Как призвать</h2>'+paragraphs(g?.summon||b.spawn)+listLinks(b.summons);
    if(g){html+='<h2 id="arena">Арена и подготовка</h2>'+paragraphs(g.arena)+'<h2 id="tactics">Тактика боя</h2>'+bulletList(g.tactics||[])+'<h3>Призыватель + стрелок</h3>'+paragraphs(g.coop)+'<h2 id="unlocks">Что открывает победа</h2>'+paragraphs(g.unlocks);}
    if(g?.changes)html+='<h2>Что меняет Calamity</h2>'+paragraphs(g.changes);
    const eventTiers={AcidRainT1:['PossibleEnemiesPreHM'],AcidRainT2:['PossibleEnemiesAS','PossibleMinibossesAS'],AcidRainT3:['PossibleEnemiesPolter','PossibleMinibossesPolter']}[id]||[];
    const roster=b.kind==='event'?D.npcs.filter(e=>e.spawnInfo?.event==='acid-rain'&&(!eventTiers.length||(e.spawnInfo.eventEntries||[]).some(x=>eventTiers.includes(x.tier)))):[];
    if(roster.length)html+='<h2 id="roster">Кто появляется на этом этапе</h2><p class="small muted">Список существ события; точные веса, требования к воде и очки вклада указаны на их страницах.</p><div class="item-links">'+roster.map(e=>'<a class="item-link" href="'+path('npc',e.id)+'">'+image(e)+esc(e.name)+'</a>').join('')+'</div>';
    html+='<h2 id="loot">Добыча · '+esc(mode().label)+'</h2>'+(b.lootNote?'<p class="small muted">'+esc(b.lootNote)+'</p>':'')+lootTable(uniqueLoot);
    if(mode().expert) for(const bag of bags) if(bag.loot?.length) html+='<h3>Содержимое '+esc(bag.name)+'</h3><p class="small">'+itemLink(bag.id)+'</p>'+lootTable(bag.loot,bag.name);
    html+='<h2 id="parts">Участники и части босса</h2><div class="item-links">'+b.npcs.filter(key=>npcs[key]).map(key=>'<a class="item-link" href="'+path('npc',key)+'">'+image(npcs[key])+esc(npcs[key].name)+'</a>').join('')+'</div>'+difficultyEvidence(id)+evidenceLinks(g?.evidence,'Источники руководства')+'<div class="notice">Тактика — рекомендации для подготовки, не запись игрового теста. '+(PUBLIC?'Сведения о проверенных источниках доступны на страницах существ.':'Сложные и особые условия добычи раскрыты в коде на страницах существ.')+'</div>'+sourceLine('sources/decompiled/CalamityMod/WeakReferenceSupport.cs')+'</article><aside>'+bossHealthBox(b)+toc([['summon','Призыв'],['arena','Арена'],['tactics','Тактика'],['unlocks','После победы'],['loot','Добыча'],['parts','Состав встречи']])+'</aside></div>';
    return html;
  }

  const spawnKindLabels={natural:'Естественный спавн',boss:'Босс',bossPart:'Часть боя',bossAdd:'Прислужник боя',event:'Событие',town:'Городской NPC',summoned:'Появляется из другого NPC',part:'Часть существа',lab:'Лаборатория Дредона',critter:'Существо',special:'Особое появление',vanilla:'Terraria',vanillaBoss:'Босс Terraria'};
  function spawnLinks(si) {
    let out='';
    if(si.boss&&bosses[si.boss])out+='<p class="small"><a href="'+path('boss',si.boss)+'">Полное руководство боя: '+esc(bossGuides[si.boss]?.title||bosses[si.boss].name)+' →</a></p>';
    if(si.parent&&npcs[si.parent])out+='<p class="small">Связанное существо: <a href="'+path('npc',si.parent)+'">'+esc(npcs[si.parent].name)+'</a></p>';
    return out;
  }
  function spawnFacts(si) {
    const rows=[],all=key=>[...new Set((si.rules||[]).flatMap(r=>r.conditions?.[key]||[]))];
    const add=(label,value)=>{if(value&&value.length)rows.push('<div><dt>'+esc(label)+'</dt><dd>'+value+'</dd></div>')};
    add('Тип появления',esc(spawnKindLabels[si.kind]||si.kind||''));
    if(si.environment?.length)add('Среда обитания',si.environment.map(esc).join('; '));
    add('Биом',all('biomes').map(esc).join(', '));
    add('Слой',all('layers').map(esc).join(', '));
    add('Время',all('time').map(esc).join(', '));
    add('Погода',all('weather').map(esc).join(', '));
    add('Событие',all('events').map(esc).join(', '));
    const hard=all('hardmode');
    add('Хардмод',hard.length?(hard.some(Boolean)?'да':'нет'):'');
    add('Вода',(si.rules||[]).some(r=>r.conditions?.water===true)?'нужна':'');
    add('Прогресс',all('progression').map(x=>esc(x.replace('после победы — ','после победы: ').replace('до победы — ','до победы: '))).join('; '));
    add('Ограничения',all('limits').map(esc).join('; '));
    add('Не появляется',all('excludes').map(esc).join(', '));
    add('Мир',all('worlds').map(esc).join('; '));
    if(si.banner&&items[si.banner])add('Баннер',itemLink(si.banner));
    if(si.catchItem&&items[si.catchItem])add('Ловится',itemLink(si.catchItem));
    if(si.sourceUrl)add('Справочник','<a href="'+esc(si.sourceUrl)+'" target="_blank" rel="noopener">Terraria Wiki</a>');
    return rows.length?'<dl class="spawn-facts">'+rows.join('')+'</dl>':'';
  }
  function spawnRules(si) {
    const rows=(si.summary||[]).map(line=>line.split('. Частота: '));
    if(!rows.length)return '';
    return '<div class="table-wrap"><table class="spawn-table"><thead><tr><th>Где и когда</th><th>Частота</th></tr></thead><tbody>'+rows.map(([cond,chance])=>'<tr><td>'+textMarkup(cond)+'</td><td>'+(chance?textMarkup(chance.replace(/\.$/,'')):'—')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function eventSpawnTable(si) {
    if(!si.eventEntries?.length)return '';
    return '<h3>Этапы события</h3><div class="table-wrap"><table><thead><tr><th>Этап</th><th>Где</th><th>Вес</th><th>Очки вклада</th></tr></thead><tbody>'+si.eventEntries.map(row=>'<tr><td>'+esc(row.eventName)+'</td><td>'+esc(row.requirement||'')+'</td><td>'+(row.rate==null?'—':number(row.rate))+'</td><td>'+(row.points==null?'—':number(row.points))+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function townSpawn(si) {
    if(!si.townConditions?.length)return '';
    return '<h3>Как переехать</h3>'+bulletList(si.townConditions);
  }
  function spawnsPage(params) {
    const kind=params.get('kind')||'';
    const biome=params.get('biome')||'';
    const q=normalize(params.get('q')||'');
    const page=Math.max(1,Number(params.get('page'))||1);
    const all=(entry,key)=>[...new Set((entry.spawnInfo?.rules||[]).flatMap(r=>r.conditions?.[key]||[]))];
    const rawBiomes=[...new Set(D.npcs.flatMap(e=>[...all(e,'biomes'),...(e.spawnInfo?.environment||[])]) )];
    const biomes=[...new Set(rawBiomes.flatMap(b=>[b,b.split(':')[0],b.startsWith('Бездна,')?'Бездна':null]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
    let rows=D.npcs.filter(e=>e.spawnInfo).filter(e=>{
      const si=e.spawnInfo;
      if(kind&&si.kind!==kind)return false;
      const biomeValues=[...all(e,'biomes'),...(si.environment||[])];
      if(biome&&!biomeValues.some(v=>v===biome||v.startsWith(biome+',')||v.includes(biome)))return false;
      if(q&&!normalize([e.name,e.en,...(si.summary||[]),...(si.environment||[]),...all(e,'biomes')].join(' ')).includes(q))return false;
      return true;
    }).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    const kindOptions={natural:'Естественный спавн',event:'Событие',boss:'Боссы',town:'Городские NPC',bossPart:'Части боссов',summoned:'Появляются из других',lab:'Лаборатории',special:'Особые',vanilla:'Terraria',vanillaBoss:'Боссы Terraria'};
    let html=breadcrumb('Появление')+pageHeading('Кто, где и когда появляется')+'<p class="lead">Спавн существ Calamity и Terraria: биом, слой, время, события, прогресс и ограничения. Условия Calamity восстановлены по исходникам 2.2.4; для обычных существ указана среда обитания из справочной таблицы Terraria Wiki.</p><form class="filters" id="spawn-filters"><label class="filter-search">Найти существо<input name="q" type="search" value="'+esc(params.get('q')||'')+'" placeholder="Название, биом или условие"></label>'+select('kind',{'':'Все типы',...kindOptions},kind,'Тип появления')+select('biome',{'':'Все биомы',...Object.fromEntries(biomes.map(b=>[b,b]))},biome,'Биом')+'<button class="button" type="submit">Найти</button></form><div class="count-line"><span>'+number(rows.length)+' существ</span>'+(params.size?'<a href="#/spawns">Сбросить фильтры</a>':'')+'</div>';
    if(!rows.length)return html+'<div class="empty-state"><h2>Ничего не найдено</h2><p class="muted">Измените фильтры или название.</p></div>';
    html+='<div class="table-wrap"><table class="spawn-directory"><thead><tr><th>Существо</th><th>Тип</th><th>Где и когда</th><th>Частота</th></tr></thead><tbody>'+rows.slice((page-1)*120,page*120).map(e=>{
      const si=e.spawnInfo,where=(si.summary||[]).map(x=>x.split('. Частота: ')[0]).join(' ').replace(/\.$/,'');
      const chance=(si.summary||[]).map(x=>x.split('. Частота: ')[1]).filter(Boolean).map(x=>x.replace(/\.$/,'')).join('; ');
      return '<tr><td><a class="item-link" href="'+path('npc',e.id)+'">'+image(e)+esc(e.name)+'</a></td><td>'+esc(spawnKindLabels[si.kind]||si.kind||'')+'</td><td class="small">'+textMarkup(where)+'</td><td class="small">'+textMarkup(chance||'—')+'</td></tr>';
    }).join('')+'</tbody></table></div>'+pagination(rows.length,page,120,params)+'<p class="small muted">Для существ Calamity показан структурированный итог проверок SpawnChance. Для обычных существ Terraria указана среда обитания; детальные условия Terraria не пересобирались.</p>';
    return html;
  }

  function npcPage(id) {
    const e=npcs[id];if(!e)return missing();
    const boss=D.bosses.find(b=>b.npcs.includes(id)),si=e.spawnInfo||{};
    const tocRows=[['description','Описание'],['spawn','Появление']];
    let html=breadcrumb(['Бестиарий','#/npcs'],e.name)+pageHeading(e.name,path('npc',id),spawnKindLabels[si.kind]||e.namespace)+(boss?'<p class="small"><a href="'+path('boss',boss.id)+'">Полное руководство: '+esc(bossGuides[boss.id]?.title||boss.name)+' →</a></p>':'')+'<div class="article-layout"><article class="article-body"><h2 id="description">Описание</h2>';
    if(e.descriptionRu)html+=paragraphs(e.descriptionRu);
    if(e.descriptionMachine)html+='<p class="small muted">Перевод описания из бестиария подготовлен локальной моделью; оригинал ниже. Игровые условия важнее литературного текста.</p>';
    if(e.descriptionGenerated)html+='<p class="small muted">Отдельного литературного описания в бестиарии нет; выше собраны проверенные сведения о появлении.</p>';
    if(e.description)html+='<details><summary>Оригинальный текст из игры (English)</summary><div class="tooltip">'+textMarkup(e.description)+'</div></details>';
    html+='<h2 id="spawn">Появление</h2>'+spawnLinks(si);
    if(si.rules?.length)html+=spawnRules(si);else if(si.summary?.length)html+=paragraphs(si.summary);
    html+=spawnFacts(si)+eventSpawnTable(si)+townSpawn(si);
    if(si.boss&&bosses[si.boss])html+='<p class="small"><a href="'+path('boss',si.boss)+'">Стратегия боя, арена и добыча →</a></p>';
    if(si.method==='terraria-wiki-infobox')html+='<p class="small muted">Среда обитания и тип взяты из справочной таблицы Terraria Wiki; Calamity может менять отдельные условия. Проверьте страницу боя или источник, если мир сильно изменён модами.</p>';
    if(e.biomeTags?.length)html+='<p class="small">Места из бестиария: '+esc(e.biomeTags.join(', '))+'</p>';
    if(e.vulnerabilities&&Object.keys(e.vulnerabilities).length)html+='<h3>Уязвимости по типам эффектов</h3><p class="small">'+Object.entries(e.vulnerabilities).map(([k,v])=>esc(({Heat:'Жар',Cold:'Холод',Sickness:'Болезнь',Water:'Вода',Electricity:'Электричество'}[k])||k)+': '+(v?'уязвим':'устойчив')).join(' · ')+'</p>';
    if(e.loot?.length)html+='<h2>Добыча</h2>'+difficultyControls()+lootTable(e.loot);
    if(e.shopOffers?.length)html+='<h2>Ассортимент магазина</h2>'+shopTable(e.shopOffers,'item');
    else if(e.shopItems?.length)html+='<h2>Ассортимент магазина</h2><p class="muted small">Часть товаров открывается после побед или в особых условиях.</p>'+listLinks(e.shopItems);
    html+=sourceDetails('npc',id)+sourceLine(e.source)+'</article><aside>'+statBox(e,['lifeMax','lifeRevengeance','lifeBossRush','damage','defense','knockBackResist'])+toc(tocRows)+'</aside></div>';
    return html;
  }
  function buffPage(id) {
    const e=buffs[id];if(!e)return missing();
    return breadcrumb(['Эффекты','#/buffs'],e.name)+pageHeading(e.name,path('buff',id),e.debuff===true?'Дебафф':e.debuff===false?'Бафф':'Эффект')+'<div class="article-layout"><article class="article-body"><h2>Эффект</h2>'+(e.descriptionRu?paragraphs(e.descriptionRu)+(e.description&&e.description!==e.descriptionRu?'<details><summary>'+(e.vanilla?'Исходная подсказка Terraria':'Оригинальный текст из игры')+'</summary><div class="tooltip">'+textMarkup(e.description)+'</div></details>':''):'<p class="muted">'+(e.descriptionUnverifiedCalamity?'Calamity изменяет этот эффект; изменения ещё не разобраны полностью.':'Русское пояснение для этого эффекта ещё не проверено.')+'</p>')+(e.description&&!e.descriptionRu?'<details><summary>'+(e.vanilla?'Исходная подсказка Terraria':'Оригинальная подсказка')+'</summary><div class="tooltip">'+textMarkup(e.description)+'</div></details>':'')+(e.descriptionDraftRu?'<details><summary>Русский перевод · непроверенный черновик</summary>'+paragraphs(e.descriptionDraftRu)+'</details>':'')+evidenceLinks(e.descriptionSource,'Источник изменений Calamity')+sourceDetails('buff',id,'Правило эффекта')+sourceLine(e.source)+'</article><aside>'+statBox(e,[])+'</aside></div>';
  }
  function classesPage() {return breadcrumb('Классы')+pageHeading('Пять путей через Calamity')+'<p class="lead">Сборки по этапам, принципы класса и практические советы. Призыватель и стрелок вынесены вперёд для вашего совместного прохождения.</p><div class="class-directory">'+Object.entries(classes).map(([id,label])=>'<a href="'+path('class',id)+'">'+image(items[iconItems[id]])+'<div><h2>'+label+'</h2><p>'+esc(guides[id]?.summary||'Оружие, броня, аксессуары и механики класса.')+'</p></div></a>').join('')+'</div>';}
  function classPage(id,params) {
    const g=guides[id];if(!g)return missing();
    const choice=params.get('stage')??readStore('stage','start'),selected=g.stages.some(s=>s.id===choice)?choice:'start';
    const stageOptions=Object.fromEntries(g.stages.map(s=>[s.id,s.title]));
    const categories={weapons:'Оружие',armor:'Броня',accessories:'Аксессуары',consumables:'Зелья и боеприпасы'};
    const category=params.get('gear') in categories?params.get('gear'):'weapons';
    const s=g.stages.find(s=>s.id===selected),position=g.stages.indexOf(s);
    const arrow=direction=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(direction<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7')+'"/></svg>';
    let html=breadcrumb(['Классы','#/classes'],g.title)+pageHeading(g.title,path('class',id))+'<p class="lead">'+esc(g.summary)+'</p><div class="button-row"><a class="button" href="#/items?group=weapons&class='+encodeURIComponent(id)+'">Всё оружие класса</a>'+(id==='Summon'||id==='Ranged'?'<a class="button" href="'+path('class',id==='Summon'?'Ranged':'Summon')+'?stage='+encodeURIComponent(selected)+'&gear='+category+'">Сборка напарника →</a>':'')+'<a class="button" href="#class-mechanics" data-scroll="class-mechanics">Механики класса ↓</a></div><form class="filters stage-filters">'+select('stage',stageOptions,selected,'Ваш этап прохождения')+'<div class="stage-arrows"><button type="button" class="icon-button" data-stage="'+esc(g.stages[position-1]?.id||'')+'" aria-label="Предыдущий этап" '+(position===0?'disabled':'')+'>'+arrow(-1)+'</button><span>'+(position+1)+' / '+g.stages.length+'</span><button type="button" class="icon-button" data-stage="'+esc(g.stages[position+1]?.id||'')+'" aria-label="Следующий этап" '+(position===g.stages.length-1?'disabled':'')+'>'+arrow(1)+'</button></div></form><div class="guide-sections"><section class="build-stage" id="stage-'+esc(s.id)+'"><h2>'+esc(s.title)+'</h2>'+paragraphs(s.description);
    html+='<div class="gear-tabs-wrap"><button class="icon-button" type="button" data-gear-shift="-1" aria-label="Предыдущая категория">'+arrow(-1)+'</button><div class="gear-tabs" role="tablist" aria-label="Категория снаряжения">'+Object.entries(categories).map(([key,label])=>'<button type="button" role="tab" id="gear-tab-'+key+'" aria-controls="gear-panel" aria-selected="'+(key===category)+'" tabindex="'+(key===category?0:-1)+'" data-gear="'+key+'">'+label+' <span>'+ (s[key]?.length||0)+'</span></button>').join('')+'</div><button class="icon-button" type="button" data-gear-shift="1" aria-label="Следующая категория">'+arrow(1)+'</button></div>';
    html+='<div id="gear-panel" role="tabpanel" aria-labelledby="gear-tab-'+category+'" tabindex="0" class="gear-panel">'+(s[category]?.length?'<ul class="gear-list">'+s[category].map(ref=>{const entry=item(ref);return '<li>'+itemLink(ref)+'<p>'+textMarkup(entry?.guideNote||(Array.isArray(entry?.descriptionRu)?entry.descriptionRu[0]:entry?.descriptionRu)||'Откройте предмет: получение, рецепт и характеристики.')+'</p></li>';}).join('')+'</ul>':'<p>Специальные расходники для этого этапа не обязательны. Используйте подходящие лечебные зелья и усиления класса.</p>')+'</div>'+ (s.notes?'<p class="stage-note">'+textMarkup(s.notes)+'</p>':'')+evidenceLinks(s.evidence,'Источники этапа')+'</section>';
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
    const pictures=(a.images||[]).map(i=>'<figure class="biome-image"><img src="'+esc(i.image)+'" alt="'+esc(a.title)+'"><figcaption>'+esc(i.caption)+' <span class="small">Источник: '+(i.source.startsWith('https://')?'<a href="'+esc(i.source)+'" target="_blank" rel="noopener">страница изображения</a>':esc(i.source))+'</span>'+(i.attribution?'<br><span class="small">'+esc(i.attribution)+' '+(i.license?'<a href="'+esc(i.license)+'" target="_blank" rel="noopener">CC BY-NC-SA 3.0</a>':'')+'</span>':'')+'</figcaption></figure>');
    return breadcrumb([world?'Биомы и мир':'Механики',world?'#/world':'#/mechanics'],a.title)+pageHeading(a.title,path('article',id))+'<p class="lead">'+esc(a.summary)+'</p>'+(pictures[0]||'')+(pictures.length>1?'<details><summary>Другие изображения · '+(pictures.length-1)+'</summary>'+pictures.slice(1).join('')+'</details>':'')+'<div class="guide-sections">'+a.sections.map(s=>'<section><h2>'+esc(s.title)+'</h2>'+paragraphs(s.body)+'</section>').join('')+'</div>'+(a.relatedItems?.length?'<h2>Связанные предметы</h2>'+listLinks(a.relatedItems):'')+evidenceLinks(a.evidence,'Источники статьи');
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
    return breadcrumb(['Предметы','#/items'],'Группа материалов')+pageHeading(name)+'<p class="lead">В рецептах можно использовать подходящий предмет из этой группы. Состав сверяется с правилами Terraria и Calamity.</p>'+(g?.rule?'<p>'+esc(g.rule)+'</p>':'')+(g?.items?.length?listLinks(g.items):'<p class="muted small">Полный список зависит от загруженных модов и не вычислен в этой офлайн-копии.</p>')+'<h2>Используется для</h2>'+ingredientUsage('g:'+id)+sourceLine(g?.source||'sources/decompiled/CalamityMod.Systems/RecipeSystem.cs');
  }
  function publicSources(file) {
    if(file&&!PUBLIC.sources[file])return missing();
    const provenance=file?'<h2>'+esc(file.split('/').pop())+'</h2><p>Данные сверены с этим файлом из локальной копии установленной сборки. Полный файл в публичный сайт не включён.</p><p class="small">'+esc(file)+'</p><p class="small">SHA-256 проверенного файла:</p><pre>'+esc(PUBLIC.sources[file])+'</pre>':'';
    return breadcrumb('Источники')+pageHeading('Источники и точность данных')+provenance+'<div class="guide-sections"><h2>Версия и покрытие</h2><p>Неофициальная справочная вики Calamity 2.2.4: '+number(D.items.length)+' предмет, '+number(D.recipes.length)+' рецепта, все пять классов, боссы, биомы и механики. Источник чисел — отдельная копия установленного мода. Публичная ветка исходников может отставать от этой версии.</p><h2>Как читать данные</h2><p>Характеристики предметов — исходные значения до модификаторов игрока. Здоровье боссов рассчитано для одного игрока, обычного сида и усиления HP 0%; мультиплеер, фазы и снаряды могут отличаться. Специальные условия добычи отмечены отдельно. Невычисленные динамические свойства обозначены в описаниях.</p><p>Каталог включает прямые регистрации рецептов; дополнительные моды, магазины и изменения во время игры могут влиять на результат. Тактика — рекомендации по исходникам; боевые проверки не проводились.</p><h2>Происхождение</h2><p>Архив мода, DLL и полные декомпилированные файлы не распространяются через этот сайт. Карточки источников сохраняют имена и контрольные суммы проверенных локальных файлов; полный код доступен в локальной копии вики.</p><p><a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener">Публичный проект Calamity</a> · <a href="https://calamitymod.wiki.gg/wiki/Version_history" target="_blank" rel="noopener">Официальная история версий</a> · <a href="data/coverage.json" target="_blank" rel="noopener">Покрытие данных</a></p><p>Среда обитания и тип обычных существ Terraria взяты из инфобоксов <a href="https://terraria.wiki.gg/" target="_blank" rel="noopener">Terraria Wiki</a>; текст статей не копировался. Описания существ Calamity без русского текста переведены локальной моделью Helsinki-NLP/opus-mt-en-ru и помечены как машинный перевод; английский оригинал раскрывается на странице.</p><h2>Авторы и материалы</h2><p>Calamity и связанные изображения, названия и тексты принадлежат Azafure, LLC и соответствующим авторам. Terraria принадлежит Re-Logic; tModLoader — его разработчикам. Этот справочный сайт не является официальным проектом этих команд.</p><p><a href="THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">Авторство и условия использования материалов</a> · <a href="'+esc(PUBLIC.repository)+'" target="_blank" rel="noopener">Репозиторий сайта</a></p><h2>Ваше прохождение</h2><p>Избранное, тема и отметки боссов сохраняются только в вашем браузере. Сайт не читает игру и не передаёт отметки другим игрокам. При очистке браузера они могут исчезнуть. Скачанные файлы сайта можно открыть локально без сервера.</p></div>';
  }
  function sources() {
    if(PUBLIC)return publicSources(currentParams.get('file'));
    return breadcrumb('Источники')+pageHeading('Об этой вики')+'<p class="lead">Персональная офлайн-энциклопедия для вашей установленной Calamity 2.2.4. Каталог и справочные числа извлечены из отдельной копии мода; русские руководства написаны по его правилам.</p><div class="guide-sections"><h2>Что включено</h2><dl class="definition-list"><dt>'+number(D.items.length)+' предметов и '+number(D.recipes.length)+' рецептов</dt><dd>Все найденные не абстрактные типы ModItem, их спрайты, игровые описания, прямые регистрации рецептов, связи ингредиентов и результатов. Включены 5455 обычных предметов с иконками и более 2000 рецептов Terraria с обработанными изменениями Calamity.</dd><dt>'+D.npcs.length+' типов существ, '+D.buffs.length+' эффектов, '+D.biomes.length+' определений биомов</dt><dd>Включены служебные существа и отдельные части боссов. Поэтому число типов больше числа самостоятельных противников.</dd><dt>26 боссов, 5 мини-боссов и 4 события</dt><dd>Реестр встреч и порядок взяты из интеграции Boss Checklist. Для пяти классов есть отдельные руководства со сборками.</dd></dl><h2>Как читать характеристики</h2><p>Числа предметов и существ — значения, явно заданные в SetDefaults. Они не включают экипировку игрока, префиксы, глобальные изменения, настройки сервера, фазы босса и число участников. На странице босса переключатель выбирает режим и соответствующую таблицу добычи. Там, где конечное здоровье не подтверждено формулой, число подписано как базовое.</p><p>В обычном режиме оружие часто выпадает из самого босса; в Эксперте и Мастере — из сумки. Для групп оружия Calamity учитывается дополнительный выбор одного предмета, если все обычные броски оказались неудачными. Особые сиды, первая победа и испытания помечаются как отдельные условия.</p><h2>Границы автоматического разбора</h2><p>Каталог сохраняет прямые рецепты и их исходные правила. Изменения рецептов после регистрации, наследуемые настройки, динамические магазины и содержимое мира могут зависеть от дополнительных правил. Ссылки на исходные файлы и раскрывающиеся блоки позволяют проверить их без интернета. Отсутствие найденного рецепта или источника не означает, что предмет нельзя получить.</p><p>В моде есть только английская локализация. Названия сохранены для поиска в игре. Основные пояснения, тактика и руководства написаны на русском. Автоматические переводы подсказок отмечены как черновики и раскрываются отдельно; они ещё требуют редакторской проверки. Некоторые описания содержат динамические поля, которые игра подставляет во время работы.</p><h2>Откуда взяты данные</h2><ul><li><a href="sources/archive-index.json" target="_blank" rel="noopener">Манифест скопированного архива</a> — версия 2.2.4, tModLoader 2026.6.3.4.</li><li><a href="data/coverage.json" target="_blank" rel="noopener">Отчёт о покрытии</a> и <a href="data/catalog.json" target="_blank" rel="noopener">каталог в JSON</a>.</li><li><a href="https://calamitymod.wiki.gg/wiki/Version_history" target="_blank" rel="noopener">Официальная история версий</a> — сверка последней версии, нужен интернет.</li><li><a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener">Публичные исходники Calamity</a> — дополнительная ссылка. Основа этой вики — установленная сборка, поскольку публичная ветка может отставать.</li><li><a href="https://terraria.wiki.gg/" target="_blank" rel="noopener">Terraria Wiki</a> — только инфобоксы «среда обитания» и «тип» для обычных существ и предметов Terraria. Текст статей не копировался.</li></ul><p class="small muted">Описания существ Calamity, у которых нет русского текста в игре, переведены локальной моделью Helsinki-NLP/opus-mt-en-ru и помечены как машинный перевод. Оригинальный английский текст из бестиария всегда раскрывается на странице.</p><h3>Контрольная сумма копии</h3><pre>'+esc(D.meta.sha256)+'</pre><h2>Локальная работа</h2><p>Откройте index.html или «Открыть вики.cmd». Сервер, аккаунт и интернет не нужны. Избранное, тема и отметки прохождения хранятся в localStorage браузера. При переносе папки или смене браузера сохранённые отметки могут не перенестись.</p><p>Игра, моды, персонажи и миры не изменялись. Во время сборки игра не запускалась и не перезагружалась; игровые проверки боя не проводились.</p><h2>Авторы оригинала</h2><p>Calamity Mod и его изображения созданы командой и художниками Calamity. Terraria — Re-Logic, tModLoader — его разработчиками. Это личная локальная справка, не официальный сайт и не сборка мода для распространения. Публичная версия доступна на GitHub Pages; она содержит справочные данные без архивов и полных исходников игры.</p></div>';
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
    else if(section==='spawns')content=spawnsPage(currentParams);
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
    linkMentions();
    const activeGear=main.querySelector('[role="tab"][aria-selected="true"]');
    if(activeGear){const strip=activeGear.parentElement;strip.scrollLeft=activeGear.offsetLeft-strip.offsetLeft-(strip.clientWidth-activeGear.offsetWidth)/2;}
    document.title=(main.querySelector('h1')?.textContent||'Calamity Wiki')+' · Calamity 2.2.4';
    const active=section==='class'?id:section==='article'?(['biome','event','world'].includes(articles[id]?.category)?'world':'mechanics'):({item:'items',npc:'npcs',boss:'bosses',buff:'buffs',group:'items'}[section]||section||'home');
    document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===active);if(a.dataset.nav===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');
    document.querySelector('#search-results').hidden=true;
    window.scrollTo({top:keepScroll?scroll:0,behavior:'instant'});
    const quantity=document.querySelector('#craft-quantity');
    if(quantity)quantity.addEventListener('input',()=>{const n=Math.min(999999,Math.max(1,Number(quantity.value)||1));document.querySelector('#item-recipes').innerHTML=(recipesByOutput[normalizeItemId(id)]||[]).map(r=>recipeCard(r,n)).join('');linkPublicSources();linkMentions(document.querySelector('#item-recipes'));});
    const form=document.querySelector('#catalog-filters');
    if(form){const submit=()=>{const params=new URLSearchParams();for(const [key,value]of new FormData(form))if(value)params.set(key,value);location.hash='#/'+section+'?'+params;};form.addEventListener('submit',e=>{e.preventDefault();submit();});form.querySelectorAll('select').forEach(s=>s.addEventListener('change',submit));}
    const stageSelect=document.querySelector('.stage-filters select');
    if(stageSelect)stageSelect.addEventListener('change',()=>changeClassTab('stage',stageSelect.value));
    if(focusKey)main.querySelector('['+focusKey+'="'+CSS.escape(focusValue)+'"]')?.focus({preventScroll:true});
  }
  function changeClassTab(key,value){
    if(key==='stage')saveStore('stage',value);
    const params=new URLSearchParams(currentParams);params.set(key,value);
    history.replaceState(null,'','#/'+currentRoute+'?'+params);render(true);
    if(key==='gear')document.querySelector('[data-gear="'+CSS.escape(value)+'"]')?.focus({preventScroll:true});
  }
  main.addEventListener('change',e=>{
    if(e.target.name==='mechProgress'){mechProgress=e.target.value;saveStore('mech-progress',mechProgress);render(true);return;}
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
    const gear=e.target.closest('[data-gear]');if(gear){changeClassTab('gear',gear.dataset.gear);return;}
    const stage=e.target.closest('[data-stage]');if(stage&&stage.dataset.stage){changeClassTab('stage',stage.dataset.stage);return;}
    const shift=e.target.closest('[data-gear-shift]');if(shift){const tabs=[...main.querySelectorAll('[data-gear]')],pos=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true');changeClassTab('gear',tabs[(pos+Number(shift.dataset.gearShift)+tabs.length)%tabs.length].dataset.gear);return;}
    const scroll=e.target.closest('[data-scroll]');
    if(scroll){e.preventDefault();document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
    const favorite=e.target.closest('[data-favorite]');
    if(favorite){const route=favorite.dataset.favorite;favorites=favorites.includes(route)?favorites.filter(x=>x!==route):[...favorites,route];saveStore('favorites',favorites);render(true);return;}
    if(!e.target.closest('.global-search'))document.querySelector('#search-results').hidden=true;
  });
  main.addEventListener('keydown',e=>{
    if(!e.target.matches('[role="tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const tabs=[...main.querySelectorAll('[data-gear]')],pos=tabs.indexOf(e.target);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(pos+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    changeClassTab('gear',tabs[next].dataset.gear);
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
  const navIcons={home:'LoreCalamitas',progression:'DesertMedallion',classes:'RogueEmblem',items:'Murasama',bosses:'DesertMedallion',npcs:'CrawCarapace',spawns:'CausticTear',world:'AstralBeaconItem',mechanics:'DraedonsLogPlanetoid',buffs:'BloodOrb',Summon:iconItems.Summon,Ranged:iconItems.Ranged,favorites:'AerialiteBar'};
  document.querySelectorAll('[data-nav]').forEach(link=>{const entry=items[navIcons[link.dataset.nav]];if(entry)link.insertAdjacentHTML('afterbegin',image(entry,'nav-icon',true));});
  window.addEventListener('hashchange',()=>render());
  render();
})();
