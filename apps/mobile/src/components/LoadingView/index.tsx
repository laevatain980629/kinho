import { View, Text } from '@tarojs/components'
import './index.scss'

interface LoadingViewProps {
  text?: string
}

export default function LoadingView({ text = '加载中...' }: LoadingViewProps) {
  return (
    <View className='loading-view'>
      <View className='loading-view__spinner' />
      <Text className='loading-view__text'>{text}</Text>
    </View>
  )
}
