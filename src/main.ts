import "./style.css";
import { loadWardrobe } from "./data";
import type {
  City,
  Forecast,
  Item,
  Outfit,
  Scene,
  Wardrobe,
  WeatherDay,
} from "./types";
import {
  categoryNames,
  sceneNames,
  generateCombination,
  planWeek,
  replacementAdvice,
  isRainy,
} from "./recommend";
import {
  readLocal,
  saveLocal,
  searchCities,
  getForecast,
  cachedForecast,
  cityDate,
  datesFrom,
  weatherIcon,
  weatherLabel,
} from "./weather";

const app = document.querySelector<HTMLDivElement>("#app")!;
let data: Wardrobe;
let scene: Scene = readLocal("wardrobe.scene", "commute");
if (!Object.hasOwn(sceneNames, scene)) scene = "commute";
let city: City | null = readLocal<City | null>("wardrobe.city", null),
  forecast: Forecast | null = null,
  weatherError = "",
  weatherLoading = false,
  weatherRequest = 0;
if (
  city &&
  (!Number.isFinite(city.latitude) ||
    !Number.isFinite(city.longitude) ||
    !city.timezone)
)
  city = null;
let selectedDate = "",
  query = "",
  category = "all",
  closetScene = "all",
  galleryScene = "all";
let modal: HTMLDialogElement | null = null,
  searchRequest = 0,
  returnFocus: HTMLElement | null = null;
const e = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const icon = (name: string, size = 22) => {
  const paths: Record<string, string> = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    cloud:
      '<path d="M6 18a4 4 0 0 1-1-7.9 6.5 6.5 0 0 1 12.6-1.4A4.7 4.7 0 1 1 18 18Z"/>',
    rain: '<path d="M6 15a4 4 0 0 1-1-7 6.5 6.5 0 0 1 12-1A4.5 4.5 0 0 1 18 15M7 18l-1 3m6-3-1 3m6-3-1 3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3"/>',
    closet: '<path d="M4 3h16v18H4zM12 3v18M9 10v3m6-3v3"/>',
    looks:
      '<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5M5 8a7.5 7.5 0 0 1 12-3l3 4M4 15l3 4a7.5 7.5 0 0 0 12-3"/>',
    spark:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    drop: '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
    hanger:
      '<path d="M10 7a2 2 0 1 1 3 1.7V11l8 5a2 2 0 0 1-1 4H4a2 2 0 0 1-1-4l10-5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
function image(item: Item, extra = "") {
  return `<img src="${e(asset(item.image))}" alt="${e(item.name)}" ${extra}>`;
}
function itemById(id: string) {
  return data.items.find((i) => i.id === id);
}
function sceneTabs(active: string, scope: string, all = false) {
  return `<div class="pills" role="group" aria-label="场景筛选">${(all ? ["all", ...Object.keys(sceneNames)] : Object.keys(sceneNames)).map((s) => `<button type="button" class="pill ${active === s ? "active" : ""}" data-${scope}="${s}" aria-pressed="${active === s}">${s === "all" ? "全部" : sceneNames[s as Scene]}</button>`).join("")}</div>`;
}
function board(items: Item[], mode = "normal", links = true) {
  return `<div class="outfit-board ${mode}" aria-label="单品搭配拼图"><span class="board-mark">EVERYDAY EDIT</span>${items.map((i) => (links ? `<a href="#/item/${encodeURIComponent(i.id)}" class="piece slot-${i.category}" title="${e(i.name)}">${image(i)}</a>` : `<span class="piece slot-${i.category}">${image(i, 'loading="lazy"')}</span>`)).join("")}<span class="board-caption">衣 序 / WARDROBE</span></div>`;
}
function cover(outfit: Outfit, mode = "normal", links = true) {
  return outfit.cover
    ? `<div class="look-cover"><img src="${e(asset(outfit.cover))}" alt="${e(outfit.name)}" loading="lazy"></div>`
    : board(
        outfit.itemIds.map(itemById).filter((i): i is Item => !!i),
        mode,
        links,
      );
}
function itemChips(ids: string[]) {
  return `<div class="item-chips">${ids
    .map(itemById)
    .filter((i): i is Item => !!i)
    .map(
      (i) =>
        `<a class="item-chip" href="#/item/${i.id}"><span class="color-dot" style="--swatch:${e(i.hex)}"></span>${e(i.name)}${icon("arrow", 13)}</a>`,
    )
    .join("")}</div>`;
}
function outfitCard(outfit: Outfit) {
  return `<a href="#/look/${outfit.id}" class="look-card">${cover(outfit, "compact", false)}<div class="card-meta"><span>${outfit.scenes.map((s) => sceneNames[s]).join(" · ")}</span><span>${outfit.minTemp}–${outfit.maxTemp}°C</span></div><h3>${e(outfit.name)} ${icon("arrow", 18)}</h3><p>${e(outfit.subtitle)}</p></a>`;
}
function heading(kicker: string, title: string, description: string) {
  return `<div class="page-heading"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>`;
}
function empty(title: string, message: string, action = "") {
  return `<div class="empty">${icon("hanger", 36)}<h3>${title}</h3><p>${message}</p>${action}</div>`;
}
function shell(content: string, active: string) {
  return `<header class="site-header"><a class="brand" href="#/ootd"><span class="brand-symbol">衣</span><span>衣序<small>EVERYDAY WARDROBE</small></span></a><button class="location-button" id="choose-city">${icon("pin", 17)}<span>${city ? e(city.name) : "选择城市"}</span>${icon("chevron", 15)}</button></header><main id="main">${content}</main><footer class="site-footer"><span>把日常，穿成喜欢的样子。</span><span>${data.example ? "示例衣橱 · 单品插画可替换为实物照片" : "MY PERSONAL WARDROBE"}</span></footer><nav class="bottom-nav" aria-label="主导航"><a href="#/closet" ${active === "closet" ? 'aria-current="page"' : ""}>${icon("closet")}<span>衣橱</span></a><a href="#/ootd" ${active === "ootd" ? 'aria-current="page"' : ""}>${icon("sun")}<span>OOTD</span></a><a href="#/looks" ${active === "looks" ? 'aria-current="page"' : ""}>${icon("looks")}<span>搭配展示</span></a></nav>`;
}
function weatherDays() {
  return datesFrom(cityDate(city?.timezone || "Asia/Shanghai")).map(
    (date) => forecast?.days.find((d) => d.date === date) || null,
  );
}
function dateLabel(date: string) {
  const d = new Date(date + "T12:00:00Z");
  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    week: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
      d.getUTCDay()
    ],
  };
}
function renderOotd() {
  const start = cityDate(city?.timezone || "Asia/Shanghai"),
    dates = datesFrom(start);
  if (!dates.includes(selectedDate)) selectedDate = start;
  const day = forecast?.days.find((d) => d.date === selectedDate),
    index = dates.indexOf(selectedDate),
    label = dateLabel(selectedDate);
  const usable = weatherDays().filter((d): d is WeatherDay => !!d),
    looks = planWeek(data, usable, scene),
    look = day ? looks[usable.indexOf(day)] : null;
  const generated = day
    ? generateCombination(data, day, scene, look?.itemIds)
    : null;
  const top = `${heading("A LITTLE LESS DECIDING", "今天，穿什么？", "让天气做提示，让衣橱给答案。")}<section class="weather-card" aria-label="天气"><div class="weather-main"><div><span class="weather-place">${icon("pin", 14)} ${city ? e(city.name) : "你的城市"} <span> / ${label.month}.${String(label.day).padStart(2, "0")}</span></span><div class="temperature">${day ? Math.round(day.max) : "—"}<span>°</span> ${day ? icon(weatherIcon(day.code), 42) : icon("cloud", 42)}</div><p>${day ? `${weatherLabel(day.code)} · ${Math.round(day.min)}° – ${Math.round(day.max)}°<span class="weather-detail">体感 ${Math.round(day.feelsMin)}° – ${Math.round(day.feelsMax)}°</span>` : weatherLoading ? "正在获取七日天气…" : "选择城市，打开你的七日穿搭"}</p></div><div class="weather-note"><span class="tiny-label">DRESS FOR THE DAY</span><p>${day ? (isRainy(day, data.rules) ? "带上雨具，<br>也带上好心情。" : day.feelsMax < 16 ? "适合叠穿的天气，<br>给温暖多留一层。" : "轻松出门，<br>今天也自在一点。") : "每一种天气，<br>都有合适的穿搭。"}</p>${day ? `<span class="weather-stat">${icon("drop", 14)} ${day.rainProbability}% ${icon("wind", 14)} ${Math.round(day.wind)} km/h</span>` : ""}</div></div><div class="weather-status"><span>${forecast ? `${weatherError ? "缓存天气 · " : ""}更新于 ${new Intl.DateTimeFormat("zh-CN", { timeZone: city?.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(forecast.fetchedAt))} · Open-Meteo` : "天气来源 Open-Meteo"}</span><button class="text-button" id="refresh-weather" ${weatherLoading || !city ? "disabled" : ""}>${icon("refresh", 13)} ${weatherLoading ? "获取中" : "刷新"}</button></div></section>${weatherError ? `<p class="notice" role="status">${e(weatherError)}${forecast ? "；当前显示缓存，可能已过期。" : "；衣橱和搭配仍可浏览。"}</p>` : ""}<div class="week-strip" aria-label="未来七天">${dates
    .map((date, i) => {
      const d = forecast?.days.find((d) => d.date === date),
        l = dateLabel(date);
      return `<button class="day-cell ${date === selectedDate ? "selected" : ""}" data-date="${date}" aria-pressed="${date === selectedDate}"><span>${i === 0 ? "今天" : l.week}</span><strong>${String(l.month).padStart(2, "0")}.${String(l.day).padStart(2, "0")}</strong>${icon(d ? weatherIcon(d.code) : "cloud", 21)}<small>${d ? `${Math.round(d.min)}° / ${Math.round(d.max)}°` : "待获取"}</small></button>`;
    })
    .join(
      "",
    )}</div><div class="section-bar"><div><span class="eyebrow">${index === 0 ? "TODAY’S EDIT" : "YOUR WEEK, CURATED"}</span><h2>${index === 0 ? "今日推荐" : `${label.month}月${label.day}日推荐`}</h2></div>${sceneTabs(scene, "scene")}</div>`;
  if (!day)
    return (
      top +
      empty(
        city ? "暂时没有这一天的天气" : "先告诉我，你在哪座城市",
        "获取真实天气后，为你选出适合的一套，再组合一点新灵感。",
        `<button class="primary-button" id="${city ? "retry-weather" : "empty-city"}">${city ? "重新获取天气" : "选择城市"} ${icon("arrow", 17)}</button>`,
      ) +
      `<a href="#/looks" class="browse-link">先看看已经搭好的衣服 ${icon("arrow", 17)}</a>`
    );
  const advice = look ? replacementAdvice(data, look, day, scene) : [];
  return (
    top +
    `<div class="ootd-layout"><section class="featured-look">${look ? `<div class="feature-image"><span class="floating-label">${icon("check", 13)} 已搭好的方案 · ${sceneNames[scene]}</span>${cover(look)}</div><div class="featured-copy"><span class="eyebrow">${e(look.subtitle)}</span><a class="title-link" href="#/look/${look.id}"><h2>${e(look.name)}</h2>${icon("arrow")}</a><p>${e(look.description)}</p><p class="match-reason">${icon("check", 15)} 适合${sceneNames[scene]} · 体感 ${Math.round(day.feelsMax)}° · ${isRainy(day, data.rules) ? "已考虑降雨" : "天气适配"}</p>${itemChips(look.itemIds)}${advice.length ? `<div class="advice"><span>${icon("spark", 15)} 还可以这样穿</span>${advice.map((a) => `<p>${e(a.reason)} <a href="#/item/${a.to.id}">查看单品 ↗</a></p>`).join("")}</div>` : ""}</div>` : empty("暂时没有合适的已存搭配", `衣橱中还没有适合当前天气的${sceneNames[scene]}方案。可以切换场景，或通过对话补充一套搭配。`)}</section><section class="fresh-look"><div class="fresh-title"><span class="eyebrow">A FRESH COMBINATION</span><h2>${icon("spark", 21)} 衣橱里的新可能</h2><p>用已有单品，换一种组合。</p></div>${generated ? `${board(generated, "fresh")}<div class="fresh-copy"><span class="badge">单品拼搭 · ${sceneNames[scene]}</span><p>根据${Math.round(day.feelsMax)}°体感${isRainy(day, data.rules) ? "及降雨条件" : ""}，从衣橱中组合。${generated.some((i) => i.category === "outer") ? "增加外套，照顾天气变化。" : "轻简搭配，让出门更轻松。"}</p>${itemChips(generated.map((i) => i.id))}<small>这是临时组合。喜欢的话，通过对话让 AI 保存为正式搭配。</small></div>` : empty("暂时凑不齐新的组合", "需要同场景、温度合适且兼容的上衣＋裤裙（或连衣裙）与鞋；低温、风雨时还需要合适的外套。")}</section></div>`
  );
}
function renderCloset() {
  const filtered = data.items.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (closetScene === "all" || i.scenes.includes(closetScene as Scene)) &&
      `${i.name} ${i.color} ${i.styles.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    heading(
      "THE THINGS YOU LOVE",
      "我的衣橱",
      "好好认识每一件，慢慢穿出更多可能。",
    ) +
    `<div class="closet-toolbar"><label class="search-field">${icon("search", 18)}<input id="closet-search" placeholder="找一件衣服、颜色或风格" value="${e(query)}" aria-label="搜索衣橱"></label>${sceneTabs(closetScene, "closetscene", true)}</div><div class="category-tabs" role="group" aria-label="品类筛选">${[["all", "全部单品"], ...Object.entries(categoryNames)].map(([id, name]) => `<button data-category="${id}" class="${category === id ? "active" : ""}" aria-pressed="${category === id}">${name}<small>${data.items.filter((i) => id === "all" || i.category === id).length}</small></button>`).join("")}</div><div class="collection-note"><span>${filtered.length} 件单品</span><span>${data.example ? "DEMO COLLECTION / 示例衣橱" : "YOUR PERSONAL COLLECTION"}</span></div><div class="closet-grid">${filtered.map((i) => `<a class="item-card" href="#/item/${i.id}"><div class="item-photo">${image(i, 'loading="lazy"')}<span class="photo-category">${categoryNames[i.category]}</span></div><div class="card-meta"><span>${e(i.styles[0])} · ${e(i.fit)}</span><span class="color-dot" style="--swatch:${e(i.hex)}" aria-label="${e(i.color)}"></span></div><h3>${e(i.name)}</h3><p>${i.scenes.map((s) => sceneNames[s]).join(" / ")}<span>${i.minTemp}–${i.maxTemp}°</span></p></a>`).join("")}</div>${!filtered.length ? empty("没有找到这件衣服", "试试其他名称、颜色或筛选条件。") : ""}`
  );
}
function renderLooks() {
  const outfits = data.outfits.filter(
    (o) => galleryScene === "all" || o.scenes.includes(galleryScene as Scene),
  );
  return (
    heading(
      "GOOD OUTFITS, ON REPEAT",
      "搭配灵感",
      "把喜欢的组合留下，下次出门就有答案。",
    ) +
    `<div class="gallery-toolbar">${sceneTabs(galleryScene, "galleryscene", true)}<span>${outfits.length} 套搭配</span></div><div class="looks-grid">${outfits.map(outfitCard).join("")}</div>${!outfits.length ? empty("这个场景还没有搭配", "通过对话让 AI 使用你的衣橱补充一套。") : ""}`
  );
}
function renderItem(id: string) {
  const i = itemById(id);
  if (!i)
    return empty(
      "没有找到这件单品",
      "单品可能已被调整，请返回衣橱查看。",
      '<a class="primary-button" href="#/closet">返回衣橱</a>',
    );
  const related = data.outfits.filter((o) => o.itemIds.includes(i.id));
  return `<a href="#/closet" class="back-link">${icon("back", 17)} 返回衣橱</a><div class="detail-grid"><div class="detail-photo">${image(i)}<span class="detail-photo-label">${data.example ? "示例单品 / ILLUSTRATED DEMO" : "WARDROBE ESSENTIAL"}</span></div><div class="detail-copy"><span class="eyebrow">${categoryNames[i.category]} / WARDROBE ESSENTIAL</span><h1>${e(i.name)}</h1><div class="detail-tags">${i.scenes.map((s) => `<span class="badge">${sceneNames[s]}</span>`).join("")}<span class="badge">${e(i.styles.join(" · "))}</span></div><dl class="attributes"><div><dt>颜色</dt><dd><span class="color-dot" style="--swatch:${e(i.hex)}"></span>${e(i.color)}</dd></div><div><dt>材质</dt><dd>${e(i.material || "待确认")}</dd></div><div><dt>版型</dt><dd>${e(i.fit)}</dd></div><div><dt>季节</dt><dd>${e(i.seasons.join(" / "))}</dd></div><div><dt>适用体感</dt><dd>${i.minTemp}–${i.maxTemp}°C</dd></div><div><dt>天气属性</dt><dd>${[i.rainSafe ? "防泼水" : null, i.windproof ? "防风" : null].filter(Boolean).join(" · ") || "晴天为主"}</dd></div></dl><div class="detail-note"><span class="eyebrow">A NOTE ABOUT THIS PIECE</span><p>${e(i.notes)}</p></div></div></div><div class="section-bar"><div><span class="eyebrow">BETTER TOGETHER</span><h2>它的搭配方式</h2></div><span class="muted">${related.length} 套</span></div><div class="looks-grid">${related.map(outfitCard).join("")}</div>${!related.length ? empty("还没有收录搭配", "通过对话让 AI 为这件单品补充一套。") : ""}`;
}
function renderLook(id: string) {
  const o = data.outfits.find((o) => o.id === id);
  if (!o)
    return empty(
      "没有找到这套搭配",
      "请返回搭配展示查看。",
      '<a class="primary-button" href="#/looks">返回搭配展示</a>',
    );
  return `<a href="#/looks" class="back-link">${icon("back", 17)} 返回搭配展示</a><div class="detail-grid look-detail"><div>${cover(o)}</div><div class="detail-copy"><span class="eyebrow">${e(o.subtitle)}</span><h1>${e(o.name)}</h1><div class="detail-tags">${o.scenes.map((s) => `<span class="badge">${sceneNames[s]}</span>`).join("")}<span class="badge">${o.minTemp}–${o.maxTemp}°C</span></div><p class="look-description">${e(o.description)}</p><p class="muted">${o.rainSafe ? "适合小雨天气，仍请携带雨具" : "晴天为主"}${o.windproof ? " · 含防风外套" : ""}</p><h3 class="list-title">这一套用到的单品</h3><div class="detail-item-list">${o.itemIds
    .map(itemById)
    .filter((i): i is Item => !!i)
    .map(
      (i) =>
        `<a href="#/item/${i.id}"><span class="mini-photo">${image(i)}</span><span><strong>${e(i.name)}</strong><small>${categoryNames[i.category]} · ${e(i.color)}</small></span>${icon("arrow", 18)}</a>`,
    )
    .join(
      "",
    )}</div>${o.swaps.length ? `<div class="advice"><span>${icon("spark", 15)} 换个细节，也很好看</span>${o.swaps.map((s) => `<p>${e(s.reason)} <a href="#/item/${s.to}">查看单品 ↗</a></p>`).join("")}</div>` : ""}</div></div>`;
}
function render() {
  if (!data) return;
  const route = location.hash.slice(1).split("/").filter(Boolean),
    page = route[0] || "ootd";
  const active =
    page === "item" || page === "closet"
      ? "closet"
      : page === "look" || page === "looks"
        ? "looks"
        : "ootd";
  const content =
    page === "closet"
      ? renderCloset()
      : page === "looks"
        ? renderLooks()
        : page === "item"
          ? renderItem(route[1])
          : page === "look"
            ? renderLook(route[1])
            : renderOotd();
  app.innerHTML = shell(content, active);
  bind();
}
function bind() {
  document.querySelector("#choose-city")?.addEventListener("click", openCity);
  document.querySelector("#empty-city")?.addEventListener("click", openCity);
  for (const id of ["refresh-weather", "retry-weather"])
    document
      .getElementById(id)
      ?.addEventListener("click", () => refreshWeather(true));
  document.querySelectorAll<HTMLButtonElement>("[data-date]").forEach((b) =>
    b.addEventListener("click", () => {
      selectedDate = b.dataset.date!;
      render();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach((b) =>
    b.addEventListener("click", () => {
      scene = b.dataset.scene as Scene;
      saveLocal("wardrobe.scene", scene);
      render();
    }),
  );
  for (const [attr, set] of [
    ["category", (v: string) => (category = v)],
    ["closetscene", (v: string) => (closetScene = v)],
    ["galleryscene", (v: string) => (galleryScene = v)],
  ] as const)
    document
      .querySelectorAll<HTMLButtonElement>(`[data-${attr}]`)
      .forEach((b) =>
        b.addEventListener("click", () => {
          set(b.getAttribute("data-" + attr)!);
          render();
        }),
      );
  document
    .querySelector<HTMLInputElement>("#closet-search")
    ?.addEventListener("input", (ev) => {
      const input = ev.target as HTMLInputElement,
        pos = input.selectionStart;
      query = input.value;
      render();
      const next = document.querySelector<HTMLInputElement>("#closet-search")!;
      next.focus();
      next.setSelectionRange(pos, pos);
    });
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) =>
    img.addEventListener(
      "error",
      () => {
        img.classList.add("image-failed");
        const hint = document.createElement("span");
        hint.className = "image-fallback";
        hint.textContent = img.alt + " · 图片待补充";
        img.replaceWith(hint);
      },
      { once: true },
    ),
  );
}
async function refreshWeather(force = false) {
  if (!city) return;
  const request = ++weatherRequest,
    requestedCity = city;
  forecast = cachedForecast(city);
  weatherLoading = true;
  weatherError = "";
  render();
  try {
    const result = await getForecast(requestedCity, force);
    if (request !== weatherRequest) return;
    forecast = result;
  } catch {
    if (request !== weatherRequest) return;
    weatherError = "天气获取失败，请检查网络或稍后重试";
  } finally {
    if (request === weatherRequest) {
      weatherLoading = false;
      render();
    }
  }
}
function openCity() {
  returnFocus = document.activeElement as HTMLElement;
  modal?.remove();
  modal = document.createElement("dialog");
  modal.className = "city-dialog";
  modal.setAttribute("aria-labelledby", "city-title");
  modal.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">YOUR CORNER OF THE WORLD</span><h2>你在哪座城市？</h2></div><button class="icon-button" id="close-dialog" aria-label="关闭">${icon("close")}</button></div><p>用当地的真实天气，安排接下来的一周。</p><form id="city-form"><label class="search-field">${icon("search", 18)}<input id="city-query" placeholder="输入城市，例如 上海 / Shanghai" required minlength="2" aria-label="城市名称" autocomplete="off"></label><button class="primary-button" type="submit">搜索</button></form><div id="city-results" role="status"><p class="muted">支持中文或英文城市名。</p><div class="quick-cities">${["上海", "北京", "广州", "深圳", "杭州", "成都"].map((n) => `<button class="pill" data-quick="${n}">${n}</button>`).join("")}</div></div>`;
  modal.querySelector("h2")!.id = "city-title";
  document.body.append(modal);
  modal.addEventListener("close", () => {
    searchRequest++;
    modal?.remove();
    modal = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.querySelector<HTMLButtonElement>("#choose-city")?.focus();
  });
  modal
    .querySelector("#close-dialog")!
    .addEventListener("click", () => modal?.close());
  modal.addEventListener("click", (ev) => {
    const dialog = modal;
    if (dialog && ev.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        ev.clientX < r.left ||
        ev.clientX > r.right ||
        ev.clientY < r.top ||
        ev.clientY > r.bottom
      )
        dialog.close();
    }
  });
  modal.querySelector("#city-form")!.addEventListener("submit", (ev) => {
    ev.preventDefault();
    void findCity();
  });
  modal.querySelectorAll<HTMLButtonElement>("[data-quick]").forEach((b) =>
    b.addEventListener("click", () => {
      modal!.querySelector<HTMLInputElement>("#city-query")!.value =
        b.dataset.quick!;
      void findCity();
    }),
  );
  modal.showModal();
}
async function findCity() {
  const request = ++searchRequest,
    target = modal!,
    name = target.querySelector<HTMLInputElement>("#city-query")!.value.trim(),
    results = target.querySelector<HTMLDivElement>("#city-results")!;
  if (name.length < 2) {
    results.textContent = "请输入至少两个字符。";
    return;
  }
  results.innerHTML = '<p class="muted">正在查找城市…</p>';
  try {
    const cities = await searchCities(name);
    if (request !== searchRequest || modal !== target) return;
    results.innerHTML = cities.length
      ? cities
          .map(
            (c, i) =>
              `<button class="city-result" data-city="${i}"><span>${icon("pin", 18)}<strong>${e(c.name)}</strong><small>${e([c.admin1, c.country].filter(Boolean).join(" · "))}</small></span>${icon("arrow", 18)}</button>`,
          )
          .join("")
      : '<p class="notice">没有找到，试试英文或拼音城市名，例如 Shanghai。</p>';
    results.querySelectorAll<HTMLButtonElement>("[data-city]").forEach((b) =>
      b.addEventListener("click", () => {
        city = cities[Number(b.dataset.city)];
        saveLocal("wardrobe.city", city);
        forecast = null;
        selectedDate = "";
        modal?.close();
        void refreshWeather();
      }),
    );
  } catch {
    if (request === searchRequest && modal === target)
      results.innerHTML =
        '<p class="notice">城市搜索暂时不可用，请检查网络后重新搜索。</p>';
  }
}
window.addEventListener("hashchange", () => {
  render();
  window.scrollTo({ top: 0 });
});
window.addEventListener("pageshow", () => {
  if (data) {
    render();
    if (city) void refreshWeather();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && data) {
    render();
    if (city) void refreshWeather();
  }
});
loadWardrobe()
  .then((value) => {
    data = value;
    render();
    if (city) void refreshWeather();
  })
  .catch((error) => {
    app.innerHTML = `<div class="boot"><h1>衣橱暂时打不开</h1><p>${e(error.message)}</p><button class="primary-button" id="reload">重新加载</button></div>`;
    document
      .querySelector("#reload")
      ?.addEventListener("click", () => location.reload());
  });
