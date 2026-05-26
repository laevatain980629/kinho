import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import PhotoUpload, { TaroAttachment } from '../../components/PhotoUpload'
import { useSignInForm } from '@kinho/shared-hooks'
import './index.scss'

export default function SignIn() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const workOrderId = Number(params.id) || 0
  const { location, setLocation, note, setNote, photoCount, setPhotoCount, isValid, buildPayload } = useSignInForm(workOrderId)
  const [sitePhotos, setSitePhotos] = useState<TaroAttachment[]>([])

  const handlePhotoChange = (photos: TaroAttachment[]) => {
    setSitePhotos(photos)
    setPhotoCount(photos.length)
  }

  const handleGetLocation = () => {
    Taro.getLocation({
      type: 'gcj02',
      success: (res) => {
        setLocation(`${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`)
      },
      fail: () => {
        setLocation('广州市天河区XX路XX号') // fallback
      },
    })
  }

  const handleSignIn = () => {
    if (!isValid) return
    buildPayload()
    Taro.navigateBack()
  }

  return (
    <View className='sign-in'>
      <PageHeader title='现场签到' />
      <View className='sign-in__body'>
        {/* Location */}
        <View className='sign-in__card'>
          <View className='sign-in__loc-row'>
            <View className='sign-in__loc-icon'>📍</View>
            <View className='sign-in__loc-info'>
              <Text className='sign-in__loc-label'>当前位置</Text>
              <Text className='sign-in__loc-value'>{location || '请点击定位获取位置'}</Text>
            </View>
            <View className='sign-in__loc-btn' onClick={handleGetLocation}>
              <Text className='sign-in__loc-btn-text'>定位</Text>
            </View>
          </View>
        </View>

        {/* Photos */}
        <View className='sign-in__card'>
          <Text className='sign-in__label'>📷 现场照片 <Text className='sign-in__required'>*</Text></Text>
          <PhotoUpload value={sitePhotos} onChange={handlePhotoChange} max={9} />
        </View>

        {/* Note */}
        <View className='sign-in__card'>
          <Text className='sign-in__label'>签到备注</Text>
          <textarea className='sign-in__textarea' value={note} placeholder='请输入备注信息' onInput={(e: any) => setNote(e.detail.value)} />
        </View>

        <View className={`sign-in__submit ${!isValid ? 'sign-in__submit--disabled' : ''}`} onClick={handleSignIn}>
          <Text className='sign-in__submit-text'>确认签到</Text>
        </View>
      </View>
    </View>
  )
}
