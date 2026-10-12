-- ============================================================
-- 苍穹外卖 - 用户账号体系迁移脚本
-- 用途：支持 C 端网页用户【注册 / 用户名密码登录 / 修改密码】
-- 说明：原 user 表仅存微信 openid 用户，此处新增用户名、密码列
-- 执行方式：在 sky_take_out 库中执行本脚本（可重复执行需自行判断）
-- ============================================================

ALTER TABLE `user`
    ADD COLUMN `username` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8_bin DEFAULT NULL COMMENT '用户名' AFTER `openid`;

ALTER TABLE `user`
    ADD COLUMN `password` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8_bin DEFAULT NULL COMMENT '密码(MD5加密)' AFTER `username`;

ALTER TABLE `user`
    ADD UNIQUE INDEX `uk_username` (`username`);
