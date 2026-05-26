import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { apiPost } from '../../utils/api-client'
import './index.scss'

// 角色默认首页：审批类角色→工单列表，仓库→仓库，其他→首页
const ROLE_HOME: Record<string, string> = {
  supervisor: '/pages/approvals/index',
  chief_engineer: '/pages/orders/index',
  follow_up_specialist: '/pages/orders/index',
  warehouse: '/pages/warehouse/index',
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (loading) return
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    setError('')
    setLoading(true)
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    Taro.removeStorageSync('permissions')

    try {
      const data = await apiPost<{ token: string; user: Record<string, unknown>; mustChangePwd?: boolean }>(
        '/auth/login',
        { username, password },
      )
      Taro.setStorageSync('token', data.token)
      Taro.setStorageSync('user', data.user)

      // Role-based initial redirect (use role from login response directly)
      const role = (data.user as any)?.role || ''
      const home = ROLE_HOME[role] || '/pages/home/index'
      Taro.reLaunch({ url: home })
    } catch (e: any) {
      setError(e?.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login'>
      <View className='login__card'>
        <View className='login__logo'>
          <View className='login__logo-icon'>K</View>
        </View>
        <Text className='login__title'>KINHO 售后服务</Text>
        <Text className='login__sub'>工程机械维修管理平台</Text>

        <View className='login__form'>
          <View className='login__field'>
            <Text className='login__label'>用户名</Text>
            <Input className='login__input' value={username} placeholder='请输入用户名' onInput={(e: any) => setUsername(e.detail.value)} />
          </View>
          <View className='login__field'>
            <Text className='login__label'>密码</Text>
            <Input className='login__input' password value={password} placeholder='请输入密码' onInput={(e: any) => setPassword(e.detail.value)} />
          </View>

          {error ? <Text className='login__error'>{error}</Text> : null}

          <View className={`login__btn ${loading ? 'login__btn--disabled' : ''}`} onClick={handleLogin}>
            <Text className='login__btn-text'>{loading ? '登录中...' : '登录'}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
