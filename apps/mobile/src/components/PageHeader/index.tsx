import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface PageHeaderProps {
  title: string
  onBack?: () => void
}

export default function PageHeader({ title, onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      Taro.navigateBack().catch(() => {
        Taro.switchTab({ url: '/pages/home/index' })
      })
    }
  }

  return (
    <View className='page-header'>
      <View className='page-header__back' onClick={handleBack}>
        <Text className='page-header__back-icon'>&lsaquo;</Text>
        <Text className='page-header__back-text'>返回</Text>
      </View>
      <Text className='page-header__title'>{title}</Text>
      <View className='page-header__spacer' />
    </View>
  )
}
