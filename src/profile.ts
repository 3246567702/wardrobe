import type { PersonalProfile, ProfileDocument } from "./types";
import { asset, icon } from "./ui";
import { escapeHtml as e, renderMarkdown } from "./markdown";

function status(message: string, failed = false) {
  return `<div class="empty">${icon("profile", 36)}<h3>${failed ? "资料暂时打不开" : "正在打开个人档案"}</h3><p>${e(message)}</p>${failed ? '<button class="primary-button" id="retry-profile">重新加载</button>' : ""}</div>`;
}
function field(label: string, value: string | number | null, unit = "") {
  return `<div><dt>${label}</dt><dd class="${value === null ? "unfilled" : ""}">${value === null ? "待补充" : `${e(value)}${unit}`}</dd></div>`;
}
function chips(values: string[]) {
  return values.length
    ? values.map((v) => `<span class="badge">${e(v)}</span>`).join("")
    : '<span class="unfilled">待补充</span>';
}
function photoPlaceholder(title: string, description: string) {
  return `<div class="photo-placeholder">${icon(title.includes("正脸") ? "profile" : "body", 38)}<span>待添加照片</span></div><div class="photo-card-copy"><h3>${e(title)}</h3><p>${e(description)}</p></div>`;
}
function heading() {
  return '<div class="page-heading"><span class="eyebrow">THE STARTING POINT OF YOUR STYLE</span><h1>基础信息</h1><p>了解自己，是找到合适穿搭的第一步。</p></div>';
}
export function renderProfile(profile: PersonalProfile | null, error: string) {
  if (!profile)
    return (
      heading() +
      status(error || "个人信息、参考照片和文档都放在这里。", !!error)
    );
  return `${heading()}<section class="profile-intro"><span class="profile-monogram">${icon("profile", 28)}</span><div><span class="eyebrow">MY PERSONAL FILE</span><h2>${e(profile.displayName || "我的穿搭档案")}</h2><p>${profile.updatedAt ? `最近更新 ${e(profile.updatedAt)}` : "从基础资料开始，慢慢记录自己的风格。"}</p></div><span class="profile-status">${profile.updatedAt ? "已建档" : "待完善"}</span></section><div class="profile-layout"><section class="profile-panel"><div class="panel-heading"><span class="eyebrow">ABOUT YOU</span><h2>个人基础信息</h2></div><dl class="profile-fields">${field("称呼", profile.displayName)}${field("身高", profile.heightCm, " cm")}${field("体重", profile.weightKg, " kg")}${field("上衣尺码", profile.sizes.top)}${field("下装尺码", profile.sizes.bottom)}${field("鞋码", profile.sizes.shoes)}</dl><details class="measurements"><summary>身体围度 <span>可选补充 ${icon("chevron", 15)}</span></summary><dl class="profile-fields">${field("肩宽", profile.measurements.shouldersCm, " cm")}${field("胸围", profile.measurements.chestCm, " cm")}${field("腰围", profile.measurements.waistCm, " cm")}${field("臀围", profile.measurements.hipsCm, " cm")}</dl></details><div class="profile-note"><h3>体型与穿着感受</h3><p class="${profile.bodyNotes ? "" : "unfilled"}">${e(profile.bodyNotes || "待补充，例如肩部偏宽、偏爱宽松版型。")}</p></div></section><section class="profile-panel"><div class="panel-heading"><span class="eyebrow">WHAT FEELS LIKE YOU</span><h2>风格与偏好</h2></div><div class="preference-group"><h3>风格关键词</h3><div>${chips(profile.preferences.styleWords)}</div></div><div class="preference-group"><h3>喜欢的颜色</h3><div>${chips(profile.preferences.favoriteColors)}</div></div><div class="preference-group"><h3>不想尝试的颜色</h3><div>${chips(profile.preferences.avoidColors)}</div></div><div class="profile-note"><h3>其他偏好</h3><p class="${profile.preferences.notes ? "" : "unfilled"}">${e(profile.preferences.notes || "待补充，可以记录喜欢的面料、版型和穿着习惯。")}</p></div></section></div><div class="section-bar"><div><span class="eyebrow">YOUR REFERENCE, YOURSELF</span><h2>参考照片</h2></div><span class="muted">${profile.photos.filter((p) => p.image).length} / ${profile.photos.length} 已添加</span></div><div class="profile-photos">${profile.photos.map((photo) => (photo.image ? `<a href="#/photo/${photo.id}" class="profile-photo-card"><div class="profile-photo-image"><img src="${e(asset(photo.image))}" alt="${e(photo.title)}" loading="lazy"></div><div class="photo-card-copy"><h3>${e(photo.title)} ${icon("arrow", 15)}</h3><p>${e(photo.description)}</p></div></a>` : `<div class="profile-photo-card">${photoPlaceholder(photo.title, photo.description)}</div>`)).join("")}</div><div class="section-bar"><div><span class="eyebrow">NOTES TO COME BACK TO</span><h2>资料与文档</h2></div><span class="muted">${profile.documents.length} 份文档</span></div><div class="profile-documents">${profile.documents.map((doc) => `<a class="document-card" href="${doc.format === "pdf" ? e(asset(doc.path)) : `#/document/${doc.id}`}" ${doc.format === "pdf" ? 'target="_blank" rel="noopener"' : ""}><span class="document-icon">${icon("document", 24)}</span><div><span class="document-format">${doc.format === "pdf" ? "PDF" : "文档"}${doc.updatedAt ? ` · ${e(doc.updatedAt)}` : ""}</span><h3>${e(doc.title)}</h3><p>${e(doc.description)}</p></div>${icon("arrow", 19)}</a>`).join("")}</div><p class="profile-maintenance">${icon("spark", 15)} 想补充资料、照片或文档时，通过对话告诉 AI 即可。</p>`;
}
export function renderProfileDocument(
  profile: PersonalProfile | null,
  error: string,
  id: string,
  entry?: { text?: string; error?: string },
) {
  if (!profile)
    return heading() + status(error || "正在读取文档信息。", !!error);
  const doc = profile.documents.find((d) => d.id === id);
  if (!doc)
    return (
      '<a class="back-link" href="#/info">← 返回基础信息</a>' +
      status("这份文档不存在，请返回基础信息查看。")
    );
  if (doc.format === "pdf")
    return `<a class="back-link" href="#/info">${icon("back", 17)} 返回基础信息</a><div class="page-heading"><h1>${e(doc.title)}</h1><p>${e(doc.description)}</p></div><a class="primary-button" href="${e(asset(doc.path))}" target="_blank" rel="noopener">打开 PDF ${icon("arrow", 17)}</a>`;
  return `<a class="back-link" href="#/info">${icon("back", 17)} 返回基础信息</a><div class="document-heading"><span class="eyebrow">PERSONAL LIBRARY</span><h1>${e(doc.title)}</h1><p>${e(doc.description)}</p><a class="document-download" href="${e(asset(doc.path))}" download>${icon("document", 15)} 下载原文</a></div><article class="document-body">${entry?.text !== undefined ? renderMarkdown(entry.text) : entry?.error ? `<div class="empty"><h3>文档暂时打不开</h3><p>${e(entry.error)}</p><button class="primary-button" id="retry-document">重新加载</button></div>` : '<p class="muted" role="status">正在加载文档…</p>'}</article>`;
}
export function renderProfilePhoto(
  profile: PersonalProfile | null,
  error: string,
  id: string,
) {
  if (!profile)
    return heading() + status(error || "正在读取照片信息。", !!error);
  const photo = profile.photos.find((p) => p.id === id);
  return `<a class="back-link" href="#/info">${icon("back", 17)} 返回基础信息</a><div class="page-heading"><span class="eyebrow">PERSONAL REFERENCE</span><h1>${e(photo?.title || "参考照片")}</h1><p>${e(photo?.description || "这张照片不存在，请返回基础信息查看。")}</p></div>${photo?.image ? `<div class="profile-photo-view"><img src="${e(asset(photo.image))}" alt="${e(photo.title)}"></div>` : '<div class="empty"><h3>照片待添加</h3><p>通过对话提供照片后，会在这里展示。</p></div>'}`;
}
export async function loadDocument(doc: ProfileDocument) {
  const response = await fetch(asset(doc.path), {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("文档读取失败，请稍后重试。");
  return response.text();
}
