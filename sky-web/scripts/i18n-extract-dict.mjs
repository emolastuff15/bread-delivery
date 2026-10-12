/**
 * 从 src/i18n/en.ts 里"抽出"现有词条到 src/i18n/parts/manual.json（容忍重复键，后者覆盖前者）。
 * 用途：把手写词条变成可合并的 JSON，之后统一由 i18n-build-dict.mjs 生成 en.ts。
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const SRC = path.resolve(process.cwd(), 'src/i18n/en.ts')
const OUT = path.resolve(process.cwd(), 'src/i18n/parts/manual.json')

const sf = ts.createSourceFile(SRC, fs.readFileSync(SRC, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const out = {}
const dupes = []

function visit(node) {
  if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name))) {
    const key = ts.isStringLiteral(node.name) ? node.name.text : node.name.text
    const init = node.initializer
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
      if (key in out) dupes.push(key)
      out[key] = init.text
    }
  }
  ts.forEachChild(node, visit)
}
visit(sf)

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8')
console.log(`抽出词条 ${Object.keys(out).length} 条 -> ${path.relative(process.cwd(), OUT)}`)
if (dupes.length) console.log(`（原文件里有 ${dupes.length} 个重复键，已保留最后一个：${[...new Set(dupes)].slice(0, 12).join(' / ')}${dupes.length > 12 ? ' …' : ''}）`)
