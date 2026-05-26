import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);

  // ─── 1. 九个内置角色 ─────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({ where: { key: 'admin' }, update: {}, create: { key: 'admin', name: '系统管理员', description: '全系统配置、权限、兜底处理、审计', isLocked: true } }),
    prisma.role.upsert({ where: { key: 'hq_service' }, update: {}, create: { key: 'hq_service', name: '总部客服', description: '接受报修、创建/受理工单、派单到网点' } }),
    prisma.role.upsert({ where: { key: 'outlet_manager' }, update: {}, create: { key: 'outlet_manager', name: '网点经理', description: '本网点工单管理、指派工程师、协调资源' } }),
    prisma.role.upsert({ where: { key: 'engineer' }, update: {}, create: { key: 'engineer', name: '维修工程师', description: '现场签到、故障确认、维修、回执签名、申请领料/报价' } }),
    prisma.role.upsert({ where: { key: 'supervisor' }, update: {}, create: { key: 'supervisor', name: '审批主管', description: '升级、回退、报价等审批' } }),
    prisma.role.upsert({ where: { key: 'chief_engineer' }, update: {}, create: { key: 'chief_engineer', name: '总工程师', description: '复杂故障处理、重派、技术结论、强制闭环' } }),
    prisma.role.upsert({ where: { key: 'warehouse' }, update: {}, create: { key: 'warehouse', name: '仓库管理员', description: '备件库存、领料审批、发货、收货确认' } }),
    prisma.role.upsert({ where: { key: 'procurement' }, update: {}, create: { key: 'procurement', name: '采购专员', description: '采购询价、采购报价、采购订单、供应商报价维护' } }),
    prisma.role.upsert({ where: { key: 'follow_up_specialist' }, update: {}, create: { key: 'follow_up_specialist', name: '回访专员', description: '完工回访、满意度、工单归档' } }),
  ]);

  const roleMap = Object.fromEntries(roles.map(r => [r.key, r.id]));

  // ─── 2. 权限点 ───────────────────────────────────────────
  const permissionDefs = [
    // 菜单可见性
    { key: 'menu:dashboard', name: '菜单：工作台', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:work_order', name: '菜单：工单中心', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:asset', name: '菜单：资产管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:quote', name: '菜单：报价管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:procurement', name: '菜单：采购管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:warehouse', name: '菜单：仓库管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:inventory', name: '菜单：库存情况', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:parts_request', name: '菜单：领料管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:parts_return', name: '菜单：退库管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:approval', name: '菜单：审批中心', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:report', name: '菜单：报表中心', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:system', name: '菜单：系统管理', type: 'FUNCTION', module: 'menu' },
    { key: 'menu:audit', name: '菜单：审计日志', type: 'FUNCTION', module: 'menu' },
    // 工单
    { key: 'work_order:view', name: '查看工单', type: 'FUNCTION', module: 'work_order' },
    { key: 'work_order:create', name: '创建工单', type: 'FUNCTION', module: 'work_order' },
    { key: 'work_order:accept', name: '受理工单', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:assign_outlet', name: '派单到网点', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:assign_engineer', name: '指派工程师', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:sign_in', name: '现场签到', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:confirm_fault', name: '确认故障', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:start_repair', name: '开始维修', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:submit_receipt', name: '提交维修回执', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:customer_sign', name: '客户签字确认', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:close', name: '关闭工单', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:cancel', name: '取消工单', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:escalate', name: '发起升级', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:approve_escalate', name: '审批升级', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:return_apply', name: '发起回退', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:approve_return', name: '审批回退', type: 'PROCESS', module: 'work_order' },
    { key: 'work_order:chief_handle', name: '总工处理', type: 'PROCESS', module: 'work_order' },
    // 报价
    { key: 'quote:view', name: '查看报价', type: 'FUNCTION', module: 'quote' },
    { key: 'quote:create', name: '创建维修报价', type: 'PROCESS', module: 'quote' },
    { key: 'quote:submit', name: '提交报价审批', type: 'PROCESS', module: 'quote' },
    { key: 'quote:approve', name: '审批报价', type: 'PROCESS', module: 'quote' },
    { key: 'quote:reject', name: '驳回报价', type: 'PROCESS', module: 'quote' },
    { key: 'quote:confirm_customer', name: '记录客户确认', type: 'PROCESS', module: 'quote' },
    { key: 'quote:cancel', name: '作废报价', type: 'PROCESS', module: 'quote' },
    { key: 'quote:edit', name: '编辑报价', type: 'FUNCTION', module: 'quote' },
    // 采购
    { key: 'procurement:view', name: '查看采购', type: 'FUNCTION', module: 'procurement' },
    { key: 'procurement:create', name: '创建采购需求', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:quote', name: '维护供应商报价', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:approve', name: '审批采购', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:order', name: '创建采购订单', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:receive', name: '采购到货确认', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:cancel', name: '作废采购', type: 'PROCESS', module: 'procurement' },
    { key: 'procurement:edit', name: '编辑采购', type: 'FUNCTION', module: 'procurement' },
    // 领料与仓库
    { key: 'parts:view', name: '查看领料申请', type: 'FUNCTION', module: 'parts' },
    { key: 'parts:apply', name: '发起领料申请', type: 'PROCESS', module: 'parts' },
    { key: 'parts:approve', name: '审批领料', type: 'PROCESS', module: 'parts' },
    { key: 'parts:ship', name: '发货', type: 'PROCESS', module: 'parts' },
    { key: 'parts:receive', name: '收货确认', type: 'PROCESS', module: 'parts' },
    { key: 'parts:return_apply', name: '发起退库', type: 'PROCESS', module: 'parts' },
    { key: 'parts:return_confirm', name: '确认退库', type: 'PROCESS', module: 'parts' },
    { key: 'parts:edit', name: '编辑配件', type: 'FUNCTION', module: 'parts' },
    { key: 'warehouse:view', name: '查看仓库库存', type: 'FUNCTION', module: 'warehouse' },
    { key: 'warehouse:edit', name: '编辑仓库', type: 'FUNCTION', module: 'warehouse' },
    { key: 'warehouse:stock_manage', name: '库存管理', type: 'FUNCTION', module: 'warehouse' },
    { key: 'warehouse:k3_sync', name: '同步金蝶K3库存', type: 'PROCESS', module: 'warehouse' },
    { key: 'warehouse:transfer', name: '仓库调拨', type: 'PROCESS', module: 'warehouse' },
    { key: 'warehouse:adjust', name: '库存调整', type: 'PROCESS', module: 'warehouse' },
    { key: 'warehouse:inventory_count', name: '库存盘点', type: 'PROCESS', module: 'warehouse' },
    { key: 'warehouse:reservation_manage', name: '库存预占管理', type: 'PROCESS', module: 'warehouse' },
    // 资产与系统
    { key: 'customer:view', name: '查看客户', type: 'FUNCTION', module: 'asset' },
    { key: 'customer:edit', name: '编辑客户', type: 'FUNCTION', module: 'asset' },
    { key: 'customer:transfer', name: '客户归属转移', type: 'FUNCTION', module: 'asset' },
    { key: 'machine:view', name: '查看机台', type: 'FUNCTION', module: 'asset' },
    { key: 'machine:edit', name: '编辑机台', type: 'FUNCTION', module: 'asset' },
    { key: 'machine:qrcode', name: '生成二维码', type: 'FUNCTION', module: 'asset' },
    { key: 'outlet:view', name: '查看网点', type: 'FUNCTION', module: 'asset' },
    { key: 'outlet:edit', name: '编辑网点', type: 'FUNCTION', module: 'asset' },
    { key: 'outlet:bind_user', name: '绑定网点人员', type: 'FUNCTION', module: 'asset' },
    { key: 'fault_type:view', name: '查看故障分类', type: 'FUNCTION', module: 'asset' },
    { key: 'fault_type:edit', name: '编辑故障分类', type: 'FUNCTION', module: 'asset' },
    { key: 'report:view', name: '查看报表', type: 'FUNCTION', module: 'report' },
    { key: 'report:export', name: '导出报表', type: 'FUNCTION', module: 'report' },
    { key: 'follow_up:view', name: '查看回访', type: 'FUNCTION', module: 'follow_up' },
    { key: 'follow_up:handle', name: '处理回访', type: 'PROCESS', module: 'follow_up' },
    { key: 'notification:view', name: '查看通知', type: 'FUNCTION', module: 'notification' },
    { key: 'system:user_manage', name: '用户管理', type: 'FUNCTION', module: 'system' },
    { key: 'system:role_manage', name: '角色权限管理', type: 'FUNCTION', module: 'system' },
    { key: 'system:audit_log', name: '查看审计日志', type: 'FUNCTION', module: 'system' },
    // 数据权限
    { key: 'data:all', name: '全量数据', type: 'DATA', module: 'data' },
    { key: 'data:hq_all', name: '总部视角数据', type: 'DATA', module: 'data' },
    { key: 'data:outlet_self', name: '本网点数据', type: 'DATA', module: 'data' },
    { key: 'data:work_order_self', name: '本人相关工单', type: 'DATA', module: 'data' },
    // 仓库数据权限
    { key: 'warehouse_scope:all', name: '所有仓库', type: 'DATA', module: 'warehouse' },
    { key: 'warehouse_scope:hq', name: '总仓和全局汇总', type: 'DATA', module: 'warehouse' },
    { key: 'warehouse_scope:outlet_self', name: '本网点仓', type: 'DATA', module: 'warehouse' },
    { key: 'warehouse_scope:outlet_engineers', name: '本网点工程师个人仓', type: 'DATA', module: 'warehouse' },
    { key: 'warehouse_scope:engineer_self', name: '本人个人仓', type: 'DATA', module: 'warehouse' },
  ];

  const permRecords = await Promise.all(
    permissionDefs.map(p =>
      prisma.permission.upsert({ where: { key: p.key }, update: { name: p.name, type: p.type, module: p.module }, create: p })
    )
  );
  const permMap = Object.fromEntries(permRecords.map(p => [p.key, p.id]));

  // ─── 3. 角色-权限映射 ────────────────────────────────────
  const allPermKeys = permissionDefs.map(p => p.key);

  const rolePermissionMap: Record<string, string[]> = {
    admin: allPermKeys,
    hq_service: [
      'menu:dashboard', 'menu:work_order', 'menu:asset', 'menu:inventory', 'menu:report',
      'work_order:view', 'work_order:create', 'work_order:accept', 'work_order:assign_outlet',
      'quote:view', 'quote:create',
      'warehouse:view',
      'customer:view', 'machine:view', 'outlet:view',
      'follow_up:view', 'follow_up:handle',
      'report:view',
      'data:hq_all',
      'warehouse_scope:hq',
    ],
    outlet_manager: [
      'menu:dashboard', 'menu:work_order', 'menu:asset', 'menu:quote', 'menu:inventory', 'menu:parts_request', 'menu:parts_return', 'menu:report',
      'work_order:view', 'work_order:assign_engineer', 'work_order:assign_outlet',
      'quote:view', 'quote:approve',
      'parts:view', 'parts:approve',
      'customer:view', 'machine:view', 'outlet:view',
      'report:view',
      'system:user_manage',
      'data:outlet_self',
    ],
    engineer: [
      'menu:dashboard', 'menu:work_order', 'menu:inventory', 'menu:parts_request', 'menu:parts_return',
      'work_order:view', 'work_order:sign_in', 'work_order:confirm_fault',
      'work_order:start_repair', 'work_order:submit_receipt', 'work_order:customer_sign',
      'work_order:escalate',
      'quote:view', 'quote:create', 'quote:submit',
      'parts:view', 'parts:apply', 'parts:return_apply', 'parts:receive',
      'warehouse:view',
      'data:work_order_self',
      'warehouse_scope:engineer_self',
    ],
    supervisor: [
      'menu:dashboard', 'menu:work_order', 'menu:quote', 'menu:procurement', 'menu:approval', 'menu:report',
      'work_order:view', 'work_order:approve_escalate', 'work_order:approve_return',
      'quote:view', 'quote:approve', 'quote:reject',
      'procurement:view', 'procurement:approve',
      'report:view',
      'data:hq_all',
    ],
    chief_engineer: [
      'menu:dashboard', 'menu:work_order', 'menu:quote', 'menu:approval', 'menu:report',
      'work_order:view', 'work_order:chief_handle', 'work_order:assign_engineer',
      'quote:view', 'quote:approve',
      'parts:view',
      'report:view',
      'data:all',
    ],
    warehouse: [
      'menu:dashboard', 'menu:warehouse', 'menu:inventory', 'menu:parts_request', 'menu:parts_return',
      'parts:view', 'parts:approve', 'parts:ship', 'parts:receive',
      'parts:return_apply', 'parts:return_confirm',
      'warehouse:view', 'warehouse:stock_manage', 'warehouse:k3_sync', 'warehouse:transfer', 'warehouse:adjust',
      'warehouse:inventory_count', 'warehouse:reservation_manage',
      'warehouse_scope:all',
    ],
    procurement: [
      'menu:dashboard', 'menu:procurement', 'menu:inventory',
      'procurement:view', 'procurement:create', 'procurement:quote',
      'procurement:approve', 'procurement:order', 'procurement:receive', 'procurement:cancel',
      'warehouse:view',
      'warehouse_scope:hq',
    ],
    follow_up_specialist: [
      'menu:dashboard', 'menu:work_order',
      'work_order:view', 'work_order:close',
      'follow_up:view', 'follow_up:handle',
      'data:work_order_self',
    ],
  };

  for (const [roleKey, permKeys] of Object.entries(rolePermissionMap)) {
    const roleId = roleMap[roleKey];
    for (const permKey of permKeys) {
      const permId = permMap[permKey];
      if (roleId && permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permId } },
          update: {},
          create: { roleId, permissionId: permId },
        });
      }
    }
  }

  // ─── 4. 测试网点 ─────────────────────────────────────────
  const outlets = await Promise.all([
    prisma.outlet.upsert({ where: { code: 'GZ001' }, update: {}, create: { name: '广州服务中心', code: 'GZ001', address: '广州市天河区科技路100号', phone: '020-88888888' } }),
    prisma.outlet.upsert({ where: { code: 'SH001' }, update: {}, create: { name: '上海服务中心', code: 'SH001', address: '上海市浦东新区张江路200号', phone: '021-66666666' } }),
  ]);

  // ─── 5. 测试用户 ─────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', password, name: '系统管理员', phone: '13900000001', role: 'admin' } }),
    prisma.user.upsert({ where: { username: 'hq_service' }, update: {}, create: { username: 'hq_service', password, name: '总部客服李小姐', phone: '13900000010', role: 'hq_service' } }),
    prisma.user.upsert({ where: { username: 'outlet_mgr' }, update: {}, create: { username: 'outlet_mgr', password, name: '网点经理王主管', phone: '13900000004', role: 'outlet_manager', outletId: outlets[0].id } }),
    prisma.user.upsert({ where: { username: 'engineer' }, update: {}, create: { username: 'engineer', password, name: '张工程师', phone: '13900000005', role: 'engineer', outletId: outlets[0].id } }),
    prisma.user.upsert({ where: { username: 'supervisor' }, update: {}, create: { username: 'supervisor', password, name: '审批主管赵经理', phone: '13900000011', role: 'supervisor' } }),
    prisma.user.upsert({ where: { username: 'chief_eng' }, update: {}, create: { username: 'chief_eng', password, name: '总工程师刘工', phone: '13900000012', role: 'chief_engineer' } }),
    prisma.user.upsert({ where: { username: 'warehouse' }, update: {}, create: { username: 'warehouse', password, name: '仓库管理员陈师傅', phone: '13900000002', role: 'warehouse', outletId: outlets[0].id } }),
    prisma.user.upsert({ where: { username: 'procurement' }, update: {}, create: { username: 'procurement', password, name: '采购员孙小姐', phone: '13900000003', role: 'procurement' } }),
    prisma.user.upsert({ where: { username: 'follow_up' }, update: {}, create: { username: 'follow_up', password, name: '回访专员周小姐', phone: '13900000013', role: 'follow_up_specialist' } }),
  ]);

  const userMap = Object.fromEntries(users.map(u => [u.username, u.id]));
  const userId = (name: string) => userMap[name];

  // ─── 6. 用户角色绑定 ─────────────────────────────────────
  const userRoleBindings: Array<{ username: string; roleKey: string }> = [
    { username: 'admin', roleKey: 'admin' },
    { username: 'hq_service', roleKey: 'hq_service' },
    { username: 'outlet_mgr', roleKey: 'outlet_manager' },
    { username: 'engineer', roleKey: 'engineer' },
    { username: 'supervisor', roleKey: 'supervisor' },
    { username: 'chief_eng', roleKey: 'chief_engineer' },
    { username: 'warehouse', roleKey: 'warehouse' },
    { username: 'procurement', roleKey: 'procurement' },
    { username: 'follow_up', roleKey: 'follow_up_specialist' },
  ];

  for (const binding of userRoleBindings) {
    const userId = userMap[binding.username];
    const roleId = roleMap[binding.roleKey];
    if (userId && roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: {},
        create: { userId, roleId },
      });
    }
  }

  // ─── 7. 测试客户 ─────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({ where: { id: 1 }, update: {}, create: { name: '广州重型机械有限公司', contactName: '李总', contactPhone: '13800001111', outletId: outlets[0].id, address: '广州市番禺区大石街1号', customerType: 'ENTERPRISE' } }),
    prisma.customer.upsert({ where: { id: 2 }, update: {}, create: { name: '上海建设集团', contactName: '张经理', contactPhone: '13800002222', outletId: outlets[1].id, address: '上海市闵行区虹桥路88号', customerType: 'ENTERPRISE' } }),
    prisma.customer.upsert({ where: { id: 3 }, update: {}, create: { name: '深圳创新工程', contactName: '王工', contactPhone: '13800003333', outletId: outlets[0].id, address: '深圳市南山区科技园', customerType: 'PERSONAL' } }),
  ]);

  // ─── 8. 测试机台 ─────────────────────────────────────────
  await Promise.all([
    prisma.machine.upsert({ where: { serialNo: 'MCH-2024-001' }, update: {}, create: { serialNo: 'MCH-2024-001', brand: '三一重工', model: 'SY75C', type: '挖掘机', customerId: customers[0].id, outletId: outlets[0].id, currentHours: 1200.5 } }),
    prisma.machine.upsert({ where: { serialNo: 'MCH-2024-002' }, update: {}, create: { serialNo: 'MCH-2024-002', brand: '中联重科', model: 'ZE215E', type: '挖掘机', customerId: customers[1].id, outletId: outlets[1].id, currentHours: 800.0 } }),
    prisma.machine.upsert({ where: { serialNo: 'MCH-2024-003' }, update: {}, create: { serialNo: 'MCH-2024-003', brand: '徐工集团', model: 'XCT25', type: '起重机', customerId: customers[2].id, outletId: outlets[0].id, currentHours: 500.3 } }),
    prisma.machine.upsert({ where: { serialNo: 'MCH-2024-OUT-WARRANTY' }, update: { currentHours: 3600, warrantyEndDate: new Date('2025-01-01') }, create: { serialNo: 'MCH-2024-OUT-WARRANTY', brand: '三一重工', model: 'SY75C-超保测试', type: '挖掘机', customerId: customers[0].id, outletId: outlets[0].id, currentHours: 3600, purchaseDate: new Date('2024-01-01'), warrantyStartDate: new Date('2024-01-01'), warrantyEndDate: new Date('2025-01-01'), warrantyMonths: 12, warrantyPolicy: '3000工作小时内或客户收货一年内' } }),
  ]);

  // ─── 9. 测试仓库 ─────────────────────────────────────────
  await Promise.all([
    prisma.warehouse.upsert({ where: { warehouseNo: 'WH-HQ-K3' }, update: { name: 'K3总仓', type: 'HQ_WAREHOUSE', outletId: null, outletName: null, k3WarehouseCode: 'K3-HQ' }, create: { warehouseNo: 'WH-HQ-K3', name: 'K3总仓', type: 'HQ_WAREHOUSE', k3WarehouseCode: 'K3-HQ' } }),
    prisma.warehouse.upsert({ where: { warehouseNo: 'WH-GZ-MAIN' }, update: { name: '广州服务中心网点仓', type: 'OUTLET_WAREHOUSE', outletId: outlets[0].id, outletName: '广州服务中心' }, create: { warehouseNo: 'WH-GZ-MAIN', name: '广州服务中心网点仓', type: 'OUTLET_WAREHOUSE', outletId: outlets[0].id, outletName: '广州服务中心' } }),
    prisma.warehouse.upsert({ where: { warehouseNo: 'WH-SH-MAIN' }, update: { name: '上海服务中心网点仓', type: 'OUTLET_WAREHOUSE', outletId: outlets[1].id, outletName: '上海服务中心' }, create: { warehouseNo: 'WH-SH-MAIN', name: '上海服务中心网点仓', type: 'OUTLET_WAREHOUSE', outletId: outlets[1].id, outletName: '上海服务中心' } }),
    prisma.warehouse.upsert({ where: { warehouseNo: 'WH-GZ-ENG01' }, update: { type: 'ENGINEER_WAREHOUSE' }, create: { warehouseNo: 'WH-GZ-ENG01', name: '张工程师个人仓', type: 'ENGINEER_WAREHOUSE', outletId: outlets[0].id, outletName: '广州服务中心', ownerEngineerId: userMap['engineer'], ownerEngineerName: '张工程师' } }),
  ]);
  await prisma.warehouse.updateMany({
    where: { type: 'HQ_WAREHOUSE', warehouseNo: { not: 'WH-HQ-K3' } },
    data: { status: 'DISABLED' },
  });

  // ─── 10. 测试供应商 ───────────────────────────────────────
  await Promise.all([
    prisma.supplier.upsert({ where: { code: 'SUP-001' }, update: {}, create: { name: '三一重工配件供应商', code: 'SUP-001', contactName: '赵经理', contactPhone: '13700001111', address: '长沙市经开区' } }),
    prisma.supplier.upsert({ where: { code: 'SUP-002' }, update: {}, create: { name: '中联重科配件中心', code: 'SUP-002', contactName: '钱工', contactPhone: '13700002222', address: '长沙市麓谷' } }),
  ]);

  // ─── 11. 故障分类 ─────────────────────────────────────────
  const faultCat1 = await prisma.faultType.upsert({ where: { code: 'FT-ENGINE' }, update: {}, create: { name: '发动机故障', code: 'FT-ENGINE', level: 1, sortOrder: 1 } });
  const faultCat2 = await prisma.faultType.upsert({ where: { code: 'FT-HYDRAULIC' }, update: {}, create: { name: '液压系统故障', code: 'FT-HYDRAULIC', level: 1, sortOrder: 2 } });
  const faultCat3 = await prisma.faultType.upsert({ where: { code: 'FT-ELECTRICAL' }, update: {}, create: { name: '电气系统故障', code: 'FT-ELECTRICAL', level: 1, sortOrder: 3 } });
  await Promise.all([
    prisma.faultType.upsert({ where: { code: 'FT-ENGINE-START' }, update: {}, create: { name: '启动困难', code: 'FT-ENGINE-START', parentId: faultCat1.id, level: 2, sortOrder: 1 } }),
    prisma.faultType.upsert({ where: { code: 'FT-ENGINE-OVERHEAT' }, update: {}, create: { name: '水温过高', code: 'FT-ENGINE-OVERHEAT', parentId: faultCat1.id, level: 2, sortOrder: 2 } }),
    prisma.faultType.upsert({ where: { code: 'FT-HYDRAULIC-LEAK' }, update: {}, create: { name: '液压油泄漏', code: 'FT-HYDRAULIC-LEAK', parentId: faultCat2.id, level: 2, sortOrder: 1 } }),
    prisma.faultType.upsert({ where: { code: 'FT-HYDRAULIC-WEAK' }, update: {}, create: { name: '动作无力', code: 'FT-HYDRAULIC-WEAK', parentId: faultCat2.id, level: 2, sortOrder: 2 } }),
    prisma.faultType.upsert({ where: { code: 'FT-ELEC-LIGHT' }, update: {}, create: { name: '仪表灯异常', code: 'FT-ELEC-LIGHT', parentId: faultCat3.id, level: 2, sortOrder: 1 } }),
  ]);

  // ─── 12. 物料主数据 ───────────────────────────────────────
  await Promise.all([
    prisma.inventoryItem.upsert({ where: { partNo: 'P-001' }, update: {}, create: { partNo: 'P-001', name: '液压泵密封圈', spec: 'φ50×3.5', unit: '个', category: '密封件' } }),
    prisma.inventoryItem.upsert({ where: { partNo: 'P-002' }, update: {}, create: { partNo: 'P-002', name: '机油滤芯', spec: 'LF3349', unit: '个', category: '滤芯' } }),
    prisma.inventoryItem.upsert({ where: { partNo: 'P-003' }, update: {}, create: { partNo: 'P-003', name: '液压油管', spec: 'φ16×2m', unit: '根', category: '管路' } }),
  ]);

  // ─── 13. 库存初始化（含 K3 总仓、网点仓、个人仓和流水）───────────────
  const hqWarehouse = await prisma.warehouse.findUnique({ where: { warehouseNo: 'WH-HQ-K3' } });
  const gzWarehouse = await prisma.warehouse.findUnique({ where: { warehouseNo: 'WH-GZ-MAIN' } });
  const shWarehouse = await prisma.warehouse.findUnique({ where: { warehouseNo: 'WH-SH-MAIN' } });
  const engineerWarehouse = await prisma.warehouse.findUnique({ where: { warehouseNo: 'WH-GZ-ENG01' } });
  const parts = await prisma.inventoryItem.findMany();
  const stockMap: Record<string, number> = {
    [`${hqWarehouse?.id}_P-001`]: 5,
    [`${hqWarehouse?.id}_P-002`]: 11,
    [`${hqWarehouse?.id}_P-003`]: 10,
    [`${gzWarehouse?.id}_P-001`]: 3,
    [`${gzWarehouse?.id}_P-002`]: 4,
    [`${shWarehouse?.id}_P-003`]: 2,
    [`${engineerWarehouse?.id}_P-002`]: 1,
  };
  for (const wh of [hqWarehouse, gzWarehouse, shWarehouse, engineerWarehouse].filter(Boolean) as any[]) {
    for (const part of parts) {
      const qty = stockMap[`${wh.id}_${part.partNo}`] || 0;
      if (qty > 0) {
        await prisma.inventoryBalance.upsert({
          where: { warehouseId_partId: { warehouseId: wh.id, partId: part.id } },
          update: { warehouseName: wh.name, partNo: part.partNo, partName: part.name, partModel: part.spec || '', quantityOnHand: qty, quantityAvailable: qty },
          create: { warehouseId: wh.id, warehouseName: wh.name, partId: part.id, partNo: part.partNo, partName: part.name, partModel: part.spec || '', quantityOnHand: qty, quantityAvailable: qty, quantityReserved: 0, quantityDamaged: 0 },
        });
      }
    }
  }

  const partByNo = Object.fromEntries(parts.map(p => [p.partNo, p]));
  async function upsertTxn(transactionNo: string, data: any) {
    await prisma.inventoryTransaction.upsert({
      where: { transactionNo },
      update: data,
      create: { transactionNo, ...data },
    });
  }
  if (hqWarehouse) {
    await upsertTxn('INV-SEED-K3-P001', { type: 'K3_SYNC', direction: 'IN', toWarehouseId: hqWarehouse.id, toWarehouseName: hqWarehouse.name, partId: partByNo['P-001'].id, partName: partByNo['P-001'].name, quantity: 8, beforeQuantity: 0, afterQuantity: 8, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: K3 总仓同步' });
    await upsertTxn('INV-SEED-K3-P002', { type: 'K3_SYNC', direction: 'IN', toWarehouseId: hqWarehouse.id, toWarehouseName: hqWarehouse.name, partId: partByNo['P-002'].id, partName: partByNo['P-002'].name, quantity: 16, beforeQuantity: 0, afterQuantity: 16, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: K3 总仓同步' });
    await upsertTxn('INV-SEED-K3-P003', { type: 'K3_SYNC', direction: 'IN', toWarehouseId: hqWarehouse.id, toWarehouseName: hqWarehouse.name, partId: partByNo['P-003'].id, partName: partByNo['P-003'].name, quantity: 12, beforeQuantity: 0, afterQuantity: 12, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: K3 总仓同步' });
  }
  if (hqWarehouse && gzWarehouse) {
    await upsertTxn('INV-SEED-HQ-GZ-P001', { type: 'HQ_TO_OUTLET', direction: 'TRANSFER', fromWarehouseId: hqWarehouse.id, fromWarehouseName: hqWarehouse.name, toWarehouseId: gzWarehouse.id, toWarehouseName: gzWarehouse.name, partId: partByNo['P-001'].id, partName: partByNo['P-001'].name, quantity: 3, beforeQuantity: 8, afterQuantity: 5, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: 总仓调拨到广州网点仓' });
    await upsertTxn('INV-SEED-HQ-GZ-P002', { type: 'HQ_TO_OUTLET', direction: 'TRANSFER', fromWarehouseId: hqWarehouse.id, fromWarehouseName: hqWarehouse.name, toWarehouseId: gzWarehouse.id, toWarehouseName: gzWarehouse.name, partId: partByNo['P-002'].id, partName: partByNo['P-002'].name, quantity: 5, beforeQuantity: 16, afterQuantity: 11, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: 总仓调拨到广州网点仓' });
  }
  if (hqWarehouse && shWarehouse) {
    await upsertTxn('INV-SEED-HQ-SH-P003', { type: 'HQ_TO_OUTLET', direction: 'TRANSFER', fromWarehouseId: hqWarehouse.id, fromWarehouseName: hqWarehouse.name, toWarehouseId: shWarehouse.id, toWarehouseName: shWarehouse.name, partId: partByNo['P-003'].id, partName: partByNo['P-003'].name, quantity: 2, beforeQuantity: 12, afterQuantity: 10, operatorId: userId('warehouse'), operatorName: '仓库管理员陈师傅', remark: 'Seed: 总仓调拨到上海网点仓' });
  }
  if (gzWarehouse && engineerWarehouse) {
    await upsertTxn('INV-SEED-GZ-ENG-P002', { type: 'OUTLET_TO_ENGINEER', direction: 'TRANSFER', fromWarehouseId: gzWarehouse.id, fromWarehouseName: gzWarehouse.name, toWarehouseId: engineerWarehouse.id, toWarehouseName: engineerWarehouse.name, partId: partByNo['P-002'].id, partName: partByNo['P-002'].name, quantity: 1, beforeQuantity: 5, afterQuantity: 4, operatorId: userId('engineer'), operatorName: '张工程师', remark: 'Seed: 工程师预领到个人仓' });
  }

  // ─── 13. 工单种子数据 ───────────────────────────────────────
  const now = new Date()
  const ago = (h: number) => new Date(now.getTime() - h * 3600000)
  const wo1 = await prisma.workOrder.upsert({
    where: { orderNo: 'WO-2026-0501' }, update: {},
    create: {
      orderNo: 'WO-2026-0501', title: '液压系统异响', description: '挖掘机作业时液压系统发出异常响声',
      state: 'ENGINEER_ASSIGNED', priority: 'URGENT', source: 'H5',
      outletId: outlets[0].id, engineerId: userId('engineer'),
      customerId: customers[0].id, machineId: 1,
      customerNameSnapshot: '李总', customerPhoneSnapshot: '13800001111',
      serviceAddressSnapshot: '广州市番禺区大石街1号',
      machineSerialSnapshot: 'MCH-2024-001', machineModelSnapshot: '三一重工 SY75C',
      faultDesc: '液压系统异响，伴有轻微抖动', isUnderWarranty: true, estimatedCost: 0,
      creatorId: userId('hq_service'), acceptedAt: ago(48), outletAssignedAt: ago(48),
      engineerAssignedAt: ago(47), stateEnteredAt: ago(47),
      createdAt: ago(48), updatedAt: ago(47),
    },
  })

  const wo2 = await prisma.workOrder.upsert({
    where: { orderNo: 'WO-2026-0502' }, update: {},
    create: {
      orderNo: 'WO-2026-0502', title: '空调不制冷', description: '驾驶室空调完全不制冷',
      state: 'REPAIRING', priority: 'HIGH', source: 'PC',
      outletId: outlets[0].id, engineerId: userId('engineer'),
      customerId: customers[2].id, machineId: 3,
      customerNameSnapshot: '王工', customerPhoneSnapshot: '13800003333',
      serviceAddressSnapshot: '深圳市南山区科技园',
      machineSerialSnapshot: 'MCH-2024-003', machineModelSnapshot: '徐工集团 XCT25',
      faultDesc: '空调不制冷，压缩机不启动', isUnderWarranty: true, estimatedCost: 0,
      creatorId: userId('hq_service'),
      acceptedAt: ago(96), outletAssignedAt: ago(96), engineerAssignedAt: ago(95),
      signedInAt: ago(94), faultConfirmedAt: ago(93), repairStartedAt: ago(92),
      stateEnteredAt: ago(92),
      createdAt: ago(96), updatedAt: ago(92),
    },
  })

  const wo3 = await prisma.workOrder.upsert({
    where: { orderNo: 'WO-2026-0503' }, update: {},
    create: {
      orderNo: 'WO-2026-0503', title: '发动机启动困难', description: '发动机冷启动时多次打火才能启动',
      state: 'PENDING_SIGNATURE', priority: 'NORMAL', source: 'H5',
      outletId: outlets[0].id, engineerId: userId('engineer'),
      customerId: customers[0].id, machineId: 1,
      customerNameSnapshot: '李总', customerPhoneSnapshot: '13800001111',
      serviceAddressSnapshot: '广州市番禺区大石街1号',
      machineSerialSnapshot: 'MCH-2024-001', machineModelSnapshot: '三一重工 SY75C',
      faultDesc: '冷启动困难，需要多次打火', isUnderWarranty: false, estimatedCost: 1500,
      creatorId: userId('hq_service'),
      acceptedAt: ago(120), outletAssignedAt: ago(120), engineerAssignedAt: ago(119),
      signedInAt: ago(118), faultConfirmedAt: ago(117), repairStartedAt: ago(116),
      receiptSubmittedAt: ago(114), stateEnteredAt: ago(114),
      createdAt: ago(120), updatedAt: ago(114),
    },
  })

  const wo4 = await prisma.workOrder.upsert({
    where: { orderNo: 'WO-2026-0504' }, update: {},
    create: {
      orderNo: 'WO-2026-0504', title: '仪表灯闪烁异常', description: '仪表盘多个指示灯不规则闪烁',
      state: 'CLOSED', priority: 'LOW', source: 'PC',
      outletId: outlets[0].id, engineerId: userId('engineer'),
      customerId: customers[2].id, machineId: 3,
      customerNameSnapshot: '王工', customerPhoneSnapshot: '13800003333',
      serviceAddressSnapshot: '深圳市南山区科技园',
      machineSerialSnapshot: 'MCH-2024-003', machineModelSnapshot: '徐工集团 XCT25',
      faultDesc: '仪表盘指示灯不规则闪烁', isUnderWarranty: true, estimatedCost: 0,
      creatorId: userId('hq_service'),
      acceptedAt: ago(200), outletAssignedAt: ago(200), engineerAssignedAt: ago(199),
      signedInAt: ago(198), faultConfirmedAt: ago(197), repairStartedAt: ago(196),
      receiptSubmittedAt: ago(194), customerSignedAt: ago(193), completedAt: ago(192),
      closedAt: ago(190), stateEnteredAt: ago(190),
      createdAt: ago(200), updatedAt: ago(190),
    },
  })

  const wo5 = await prisma.workOrder.upsert({
    where: { orderNo: 'WO-2026-0505' }, update: {},
    create: {
      orderNo: 'WO-2026-0505', title: '回转机构卡顿', description: '挖掘机回转时有明显卡顿和不规则异响',
      state: 'SIGNED_IN', priority: 'HIGH', source: 'H5',
      outletId: outlets[1].id, engineerId: userId('engineer'),
      customerId: customers[1].id, machineId: 2,
      customerNameSnapshot: '张经理', customerPhoneSnapshot: '13800002222',
      serviceAddressSnapshot: '上海市闵行区虹桥路88号',
      machineSerialSnapshot: 'MCH-2024-002', machineModelSnapshot: '中联重科 ZE215E',
      faultDesc: '回转时有明显卡顿', isUnderWarranty: true, estimatedCost: 0,
      creatorId: userId('hq_service'),
      acceptedAt: ago(24), outletAssignedAt: ago(24), engineerAssignedAt: ago(23),
      signedInAt: ago(22), stateEnteredAt: ago(22),
      createdAt: ago(24), updatedAt: ago(22),
    },
  })

  async function seedHistory(workOrderId: number, events: Array<{ action: string; fromState?: string | null; toState: string; operator: string; at: Date }>) {
    await prisma.workOrderHistory.deleteMany({ where: { workOrderId } });
    await prisma.workOrderHistory.createMany({
      data: events.map((event) => ({
        workOrderId,
        action: event.action,
        fromState: event.fromState,
        toState: event.toState,
        operatorId: userId(event.operator),
        operatorName: users.find((u) => u.username === event.operator)?.name || event.operator,
        operatorRole: users.find((u) => u.username === event.operator)?.role || null,
        platform: 'seed',
        createdAt: event.at,
      })),
    });
  }

  await seedHistory(wo1.id, [
    { action: 'ACCEPTED', fromState: 'CREATED', toState: 'ACCEPTED', operator: 'hq_service', at: ago(48) },
    { action: 'OUTLET_ASSIGNED', fromState: 'ACCEPTED', toState: 'OUTLET_ASSIGNED', operator: 'hq_service', at: ago(48) },
    { action: 'ENGINEER_ASSIGNED', fromState: 'OUTLET_ASSIGNED', toState: 'ENGINEER_ASSIGNED', operator: 'outlet_mgr', at: ago(47) },
  ]);
  await seedHistory(wo2.id, [
    { action: 'ACCEPTED', fromState: 'CREATED', toState: 'ACCEPTED', operator: 'hq_service', at: ago(96) },
    { action: 'OUTLET_ASSIGNED', fromState: 'ACCEPTED', toState: 'OUTLET_ASSIGNED', operator: 'hq_service', at: ago(96) },
    { action: 'ENGINEER_ASSIGNED', fromState: 'OUTLET_ASSIGNED', toState: 'ENGINEER_ASSIGNED', operator: 'outlet_mgr', at: ago(95) },
    { action: 'SIGNED_IN', fromState: 'ENGINEER_ASSIGNED', toState: 'SIGNED_IN', operator: 'engineer', at: ago(94) },
    { action: 'FAULT_CONFIRMED', fromState: 'SIGNED_IN', toState: 'FAULT_CONFIRMED', operator: 'engineer', at: ago(93) },
    { action: 'REPAIRING', fromState: 'FAULT_CONFIRMED', toState: 'REPAIRING', operator: 'engineer', at: ago(92) },
  ]);
  await seedHistory(wo3.id, [
    { action: 'ACCEPTED', fromState: 'CREATED', toState: 'ACCEPTED', operator: 'hq_service', at: ago(120) },
    { action: 'OUTLET_ASSIGNED', fromState: 'ACCEPTED', toState: 'OUTLET_ASSIGNED', operator: 'hq_service', at: ago(120) },
    { action: 'ENGINEER_ASSIGNED', fromState: 'OUTLET_ASSIGNED', toState: 'ENGINEER_ASSIGNED', operator: 'outlet_mgr', at: ago(119) },
    { action: 'SIGNED_IN', fromState: 'ENGINEER_ASSIGNED', toState: 'SIGNED_IN', operator: 'engineer', at: ago(118) },
    { action: 'FAULT_CONFIRMED', fromState: 'SIGNED_IN', toState: 'FAULT_CONFIRMED', operator: 'engineer', at: ago(117) },
    { action: 'REPAIRING', fromState: 'FAULT_CONFIRMED', toState: 'REPAIRING', operator: 'engineer', at: ago(116) },
    { action: 'PENDING_SIGNATURE', fromState: 'REPAIRING', toState: 'PENDING_SIGNATURE', operator: 'engineer', at: ago(114) },
  ]);
  await seedHistory(wo4.id, [
    { action: 'ACCEPTED', fromState: 'CREATED', toState: 'ACCEPTED', operator: 'hq_service', at: ago(200) },
    { action: 'OUTLET_ASSIGNED', fromState: 'ACCEPTED', toState: 'OUTLET_ASSIGNED', operator: 'hq_service', at: ago(200) },
    { action: 'ENGINEER_ASSIGNED', fromState: 'OUTLET_ASSIGNED', toState: 'ENGINEER_ASSIGNED', operator: 'outlet_mgr', at: ago(199) },
    { action: 'SIGNED_IN', fromState: 'ENGINEER_ASSIGNED', toState: 'SIGNED_IN', operator: 'engineer', at: ago(198) },
    { action: 'FAULT_CONFIRMED', fromState: 'SIGNED_IN', toState: 'FAULT_CONFIRMED', operator: 'engineer', at: ago(197) },
    { action: 'REPAIRING', fromState: 'FAULT_CONFIRMED', toState: 'REPAIRING', operator: 'engineer', at: ago(196) },
    { action: 'PENDING_SIGNATURE', fromState: 'REPAIRING', toState: 'PENDING_SIGNATURE', operator: 'engineer', at: ago(194) },
    { action: 'REPAIR_COMPLETED', fromState: 'PENDING_SIGNATURE', toState: 'REPAIR_COMPLETED', operator: 'engineer', at: ago(193) },
    { action: 'FOLLOW_UP_PENDING', fromState: 'REPAIR_COMPLETED', toState: 'FOLLOW_UP_PENDING', operator: 'engineer', at: ago(192) },
    { action: 'CLOSED', fromState: 'FOLLOW_UP_PENDING', toState: 'CLOSED', operator: 'follow_up', at: ago(190) },
  ]);
  await seedHistory(wo5.id, [
    { action: 'ACCEPTED', fromState: 'CREATED', toState: 'ACCEPTED', operator: 'hq_service', at: ago(24) },
    { action: 'OUTLET_ASSIGNED', fromState: 'ACCEPTED', toState: 'OUTLET_ASSIGNED', operator: 'hq_service', at: ago(24) },
    { action: 'ENGINEER_ASSIGNED', fromState: 'OUTLET_ASSIGNED', toState: 'ENGINEER_ASSIGNED', operator: 'outlet_mgr', at: ago(23) },
    { action: 'SIGNED_IN', fromState: 'ENGINEER_ASSIGNED', toState: 'SIGNED_IN', operator: 'engineer', at: ago(22) },
  ]);

  // ─── 14. 报价 + 审批测试数据 ─────────────────────────────────
  const quote1 = await prisma.quote.upsert({
    where: { quoteNo: 'Q-2026-0001' }, update: {},
    create: {
      quoteNo: 'Q-2026-0001', workOrderId: wo3.id, version: 1,
      status: 'PENDING_SUPERVISOR', totalAmount: 2000,
      creatorId: userId('engineer'), costAmount: 1500,
      createdAt: ago(115),
    },
  })
  const quote2 = await prisma.quote.upsert({
    where: { quoteNo: 'Q-2026-0002' }, update: {},
    create: {
      quoteNo: 'Q-2026-0002', workOrderId: wo2.id, version: 1,
      status: 'PENDING_PROCUREMENT', totalAmount: 1800,
      creatorId: userId('engineer'), costAmount: 1500,
      createdAt: ago(90),
    },
  })

  // 审批记录
  await prisma.approval.upsert({
    where: { id: 1 }, update: {},
    create: {
      type: 'QUOTE', sourceId: quote1.id, sourceNo: quote1.quoteNo,
      summary: '液压系统异响维修报价，总金额¥2000', status: 'PENDING',
      applicantId: userId('engineer'),
      createdAt: ago(115),
    },
  })
  await prisma.approval.upsert({
    where: { id: 2 }, update: {},
    create: {
      type: 'QUOTE', sourceId: quote2.id, sourceNo: quote2.quoteNo,
      summary: '空调不制冷压缩机更换报价，总金额¥1800', status: 'PENDING',
      applicantId: userId('engineer'),
      createdAt: ago(90),
    },
  })

  // ─── 15. 采购单测试数据 ───────────────────────────────────────
  await prisma.procurementRequest.upsert({
    where: { procurementNo: 'PR-2026-0001' }, update: {},
    create: {
      procurementNo: 'PR-2026-0001', quoteId: quote2.id,
      workOrderId: wo2.id, supplierId: 1,
      status: 'PENDING_APPROVAL', estimatedCost: 1800,
      createdAt: ago(88),
    },
  })

  console.log('Seed data created successfully');
  console.log(`  - ${roles.length} roles`);
  console.log(`  - ${permRecords.length} permissions`);
  console.log(`  - ${outlets.length} outlets`);
  console.log(`  - ${users.length} users`);
  console.log(`  - ${customers.length} customers`);
  console.log(`  - 3 machines`);
  console.log(`  - 3 warehouses`);
  console.log(`  - 2 suppliers`);
  console.log(`  - 8 fault types`);
  console.log(`  - 3 inventory items`);
  console.log(`  - 5 work orders (all states)`);
  console.log(`  - 2 quotes + items`);
  console.log(`  - 2 approvals`);
  console.log(`  - 1 procurement`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
