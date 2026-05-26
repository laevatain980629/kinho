import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface TaroAttachment {
  id: number
  tempFilePath: string
  name: string
  size: number
}

interface PhotoUploadProps {
  value: TaroAttachment[]
  onChange: (files: TaroAttachment[]) => void
  max?: number
}

export default function PhotoUpload({ value, onChange, max = 9 }: PhotoUploadProps) {
  const handleAdd = () => {
    const remain = max - value.length
    if (remain <= 0) return

    Taro.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles: TaroAttachment[] = res.tempFiles.map((file, i) => ({
          id: Date.now() + i,
          tempFilePath: file.path,
          name: `photo_${Date.now()}_${i}.jpg`,
          size: file.size || 0,
        }))
        onChange([...value, ...newFiles].slice(0, max))
      },
      fail: () => {},
    })
  }

  const handleRemove = (id: number) => {
    onChange(value.filter((f) => f.id !== id))
  }

  return (
    <View className='photo-upload'>
      {value.map((file) => (
        <View key={file.id} className='photo-upload__item'>
          <Image className='photo-upload__img' src={file.tempFilePath} mode='aspectFill' />
          <View className='photo-upload__remove' onClick={() => handleRemove(file.id)}>
            <Text className='photo-upload__remove-text'>×</Text>
          </View>
        </View>
      ))}

      {value.length < max && (
        <View className='photo-upload__add' onClick={handleAdd}>
          <Text className='photo-upload__add-icon'>+</Text>
          <Text className='photo-upload__add-count'>{value.length}/{max}</Text>
        </View>
      )}
    </View>
  )
}
