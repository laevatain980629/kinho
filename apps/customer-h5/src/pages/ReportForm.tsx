import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Button, TextField, Label, Input, TextArea, FieldError, Spinner } from '@heroui/react';
import { ImagePlus, LocateFixed, MapPin, X } from 'lucide-react';
import { reverseGeocode, submitRepairRequest } from '@/services/customer';

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const MAX_FAULT_PHOTOS = 3;
const MAX_IMAGE_SIZE = 1024 * 1024 * 4;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('图片读取失败'));
    image.src = dataUrl;
  });

  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

export default function ReportForm() {
  const navigate = useNavigate();
  const faultPhotoInputRef = useRef<HTMLInputElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [machineSerial, setMachineSerial] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [description, setDescription] = useState('');
  const [faultPhotos, setFaultPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ requestNo: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.customerName = '请输入联系人姓名';
    if (!/^1[3-9]\d{9}$/.test(phone)) errs.phone = '请输入正确的手机号';
    if (!machineSerial.trim()) errs.machineSerial = '请输入设备编号';
    if (description.length < 10) errs.description = '故障描述至少 10 个字';
    if (!address.trim()) errs.address = '请输入服务地址';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setSubmitError('');
    try {
      const result = await submitRepairRequest({
        customerName,
        phone,
        machineSerial,
        machineModel,
        description,
        address,
        faultPhotos,
        latitude: location?.latitude,
        longitude: location?.longitude,
        locationAccuracy: location?.accuracy,
      });
      setSuccess(result);
    } catch (err: any) {
      setSubmitError(err?.message || '提交失败，请稍后重试');
    } finally { setLoading(false); }
  };

  const handleFaultPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (faultPhotoInputRef.current) faultPhotoInputRef.current.value = '';
    if (files.length === 0) return;

    setPhotoError('');
    const slots = MAX_FAULT_PHOTOS - faultPhotos.length;
    if (slots <= 0) {
      setPhotoError(`最多上传 ${MAX_FAULT_PHOTOS} 张故障照片`);
      return;
    }

    const nextPhotos: string[] = [];
    for (const file of files.slice(0, slots)) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('只能上传图片文件');
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setPhotoError('单张图片不能超过 4MB');
        continue;
      }
      try {
        nextPhotos.push(await compressImage(file));
      } catch {
        setPhotoError('图片处理失败，请重新选择');
      }
    }

    if (nextPhotos.length > 0) {
      setFaultPhotos((current) => [...current, ...nextPhotos].slice(0, MAX_FAULT_PHOTOS));
    }
  };

  const removeFaultPhoto = (index: number) => {
    setFaultPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPhotoError('');
  };

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('当前浏览器不支持定位，请手动填写服务地址');
      return;
    }

    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null,
        };
        const coordinateText = `${nextLocation.latitude}, ${nextLocation.longitude}${
          nextLocation.accuracy ? `（精度约 ${nextLocation.accuracy} 米）` : ''
        }`;

        let locationText = `当前位置：${coordinateText}`;
        try {
          const geocode = await reverseGeocode(nextLocation.latitude, nextLocation.longitude);
          locationText = `${geocode.formattedAddress}\n当前位置：${coordinateText}`;
        } catch (err: any) {
          setLocationError(`已获取坐标，地址解析暂不可用：${err?.message || '请检查地图服务配置'}`);
        }

        setLocation(nextLocation);
        setAddress((current) => {
          const trimmed = current.trim();
          if (!trimmed) return locationText;
          if (trimmed.includes('当前位置：')) return trimmed.replace(/当前位置：.*$/s, locationText);
          return `${trimmed}\n${locationText}`;
        });
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? '定位权限被拒绝，请允许浏览器访问位置或手动填写地址'
            : error.code === error.TIMEOUT
              ? '定位超时，请重试或手动填写地址'
              : '定位失败，请检查网络和定位权限';
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const resetForm = () => {
    setSuccess(null); setCustomerName(''); setPhone(''); setMachineSerial(''); setMachineModel(''); setDescription(''); setFaultPhotos([]); setPhotoError(''); setAddress(''); setLocation(null); setLocationError(''); setErrors({});
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <Card.Content className="flex flex-col items-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
              <svg className="h-8 w-8 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold">报修成功</h1>
            <div className="mt-2 rounded-xl bg-[var(--surface-secondary)] px-4 py-3">
              <p className="text-sm text-[var(--muted)]">工单编号</p>
              <p className="mt-1 text-lg font-bold text-[var(--accent)]">{success.requestNo}</p>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">工作人员会尽快联系您</p>
            <div className="mt-6 flex w-full gap-3">
              <Button variant="secondary" className="flex-1" onPress={() => navigate('/query')}>查看进度</Button>
              <Button variant="primary" className="flex-1" onPress={resetForm}>继续报修</Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8">
      <div className="mb-8 text-center pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.2 280))' }}>
          MG
        </div>
        <h1 className="text-xl font-bold">在线报修</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">填写以下信息，我们将尽快为您安排维修</p>
      </div>

      <div className="mx-auto max-w-md space-y-3">
        <Card>
          <Card.Content className="p-4">
            <TextField value={customerName} onChange={setCustomerName} isInvalid={!!errors.customerName}>
              <Label>联系人 *</Label>
              <Input placeholder="请输入您的姓名" />
              <FieldError>{errors.customerName}</FieldError>
            </TextField>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <TextField value={phone} onChange={setPhone} isInvalid={!!errors.phone}>
              <Label>联系电话 *</Label>
              <Input placeholder="请输入手机号" type="tel" inputMode="numeric" />
              <FieldError>{errors.phone}</FieldError>
            </TextField>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <TextField value={machineSerial} onChange={setMachineSerial} isInvalid={!!errors.machineSerial}>
              <Label>设备编号 *</Label>
              <Input placeholder="请输入设备编号" />
              <FieldError>{errors.machineSerial}</FieldError>
            </TextField>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <TextField value={machineModel} onChange={setMachineModel}>
              <Label>设备型号</Label>
              <Input placeholder="请输入设备型号" />
            </TextField>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <TextField value={description} onChange={setDescription} isInvalid={!!errors.description}>
              <Label>故障描述 *</Label>
              <TextArea placeholder="请详细描述故障现象（至少 10 个字）" />
              <FieldError>{errors.description}</FieldError>
            </TextField>
            <div className="mt-1 text-right text-xs text-[var(--muted)]">{description.length}/200</div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">故障图片</span>
                <span className="text-xs text-[var(--muted)]">{faultPhotos.length}/{MAX_FAULT_PHOTOS}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {faultPhotos.map((photo, index) => (
                  <div key={`${photo.slice(0, 24)}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]">
                    <img src={photo} alt={`故障图片 ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                      onClick={() => removeFaultPhoto(index)}
                      aria-label="删除故障图片"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {faultPhotos.length < MAX_FAULT_PHOTOS ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-20 w-20 flex-col gap-1 border border-dashed border-[var(--border)]"
                    onPress={() => faultPhotoInputRef.current?.click()}
                  >
                    <ImagePlus className="size-5 text-[var(--muted)]" />
                    <span className="text-xs text-[var(--muted)]">上传</span>
                  </Button>
                ) : null}
              </div>
              <input
                ref={faultPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFaultPhotoChange}
              />
              {photoError ? <p className="mt-2 text-xs text-[var(--danger)]">{photoError}</p> : null}
              <p className="mt-2 text-xs text-[var(--muted)]">最多 3 张，单张不超过 4MB。</p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <TextField value={address} onChange={setAddress} isInvalid={!!errors.address}>
              <Label>服务地址 *</Label>
              <TextArea placeholder="请输入详细地址，或点击下方按钮自动获取当前位置" />
              <FieldError>{errors.address}</FieldError>
            </TextField>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={handleLocate}
                isDisabled={locating}
              >
                {locating ? <Spinner size="sm" /> : <LocateFixed className="size-4" />}
                {locating ? '定位中...' : '获取当前位置'}
              </Button>
              {location ? (
                <span className="flex min-w-0 items-center gap-1 text-xs text-[var(--success)]">
                  <MapPin className="size-3.5 flex-shrink-0" />
                  <span className="truncate">{location.latitude}, {location.longitude}</span>
                </span>
              ) : null}
            </div>
            {locationError ? <p className="mt-2 text-xs text-[var(--danger)]">{locationError}</p> : null}
          </Card.Content>
        </Card>

        {submitError && (
          <div className="mt-3 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">{submitError}</div>
        )}

        <Button variant="primary" fullWidth size="lg" onPress={handleSubmit} isDisabled={loading} className="mt-4 h-12 text-base font-semibold">
          {loading ? <span className="flex items-center gap-2"><Spinner size="sm" />提交中...</span> : '提交报修'}
        </Button>

        <p className="text-center text-xs text-[var(--muted)]">
          已有工单？<button onClick={() => navigate('/query')} className="ml-0.5 text-[var(--accent)] underline">查询进度</button>
        </p>
      </div>
    </div>
  );
}
