import { apiGet, apiPost } from './api-client'

export interface RepairRequestData {
  customerName: string
  phone: string
  machineSerial: string
  machineModel?: string
  description: string
  address: string
  faultPhotos?: string[]
  latitude?: number
  longitude?: number
  locationAccuracy?: number | null
}

export interface ReverseGeocodeResult {
  provider: 'amap' | 'tencent'
  formattedAddress: string
  province?: string
  city?: string
  district?: string
}

function simpleHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

export async function submitRepairRequest(data: RepairRequestData) {
  const normalized = `${data.phone.trim()}|${data.machineSerial.trim().toUpperCase()}|${data.description.trim()}`
  return apiPost<{ requestNo: string }>('/customer-requests', {
    customerName: data.customerName,
    phone: data.phone,
    machineSerial: data.machineSerial,
    machineModel: data.machineModel?.trim() || undefined,
    faultDesc: data.description,
    faultPhotos: data.faultPhotos && data.faultPhotos.length > 0 ? JSON.stringify(data.faultPhotos) : undefined,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    locationAccuracy: data.locationAccuracy,
    submitFingerprint: simpleHash(normalized),
  })
}

export async function reverseGeocode(latitude: number, longitude: number) {
  return apiGet<ReverseGeocodeResult>('/geo/reverse', { latitude, longitude })
}
