import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface ReverseGeocodeResult {
  provider: 'amap' | 'tencent';
  formattedAddress: string;
  province?: string;
  city?: string;
  district?: string;
}

@Injectable()
export class GeoService {
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('纬度不合法');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('经度不合法');
    }

    const provider = (process.env.GEO_PROVIDER || '').toLowerCase();
    if (provider === 'tencent') {
      return this.reverseByTencent(latitude, longitude);
    }

    if (process.env.AMAP_WEB_SERVICE_KEY) {
      return this.reverseByAmap(latitude, longitude);
    }
    if (process.env.TENCENT_MAP_KEY) {
      return this.reverseByTencent(latitude, longitude);
    }

    throw new ServiceUnavailableException('未配置地图服务 Key');
  }

  private async reverseByAmap(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const key = process.env.AMAP_WEB_SERVICE_KEY;
    if (!key) throw new ServiceUnavailableException('未配置高德地图 Key');

    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('key', key);
    url.searchParams.set('location', `${longitude},${latitude}`);
    url.searchParams.set('extensions', 'base');
    url.searchParams.set('radius', '1000');
    url.searchParams.set('output', 'JSON');

    const res = await fetch(url);
    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body || body.status !== '1' || !body.regeocode?.formatted_address) {
      throw new ServiceUnavailableException(body?.info || '高德地图逆地理编码失败');
    }

    const component = body.regeocode.addressComponent || {};
    return {
      provider: 'amap',
      formattedAddress: body.regeocode.formatted_address,
      province: component.province,
      city: Array.isArray(component.city) ? undefined : component.city,
      district: component.district,
    };
  }

  private async reverseByTencent(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const key = process.env.TENCENT_MAP_KEY;
    if (!key) throw new ServiceUnavailableException('未配置腾讯地图 Key');

    const url = new URL('https://apis.map.qq.com/ws/geocoder/v1/');
    url.searchParams.set('key', key);
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('get_poi', '0');
    url.searchParams.set('coord_type', '1');

    const res = await fetch(url);
    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body || body.status !== 0 || !body.result?.address) {
      throw new ServiceUnavailableException(body?.message || '腾讯地图逆地理编码失败');
    }

    const component = body.result.address_component || {};
    return {
      provider: 'tencent',
      formattedAddress: body.result.address,
      province: component.province,
      city: component.city,
      district: component.district,
    };
  }
}
