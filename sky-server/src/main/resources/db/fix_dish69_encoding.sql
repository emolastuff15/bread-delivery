-- 修复 dish.id=69 被双重编码的 name/description
-- 背景：早期用 PowerShell Invoke-RestMethod 读接口（PS 5.1 把 UTF-8 响应按 Latin-1 解码）
--       再通过 PUT /admin/dish 回写，导致该行中文被双重编码。3306 与 3307 两边同样受影响。
UPDATE dish
SET name = '平菇豆腐汤',
    description = '配料：豆腐，平菇'
WHERE id = 69;
