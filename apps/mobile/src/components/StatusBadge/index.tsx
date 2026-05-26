import { View, Text } from '@tarojs/components'
import { STATUS_BG } from '../../utils/status-styles'
import './index.scss'

interface StatusBadgeProps {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const classes = STATUS_BG[status] || 'bg-gray text-gray'

  return (
    <View className={`status-badge ${classes}`}>
      <Text className='status-badge__text'>{label || status}</Text>
    </View>
  )
}
