import { View, Text, Button } from '@tarojs/components'
import './index.scss'

interface EmptyViewProps {
  icon?: string
  text?: string
  actionText?: string
  onAction?: () => void
}

export default function EmptyView({
  icon = '--',
  text = '暂无数据',
  actionText,
  onAction,
}: EmptyViewProps) {
  return (
    <View className='empty-view'>
      <Text className='empty-view__icon'>{icon}</Text>
      <Text className='empty-view__text'>{text}</Text>
      {actionText && onAction && (
        <Button className='empty-view__action' onClick={onAction}>
          {actionText}
        </Button>
      )}
    </View>
  )
}
