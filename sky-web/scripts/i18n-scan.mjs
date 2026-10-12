/**
 * i18n 扫描脚本（v2）：用 TypeScript 编译器 API 走 AST，精确找出"会显示给用户的中文串"。
 *
 *   node scripts/i18n-scan.mjs             统计 + 写出 .i18n-strings.json
 *   node scripts/i18n-scan.mjs --missing   只列出"还没进 i18n 字典"的串（审计漏翻）
 *   node scripts/i18n-scan.mjs --json      打印 JSON（供程序消费）
 *
 * 相比正则版的好处：注释天然被排除，不会把 JSX 文本里的引号误当字符串；
 * 模板字符串会还原成带占位符的键，例如 `共 ${t} 条` -> "共 {t} 条"。
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const ROOT = path.resolve(process.cwd(), 'src')
const DICT_FILE = path.join(ROOT, 'i18n', 'en.ts')
const OUT = path.resolve(process.cwd(), '.i18n-strings.json')
const CJK = /[\u4e00-\u9fa5]/

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p)
  }
  return acc
}

const found = new Map()
const byFile = new Map()
const templates = new Set()
const unwrapped = []

for (const file of walk(ROOT).filter((f) => f !== DICT_FILE)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const code = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

  const add = (raw, isTemplate = false) => {
    const v = raw.replace(/\s+/g, ' ').trim()
    if (!v || !CJK.test(v) || v.length > 200) return
    if (isTemplate) templates.add(v)
    found.set(v, (found.get(v) ?? 0) + 1)
    byFile.set(rel, (byFile.get(rel) ?? 0) + 1)
  }

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      add(node.text, ts.isNoSubstitutionTemplateLiteral(node))
      if (node.text.trim() && CJK.test(node.text)) {
        const stmt = node.parent
        const wrapped = ts.isCallExpression(stmt) && stmt.expression.getText(sf) === 'tr'
        if (!wrapped) unwrapped.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: node.text.trim().slice(0, 60) })
      }
    } else if (ts.isJsxText(node)) {
      add(node.text)
      if (node.text.trim() && CJK.test(node.text)) {
        // JSX 文本只要被 {} 包住就算包装（形如 {tr('...')}）
        const p = node.parent
        const isExpr = p && ts.isJsxExpression(p)
        if (!isExpr) unwrapped.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: node.text.trim().slice(0, 60) })
      }
    } else if (ts.isTemplateExpression(node)) {
      // `前缀 ${expr} 中间 ${expr2} 后缀` -> "前缀 {expr} 中间 {expr2} 后缀"
      // 注意：中文只可能出现在"字面量部分"；${} 里的中文属于内部表达式，会被单独审计，
      // 所以字面量部分没有中文时整条模板不需要翻译（例如内联 SVG 里已经用了 ${tr('...')}）。
      let key = node.head.text
      let literalText = node.head.text
      for (const span of node.templateSpans) {
        key += '{' + span.expression.getText(sf) + '}' + span.literal.text
        literalText += span.literal.text
      }
      if (CJK.test(literalText)) {
        add(key, true)
        const wrapped = ts.isCallExpression(node.parent) && node.parent.expression.getText(sf) === 'tr'
        if (!wrapped) unwrapped.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: key.trim().slice(0, 60) })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

const dictSrc = fs.existsSync(DICT_FILE) ? fs.readFileSync(DICT_FILE, 'utf8') : ''
const all = [...found.keys()]
const missing = all.filter((k) => !dictSrc.includes(JSON.stringify(k)))

fs.writeFileSync(
  OUT,
  JSON.stringify({ total: found.size, templates: [...templates], unwrapped, byFile: Object.fromEntries([...byFile].sort((a, b) => b[1] - a[1])), strings: Object.fromEntries([...found].sort()) }, null, 2),
  'utf8',
)

if (process.argv.includes('--unwrapped')) {
  console.log(`代码里还没用 tr() 包装的中文串：${unwrapped.length} 处（去重串 ${new Set(unwrapped.map((u) => u.text)).size} 条）`)
  for (const u of unwrapped) console.log(`  ${u.file}:${u.line}  ${u.text}`)
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total: found.size, missing }, null, 2))
} else if (process.argv.includes('--missing')) {
  console.log(`未被字典覆盖：${missing.length} / ${found.size}`)
  for (const m of missing) console.log('  ' + m + '   ×' + found.get(m))
} else {
  console.log(`文件数 ${walk(ROOT).length}，去重中文串 ${found.size}（其中模板串 ${templates.size}），未覆盖 ${missing.length}`)
  console.log(`明细：${path.relative(process.cwd(), OUT)}`)
  console.log('--- 每个文件 ---')
  for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4) + '  ' + f)
}
