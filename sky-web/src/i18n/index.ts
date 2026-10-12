/**
 * 轻量 i18n（零依赖）
 *
 * 设计：**用中文原文当 key**。
 *  - `tr('菜品管理')` → 中文模式下原样返回"菜品管理"（所以中文版行为和以前完全一致）
 *  - 英文模式（VITE_LANG=en）下查 `en.ts` 字典返回英文
 *  - 字典里没有的 key → 兜底返回中文，不会出现空白/undefined
 *
 * 为什么用中文原文当 key：
 *  1. 包装时代码不用起名，`tr('删除')` 一眼能看懂
 *  2. 同一句话在多处出现只翻译一次（自动去重）
 *  3. 漏翻时降级为中文而不是报错
 *
 * 插值：`tr('共 {n} 条', { n: total })`，模板里的 `{n}` 会被替换。
 * 后端返回的数据（菜名、分类名、地址…）不经过这里，因此保持原样不翻译。
 */
import { en } from './en'

/** 构建时注入：VITE_LANG=en 就是英文版 */
export const LANG: string = (import.meta.env?.VITE_LANG as string) || 'zh'
export const isEn = LANG === 'en'

type Params = Record<string, string | number>

const DICT = en as Record<string, string>

/**
 * 翻译。中文模式下直接把原文返回，因此两种模式可以共用同一套代码。
 * @param zh 中文原文（也是字典的 key）
 * @param params 插值参数，替换 `{name}` 形式的占位符
 */
export function tr(zh: string, params?: Params): string {
  let out = isEn ? DICT[zh] ?? zh : zh
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.split('{' + k + '}').join(String(v))
    }
  }
  return out
}

/** 给数组/对象批量翻译用（例如 options 列表） */
export function trList(list: string[]): string[] {
  return list.map((s) => tr(s))
}
