import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice } from '@/hooks/useDevices'
import { useZones } from '@/hooks/useZones'
import { useAdminZones } from '@/hooks/useAdminZones'
import { useSensors } from '@/hooks/useSensors'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Fan,
  Flame,
  Gauge,
  Lightbulb,
  Pencil,
  Plus,
  Power,
  RadioTower,
  SlidersHorizontal,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Device, DeviceControlMode, DeviceType, GrowingZoneAdminResponse, SensorType } from '@/types/common.types'
import { DEVICE_CONTROL_LABEL, DEVICE_TYPE_LABEL, SENSOR_LABEL } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'

export const Route = createFileRoute('/_layout/devices')({
  component: DevicesPage,
})

const DEVICE_TYPE_OPTIONS: Array<{ value: DeviceType; icon: LucideIcon }> = [
  { value: 'pump', icon: Droplets },
  { value: 'light', icon: Lightbulb },
  { value: 'fan', icon: Fan },
  { value: 'heater', icon: Flame },
  { value: 'fertilizer_pump', icon: Gauge },
  { value: 'co2_injector', icon: Zap },
  { value: 'shade_net', icon: SlidersHorizontal },
  { value: 'valve', icon: RadioTower },
]

const CONTROL_OPTIONS: DeviceControlMode[] = ['on_off', 'percentage', 'multi_speed']
const STEPS = ['Loại thiết bị', 'Thông tin', 'Kết nối', 'Xác nhận']

function DevicesPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const { data: adminZonesRes, isLoading: isAdminZonesLoading } = useAdminZones(Boolean(isAdmin))
  const adminZones = adminZonesRes?.data || []
  const [selectedFarmId, setSelectedFarmId] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    if (adminZones.length === 0) {
      if (selectedFarmId) setSelectedFarmId('')
      return
    }
    if (!selectedFarmId || !adminZones.some(farm => farm.id === selectedFarmId)) {
      setSelectedFarmId(adminZones[0].id)
    }
  }, [adminZones, isAdmin, selectedFarmId])

  const selectedFarm = adminZones.find(farm => farm.id === selectedFarmId)
  const canLoadFarmData = !isAdmin || Boolean(selectedFarmId)

  const { data: res, isLoading } = useDevices(undefined, canLoadFarmData)
  const allDevices = res?.data || []
  const devices = isAdmin
    ? allDevices.filter(device => device.linked_zone_id === selectedFarmId)
    : allDevices
  const deleteDev = useDeleteDevice()

  const [isOpen, setIsOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

  const handleEdit = (device: Device) => {
    setEditingDevice(device)
    setIsOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      deleteDev.mutate(id, {
        onSuccess: () => toast.success('Đã xóa thiết bị!'),
      })
    }
  }

  return (
    <Dialog
      open={!isAdmin && isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setEditingDevice(null)
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {isAdmin ? 'Thống kê thiết bị theo farm' : 'Thiết bị điều khiển'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? `Theo dõi trạng thái thiết bị MQTT của farm ${selectedFarm?.name ?? 'được chọn'}, không thao tác điều khiển.`
                : 'Quản lý thiết bị MQTT, liên kết cảm biến và trạng thái tự động.'}
            </p>
          </div>

          {isAdmin ? (
            <FarmFilterCard
              farms={adminZones}
              value={selectedFarmId}
              onValueChange={setSelectedFarmId}
              title="Chọn farm"
              description="Thống kê thiết bị sẽ lọc theo farm/khu vực này."
              placeholder="Chọn một farm..."
              emptyMessage="Chưa có farm nào trong hệ thống."
              loadingMessage="Đang tải danh sách farm..."
              isLoading={isAdminZonesLoading}
              className="w-full md:max-w-md"
            />
          ) : (
            <Button
              className="w-full gap-2 md:w-auto"
              onClick={() => {
                setEditingDevice(null)
                setIsOpen(true)
              }}
            >
              <Plus size={16} /> Thêm thiết bị
            </Button>
          )}
        </div>

        {!isAdmin && (
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-4xl">
            <DeviceWizard device={editingDevice} onSuccess={() => setIsOpen(false)} />
          </DialogContent>
        )}

        {isAdmin && (
          <AdminDeviceStats devices={devices} selectedFarm={selectedFarm} />
        )}

        <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 sm:p-4 md:hidden">
              {!canLoadFarmData ? (
                <EmptyState text="Chọn farm để xem thiết bị." />
              ) : isLoading ? (
                <EmptyState text="Đang tải..." />
              ) : devices.length === 0 ? (
                <EmptyState text="Không có thiết bị nào" />
              ) : devices.map(device => isAdmin ? (
                <AdminDeviceMobileCard key={device.id} device={device} />
              ) : (
                <DeviceMobileCard
                  key={device.id}
                  device={device}
                  onEdit={() => handleEdit(device)}
                  onDelete={() => handleDelete(device.id)}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Tên thiết bị</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Cảm biến trigger</TableHead>
                    <TableHead>MQTT</TableHead>
                    <TableHead>Kết nối</TableHead>
                    <TableHead>{isAdmin ? 'Trạng thái' : 'Điều khiển'}</TableHead>
                    {!isAdmin && <TableHead className="text-right">Hành động</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!canLoadFarmData ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 7} className="text-center py-8 text-muted-foreground">
                        Chọn farm để xem thiết bị.
                      </TableCell>
                    </TableRow>
                  ) : isLoading ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 7} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
                  ) : devices.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 7} className="text-center py-8 text-muted-foreground">Không có thiết bị nào</TableCell></TableRow>
                  ) : devices.map(device => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="font-medium">{device.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{device.location}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline">{DEVICE_TYPE_LABEL[device.type]}</Badge>
                          <span className="text-xs text-muted-foreground">{DEVICE_CONTROL_LABEL[device.control_mode]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[12rem] truncate text-sm">{device.linked_sensor_name || '—'}</div>
                        {device.linked_sensor_type && (
                          <div className="text-xs text-muted-foreground">{SENSOR_LABEL[device.linked_sensor_type as SensorType]}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[13rem] truncate text-xs text-muted-foreground">{device.command_topic}</div>
                        <div className="max-w-[13rem] truncate text-xs text-muted-foreground">{device.state_topic}</div>
                      </TableCell>
                      <TableCell><ConnectionBadge device={device} /></TableCell>
                      <TableCell>{isAdmin ? <ReadonlyDeviceState device={device} /> : <DeviceControlWidget device={device} />}</TableCell>
                      {!isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(device)}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(device.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Dialog>
  )
}

function FarmFilterCard({
  farms,
  value,
  onValueChange,
  title,
  description,
  placeholder,
  emptyMessage,
  loadingMessage,
  isLoading = false,
  className,
}: {
  farms: GrowingZoneAdminResponse[]
  value: string
  onValueChange: (value: string) => void
  title: string
  description: string
  placeholder: string
  emptyMessage: string
  loadingMessage: string
  isLoading?: boolean
  className?: string
}) {
  return (
    <Card className={cn('border-border/50 bg-card/60 shadow-sm backdrop-blur', className)}>
      <div className="space-y-2 p-4">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        {isLoading ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
            {loadingMessage}
          </div>
        ) : farms.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {farms.map(farm => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  )
}

function AdminDeviceStats({ devices, selectedFarm }: { devices: Device[]; selectedFarm?: GrowingZoneAdminResponse }) {
  const online = devices.filter(device => device.connection_status === 'online').length
  const autoEnabled = devices.filter(device => device.automation_enabled).length
  const running = devices.filter(device => device.current_state === 'on' || device.current_value > 0).length

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <DeviceStatCard title="Tổng thiết bị" value={devices.length} description={selectedFarm?.name || 'Farm được chọn'} />
      <DeviceStatCard title="Online" value={online} description="Thiết bị đang báo kết nối" />
      <DeviceStatCard title="Có tự động hóa" value={autoEnabled} description="Đã liên kết rule cảm biến" />
      <DeviceStatCard title="Đang hoạt động" value={running} description="State ON hoặc slider > 0" />
    </div>
  )
}

function DeviceStatCard({ title, value, description }: { title: string; value: number | string; description: string }) {
  return (
    <Card className="border-border/50 bg-card/60 py-4 shadow-sm backdrop-blur">
      <CardContent className="px-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function DeviceMobileCard({
  device,
  onEdit,
  onDelete,
}: {
  device: Device
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{device.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{device.location}</p>
        </div>
        <ConnectionBadge device={device} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{DEVICE_TYPE_LABEL[device.type]}</Badge>
        <Badge variant={device.automation_enabled ? 'default' : 'secondary'}>
          {device.automation_enabled ? 'Auto' : 'Manual'}
        </Badge>
        {device.linked_sensor_name && (
          <span className="text-xs text-muted-foreground">Trigger: {device.linked_sensor_name}</span>
        )}
      </div>

      <div className="mt-4">
        <DeviceControlWidget device={device} compact />
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={onEdit}>
          <Pencil size={16} /> Sửa
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={16} /> Xóa
        </Button>
      </div>
    </div>
  )
}

function AdminDeviceMobileCard({ device }: { device: Device }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{device.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{device.location}</p>
        </div>
        <ConnectionBadge device={device} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{DEVICE_TYPE_LABEL[device.type]}</Badge>
        <Badge variant={device.automation_enabled ? 'default' : 'secondary'}>
          {device.automation_enabled ? 'Auto' : 'Manual'}
        </Badge>
        <ReadonlyDeviceState device={device} />
      </div>
      {device.linked_sensor_name && (
        <div className="mt-3 text-xs text-muted-foreground">Trigger: {device.linked_sensor_name}</div>
      )}
    </div>
  )
}

function ConnectionBadge({ device }: { device: Device }) {
  const isOnline = device.connection_status === 'online'
  const isConnecting = device.connection_status === 'connecting'
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        variant={isOnline ? 'default' : isConnecting ? 'outline' : 'secondary'}
        className={cn(isOnline && 'bg-emerald-600 hover:bg-emerald-600')}
      >
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? 'Online' : isConnecting ? 'Đang nối' : 'Offline'}
      </Badge>
      {device.last_seen_at && (
        <span className="text-[11px] text-muted-foreground">
          {new Date(device.last_seen_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

function DeviceControlWidget({ device, compact = false }: { device: Device; compact?: boolean }) {
  const updateDev = useUpdateDevice()
  const isOn = device.current_state === 'on'

  const send = (nextState: string, nextValue: number, label: string) => {
    updateDev.mutate({
      id: device.id,
      data: {
        current_state: nextState,
        current_value: nextValue,
        connection_status: 'online',
        last_command: `MANUAL ${label}`,
      },
    })
  }

  if (device.control_mode === 'on_off') {
    return (
      <Button
        size="sm"
        variant={isOn ? 'default' : 'outline'}
        className={cn('min-w-24', isOn && 'bg-emerald-600 hover:bg-emerald-700')}
        onClick={() => send(isOn ? 'off' : 'on', isOn ? 0 : 1, isOn ? 'OFF' : 'ON')}
        disabled={updateDev.isPending}
      >
        <Power className="h-4 w-4" />
        {isOn ? 'Đang bật' : 'Đang tắt'}
      </Button>
    )
  }

  const max = device.control_mode === 'multi_speed' ? 3 : 100
  const value = Math.min(max, Math.max(0, Math.round(device.current_value || 0)))
  const label = device.control_mode === 'multi_speed' ? `Tốc độ ${value}` : `${value}%`

  return (
    <div className={cn('space-y-1', compact ? 'w-full' : 'w-36')}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{DEVICE_CONTROL_LABEL[device.control_mode]}</span>
        <span className="font-medium">{label}</span>
      </div>
      <Input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={e => {
          const next = Number(e.target.value)
          send(next > 0 ? 'on' : 'off', next, device.control_mode === 'multi_speed' ? `SPEED ${next}` : `SET ${next}%`)
        }}
        disabled={updateDev.isPending}
        className="h-8 px-0"
      />
    </div>
  )
}

function ReadonlyDeviceState({ device }: { device: Device }) {
  if (device.control_mode === 'on_off') {
    const isOn = device.current_state === 'on'
    return (
      <Badge variant={isOn ? 'default' : 'secondary'} className={cn(isOn && 'bg-emerald-600 hover:bg-emerald-600')}>
        {isOn ? 'Đang bật' : 'Đang tắt'}
      </Badge>
    )
  }

  const value = Math.round(device.current_value || 0)
  return (
    <div className="w-32">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{DEVICE_CONTROL_LABEL[device.control_mode]}</span>
        <span className="font-medium">{device.control_mode === 'multi_speed' ? `Tốc độ ${value}` : `${value}%`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${device.control_mode === 'multi_speed' ? (value / 3) * 100 : value}%` }}
        />
      </div>
    </div>
  )
}

type DeviceFormState = {
  name: string
  location: string
  type: DeviceType
  control_mode: DeviceControlMode
  power_watt: string
  zone_id: string
  linked_sensor_id: string
  automation_enabled: boolean
  command_topic: string
  state_topic: string
  qos: string
  timeout_seconds: string
  payload_on: string
  payload_off: string
}

function buildInitialForm(device: Device | null): DeviceFormState {
  return {
    name: device?.name || '',
    location: device?.location || '',
    type: device?.type || 'pump',
    control_mode: device?.control_mode || 'on_off',
    power_watt: device?.power_watt != null ? String(device.power_watt) : '',
    zone_id: device?.linked_zone_id || '',
    linked_sensor_id: device?.linked_sensor_id || '',
    automation_enabled: device?.automation_enabled ?? true,
    command_topic: device?.command_topic || '',
    state_topic: device?.state_topic || '',
    qos: device?.qos != null ? String(device.qos) : '1',
    timeout_seconds: device?.timeout_seconds != null ? String(device.timeout_seconds) : '10',
    payload_on: device?.payload_on || '{"cmd":"ON"}',
    payload_off: device?.payload_off || '{"cmd":"OFF"}',
  }
}

function DeviceWizard({ device, onSuccess }: { device: Device | null; onSuccess: () => void }) {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const createDev = useCreateDevice()
  const updateDev = useUpdateDevice()
  const { data: farmerZonesRes } = useZones(!isAdmin)
  const { data: adminZonesRes } = useAdminZones(Boolean(isAdmin))
  const zones = useMemo(() => {
    if (!isAdmin) return farmerZonesRes?.data || []
    return adminZonesRes?.data || []
  }, [adminZonesRes?.data, farmerZonesRes?.data, isAdmin])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DeviceFormState>(() => buildInitialForm(device))
  const { data: sensorsRes } = useSensors(form.zone_id || undefined, Boolean(form.zone_id))
  const sensors = sensorsRes?.data || []

  useEffect(() => {
    setStep(0)
    setForm(buildInitialForm(device))
  }, [device])

  useEffect(() => {
    if (form.zone_id || zones.length === 0 || device) return
    const firstZone = zones[0]
    setForm(f => ({
      ...f,
      zone_id: firstZone.id,
      location: f.location || firstZone.name,
    }))
  }, [device, form.zone_id, zones])

  const selectedZone = zones.find(z => z.id === form.zone_id)
  const linkedSensor = sensors.find(s => s.id === form.linked_sensor_id)

  const suggestedTopicBase = useMemo(() => {
    const zonePart = form.zone_id ? form.zone_id.slice(0, 8) : 'zone'
    const namePart = (form.name || DEVICE_TYPE_LABEL[form.type]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'device'
    return `farm/${zonePart}/${form.type}/${namePart}`
  }, [form.name, form.type, form.zone_id])

  const fillSuggestedTopics = () => {
    setForm(f => ({
      ...f,
      command_topic: `${suggestedTopicBase}/cmd`,
      state_topic: `${suggestedTopicBase}/state`,
    }))
  }

  const canContinue = (() => {
    if (step === 0) return Boolean(form.type && form.control_mode)
    if (step === 1) return Boolean(form.name && form.location && form.zone_id && form.linked_sensor_id)
    if (step === 2) return Boolean(form.command_topic && form.state_topic && form.qos && form.timeout_seconds)
    return true
  })()

  const payload = {
    name: form.name,
    location: form.location,
    type: form.type,
    control_mode: form.control_mode,
    power_watt: form.power_watt ? Number(form.power_watt) : undefined,
    linked_sensor_id: form.linked_sensor_id,
    automation_enabled: form.automation_enabled,
    command_topic: form.command_topic,
    state_topic: form.state_topic,
    qos: Number(form.qos) || 0,
    timeout_seconds: Number(form.timeout_seconds) || 10,
    payload_on: form.payload_on,
    payload_off: form.payload_off,
  }

  const handleSubmit = () => {
    if (device) {
      updateDev.mutate({ id: device.id, data: payload }, {
        onSuccess: () => {
          toast.success('Cập nhật thiết bị thành công')
          onSuccess()
        },
        onError: () => toast.error('Cập nhật thất bại'),
      })
      return
    }

    createDev.mutate(payload, {
      onSuccess: () => {
        toast.success('Thêm thiết bị thành công')
        onSuccess()
      },
      onError: () => toast.error('Thêm thiết bị thất bại'),
    })
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{device ? 'Sửa thiết bị điều khiển' : 'Thêm thiết bị điều khiển'}</DialogTitle>
      </DialogHeader>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={cn(
              'rounded-md border px-3 py-2 text-xs font-medium',
              index === step ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
              index < step && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
            )}
          >
            <div className="flex items-center gap-2">
              {index < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
              <span className="truncate">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-[25rem] py-5">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <Label>Loại thiết bị *</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {DEVICE_TYPE_OPTIONS.map(option => {
                  const Icon = option.icon
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={form.type === option.value ? 'default' : 'outline'}
                      className="h-16 justify-start"
                      onClick={() => setForm(f => ({ ...f, type: option.value }))}
                    >
                      <Icon className="h-4 w-4" />
                      {DEVICE_TYPE_LABEL[option.value]}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label>Kiểu điều khiển *</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {CONTROL_OPTIONS.map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    variant={form.control_mode === mode ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => setForm(f => ({ ...f, control_mode: mode }))}
                  >
                    {mode === 'on_off' ? <Power className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                    {DEVICE_CONTROL_LABEL[mode]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tên thiết bị *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Bơm tưới nhà kính A" />
            </div>
            <div className="space-y-2">
              <Label>Khu vực *</Label>
              <Select
                value={form.zone_id}
                onValueChange={v => {
                  const zone = zones.find(item => item.id === v)
                  setForm(f => ({
                    ...f,
                    zone_id: v,
                    location: f.location || zone?.name || '',
                    linked_sensor_id: '',
                  }))
                }}
              >
                <SelectTrigger><SelectValue placeholder="Chọn khu vực..." /></SelectTrigger>
                <SelectContent>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vị trí *</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="VD: Khu A - luống 1" />
            </div>
            <div className="space-y-2">
              <Label>Công suất</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={form.power_watt} onChange={e => setForm(f => ({ ...f, power_watt: e.target.value }))} />
                <span className="text-sm text-muted-foreground">W</span>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Liên kết cảm biến trigger *</Label>
              <Select value={form.linked_sensor_id} onValueChange={v => setForm(f => ({ ...f, linked_sensor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn cảm biến..." /></SelectTrigger>
                <SelectContent>
                  {sensors.map(sensor => (
                    <SelectItem key={sensor.id} value={sensor.id}>
                      {sensor.name} ({SENSOR_LABEL[sensor.sensor_type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-border/50 p-3 sm:col-span-2">
              <Checkbox
                checked={form.automation_enabled}
                onCheckedChange={checked => setForm(f => ({ ...f, automation_enabled: checked === true }))}
              />
              <span className="text-sm font-medium">Cho phép tự động điều khiển khi cảm biến vượt ngưỡng</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>MQTT topic</Label>
                <Button type="button" variant="outline" size="sm" onClick={fillSuggestedTopics}>
                  <RadioTower className="h-4 w-4" /> Tạo topic
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.command_topic} onChange={e => setForm(f => ({ ...f, command_topic: e.target.value }))} placeholder="Command topic" />
                <Input value={form.state_topic} onChange={e => setForm(f => ({ ...f, state_topic: e.target.value }))} placeholder="State topic" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>QoS</Label>
              <Select value={form.qos} onValueChange={v => setForm(f => ({ ...f, qos: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timeout</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={form.timeout_seconds} onChange={e => setForm(f => ({ ...f, timeout_seconds: e.target.value }))} />
                <span className="text-sm text-muted-foreground">giây</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payload bật / đặt giá trị</Label>
              <textarea
                value={form.payload_on}
                onChange={e => setForm(f => ({ ...f, payload_on: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Payload tắt</Label>
              <textarea
                value={form.payload_off}
                onChange={e => setForm(f => ({ ...f, payload_off: e.target.value }))}
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-border/60 p-4">
              <h3 className="text-sm font-semibold">Cấu hình thiết bị</h3>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <PreviewItem label="Tên" value={form.name} />
                <PreviewItem label="Loại" value={DEVICE_TYPE_LABEL[form.type]} />
                <PreviewItem label="Điều khiển" value={DEVICE_CONTROL_LABEL[form.control_mode]} />
                <PreviewItem label="Khu vực" value={selectedZone?.name || '—'} />
                <PreviewItem label="Cảm biến" value={linkedSensor ? `${linkedSensor.name} (${SENSOR_LABEL[linkedSensor.sensor_type]})` : '—'} />
                <PreviewItem label="Công suất" value={form.power_watt ? `${form.power_watt} W` : '—'} />
                <PreviewItem label="Command topic" value={form.command_topic} wide />
                <PreviewItem label="State topic" value={form.state_topic} wide />
                <PreviewItem label="QoS / timeout" value={`${form.qos} / ${form.timeout_seconds}s`} />
              </div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Trạng thái kết nối</h3>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <PreviewItem label="State topic" value={form.state_topic || '—'} />
                <PreviewItem label="Lệnh đầu tiên" value={form.control_mode === 'on_off' ? 'ON/OFF' : form.control_mode === 'percentage' ? 'SET 0-100%' : 'SPEED 0-3'} />
                <PreviewItem label="Tự động" value={form.automation_enabled ? 'Đang bật' : 'Tạm tắt'} />
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="items-center justify-between sm:justify-between">
        <Button type="button" variant="outline" onClick={step === 0 ? onSuccess : () => setStep(s => Math.max(0, s - 1))}>
          {step === 0 ? 'Hủy' : <><ChevronLeft className="h-4 w-4" /> Quay lại</>}
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={() => setStep(s => Math.min(3, s + 1))} disabled={!canContinue}>
            Tiếp tục <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={createDev.isPending || updateDev.isPending || !canContinue}>
            {device ? 'Lưu thay đổi' : 'Lưu thiết bị'}
          </Button>
        )}
      </DialogFooter>
    </div>
  )
}

function PreviewItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value || '—'}</div>
    </div>
  )
}
