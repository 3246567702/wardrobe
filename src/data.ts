import type { PersonalProfile, Wardrobe } from "./types";
import { validateProfile } from "./profile-validation";
import { validateWardrobe } from "./validate";
export async function loadWardrobe(): Promise<Wardrobe> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/wardrobe.json`);
  if (!response.ok) throw new Error("衣橱数据暂时无法读取，请刷新重试。");
  const data = (await response.json()) as Wardrobe;
  if (
    data.version !== 1 ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.outfits)
  )
    throw new Error("衣橱数据格式不正确。");
  if (validateWardrobe(data).length)
    throw new Error("衣橱数据存在错误，请运行 npm run validate 检查。");
  return data;
}
export async function loadProfile(): Promise<PersonalProfile> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/profile.json`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("个人资料读取失败，请稍后重试。");
  const data: unknown = await response.json();
  if (validateProfile(data).length)
    throw new Error("个人资料格式有误，请检查资料文件。");
  return data as PersonalProfile;
}
