import { useState, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ROLE_LABELS, type Role } from '@kinho/shared-types'
import { getCurrentUser } from '../../utils/current-user'
import './index.scss'

const ROLE_PERMISSIONS: Record<Role, { module: string; actions: string[] }[]> = {
  engineer: [
    { module: '工单管理', actions: ['查看工单', '接单处理', '填写维修报告', '提交配件申请'] },
    { module: '配件管理', actions: ['查看库存', '申请配件', '退还配件'] },
    { module: '个人中心', actions: ['查看个人信息', '修改密码'] },
  ],
  admin: [
    { module: '系统管理', actions: ['用户管理', '角色权限配置', '系统设置'] },
    { module: '工单管理', actions: ['全部操作'] },
    { module: '数据统计', actions: ['查看报表', '导出数据'] },
  ],
  hq_service: [
    { module: '工单管理', actions: ['创建工单', '分配工单', '查看所有工单'] },
    { module: '客户管理', actions: ['查看客户信息', '回访记录'] },
  ],
  outlet_manager: [
    { module: '网点管理', actions: ['查看网点信息', '管理工程师'] },
    { module: '工单管理', actions: ['查看网点工单', '审批工单'] },
    { module: '配件管理', actions: ['审批配件申请', '查看库存'] },
  ],
  supervisor: [
    { module: '审批管理', actions: ['审批工单', '审批配件申请', '审批报价'] },
    { module: '工单管理', actions: ['查看工单', '分配工单'] },
  ],
  chief_engineer: [
    { module: '技术管理', actions: ['查看技术方案', '审批技术变更'] },
    { module: '工单管理', actions: ['查看所有工单', '技术指导'] },
  ],
  warehouse: [
    { module: '仓库管理', actions: ['入库操作', '出库操作', '库存盘点'] },
    { module: '配件管理', actions: ['发放配件', '回收配件'] },
  ],
  procurement: [
    { module: '采购管理', actions: ['创建采购单', '查看采购记录'] },
    { module: '供应商管理', actions: ['查看供应商', '比价'] },
  ],
  follow_up_specialist: [
    { module: '回访管理', actions: ['查看待回访列表', '填写回访记录'] },
    { module: '客户管理', actions: ['查看客户信息'] },
  ],
}

export default function Profile() {
  const [showPassword, setShowPassword] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  }, [])

  const currentUser = getCurrentUser()
  const user = {
    name: currentUser.name || currentUser.username || '未知用户',
    role: (currentUser.role || 'engineer') as Role,
    outletName: currentUser.outletName || '',
  }

  function handleSavePassword() {
    setPwdError('')
    setPwdSuccess('')
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('请填写所有密码字段')
      return
    }
    if (newPwd.length < 6) {
      setPwdError('新密码至少 6 位')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError('两次输入的新密码不一致')
      return
    }
    setPwdSuccess('密码修改成功')
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }

  function handleLogout() {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    Taro.removeStorageSync('kinho-theme')
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  return (
    <View className='profile'>
      <Text className='profile__title'>我的</Text>

      <View className='profile__card'>
        <View className='profile__user'>
          <View className='profile__avatar'>
            <Text className='profile__avatar-text'>{user.name.charAt(0)}</Text>
          </View>
          <View className='profile__user-info'>
            <Text className='profile__user-name'>{user.name}</Text>
            <Text className='profile__user-outlet'>{user.outletName}</Text>
          </View>
          <View className='profile__role-tag'>
            <Text className='profile__role-tag-text'>{ROLE_LABELS[user.role]}</Text>
          </View>
        </View>
      </View>

      <View className='profile__card'>
        <View className='profile__pwd-toggle' onClick={() => setShowPassword((v) => !v)}>
          <Text className='profile__pwd-label'>修改密码</Text>
          <Text className='profile__pwd-arrow'>{showPassword ? '−' : '+'}</Text>
        </View>

        {showPassword && (
          <View className='profile__pwd-form'>
            <Input
              className='profile__input'
              type='password'
              placeholder='请输入当前密码'
              value={currentPwd}
              onInput={(e) => setCurrentPwd(e.detail.value)}
            />
            <Input
              className='profile__input'
              type='password'
              placeholder='至少 6 位'
              value={newPwd}
              onInput={(e) => setNewPwd(e.detail.value)}
            />
            <Input
              className='profile__input'
              type='password'
              placeholder='再次输入新密码'
              value={confirmPwd}
              onInput={(e) => setConfirmPwd(e.detail.value)}
            />

            {pwdError && (
              <View className='profile__msg profile__msg--error'>
                <Text>{pwdError}</Text>
              </View>
            )}
            {pwdSuccess && (
              <View className='profile__msg profile__msg--success'>
                <Text>{pwdSuccess}</Text>
              </View>
            )}

            <View className='profile__pwd-save' onClick={handleSavePassword}>
              <Text className='profile__pwd-save-text'>保存</Text>
            </View>
          </View>
        )}
      </View>

      {/* 我的权限与深色模式切换暂不在移动端展示，后续接权限 API 后再上线。 */}

      <View className='profile__logout' onClick={handleLogout}>
        <Text className='profile__logout-text'>退出登录</Text>
      </View>
    </View>
  )
}
