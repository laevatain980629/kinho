-- 修复库存损坏逻辑：将存量 damaged 数量从 onHand 中扣除
-- 执行前请先备份数据库！

-- 扣除 onHand 中被错误计入的 damaged 数量
UPDATE "InventoryBalance"
SET "quantityOnHand" = "quantityOnHand" - "quantityDamaged",
    "quantityAvailable" = "quantityAvailable" - "quantityDamaged",
    "version" = "version" + 1
WHERE "quantityDamaged" > 0;

-- 验证：所有 onHand >= 0
-- SELECT * FROM "InventoryBalance" WHERE "quantityOnHand" < 0;
