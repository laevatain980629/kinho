# 后端测试账号密码

**所有账号密码统一为 `123456`**

| 用户名 | 姓名 | 角色 | 角色标识 | 手机号 | 所属网点 |
|--------|------|------|----------|--------|----------|
| admin | 系统管理员 | 系统管理员 | admin | 13900000001 | — |
| hq_service | 总部客服 | 总部客服 | hq_service | 13900000006 | — |
| supervisor | 审批主管 | 审批主管 | supervisor | 13900000007 | — |
| chief_engineer | 总工程师 | 总工程师 | chief_engineer | 13900000008 | — |
| warehouse | 仓库管理员 | 仓库管理员 | warehouse | 13900000002 | 上海服务中心 |
| procurement | 采购员 | 采购专员 | procurement | 13900000003 | — |
| outlet_mgr | 网点主管 | 网点经理 | outlet_manager | 13900000004 | 广州网点 |
| engineer | 张工程师 | 维修工程师 | engineer | 13900000005 | 广州网点 |
| follow_up | 回访专员 | 回访专员 | follow_up_specialist | 13900000009 | — |

## 登录方式

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

## Swagger 文档

http://localhost:3000/api/docs
