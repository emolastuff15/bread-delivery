/**
 * 合并 src/i18n/parts/*.json 生成 src/i18n/en.ts（去重、按 key 排序、机器生成，不要手改）。
 */
import fs from 'node:fs'
import path from 'node:path'

const PARTS = path.resolve(process.cwd(), 'src/i18n/parts')
const OUT = path.resolve(process.cwd(), 'src/i18n/en.ts')

const merged = {}
const files = fs.readdirSync(PARTS).filter((f) => f.endsWith('.json')).sort()
for (const f of files) {
  const obj = JSON.parse(fs.readFileSync(path.join(PARTS, f), 'utf8'))
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string' || !v.trim()) continue
    merged[k] = v
  }
}

const keys = Object.keys(merged).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(merged[k])},`).join('\n')

const header = `/**
 * 英文词典（**机器生成，不要手改**）
 *
 * 生成方式：node scripts/i18n-build-dict.mjs
 * 数据来源：src/i18n/parts/*.json（manual.json = 人工词条，auto-*.json = 补翻词条）
 * 共 ${keys.length} 条。
 *
 * key = 中文原文；模板串用 \`{表达式}\` 占位，例如 tr('共 {t} 条', { t })。
 */
export const en: Record<string, string> = {
${body}
}
`

fs.writeFileSync(OUT, header, 'utf8')
console.log(`合并 ${files.length} 个分片 -> ${path.relative(process.cwd(), OUT)}，共 ${keys.length} 条`)
