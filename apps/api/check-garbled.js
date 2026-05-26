const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const hasGarbled = (s) => s && /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);

  const users = await p.user.findMany();
  console.log('=== Users ===');
  for (const u of users) {
    if (hasGarbled(u.name)) console.log('  GARBLED: #' + u.id + ' ' + u.username + ' name=' + u.name);
    else console.log('  OK: ' + u.username + ' - ' + u.name);
  }

  const parts = await p.inventoryItem.findMany();
  console.log('=== Parts ===');
  for (const i of parts) {
    if (hasGarbled(i.name)) console.log('  GARBLED: #' + i.id + ' ' + i.materialNo + ' name=' + i.name);
    else console.log('  OK: ' + i.materialNo + ' - ' + i.name);
  }

  const customers = await p.customer.findMany();
  console.log('=== Customers ===');
  for (const c of customers) {
    if (hasGarbled(c.name)) console.log('  GARBLED: #' + c.id + ' name=' + c.name);
    else console.log('  OK: ' + c.name);
  }

  console.log('Done');
  await p.$disconnect();
})();
