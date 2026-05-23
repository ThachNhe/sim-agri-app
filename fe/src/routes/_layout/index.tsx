import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BellRing, Leaf, MapPin, Radio, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'
import { cn } from '@/lib/utils'
import { useAlertSummary, useAlerts } from '@/hooks/useAlerts'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useLatestReadings, useReadings } from '@/hooks/useReadings'
import { useSensors } from '@/hooks/useSensors'
import { useZones } from '@/hooks/useZones'
import { useAdminZones } from '@/hooks/useAdminZones'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/useAuthStore'
import { SENSOR_LABEL } from '@/types/common.types'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const Route = createFileRoute('/_layout/')({
  component: DashboardPage,
})

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const { data: usersRes, isLoading: isFarmersLoading } = useUsers(Boolean(isAdmin))
  const farmers = usersRes?.data || []
  const [selectedFarmId, setSelectedFarmId] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    if (farmers.length === 0) { if (selectedFarmId) setSelectedFarmId(''); return }
    if (!selectedFarmId || !farmers.some(f => f.id === selectedFarmId)) setSelectedFarmId(farmers[0].id)
  }, [farmers, isAdmin, selectedFarmId])

  const canLoadFarmData = !isAdmin || Boolean(selectedFarmId)
  const ownerId = isAdmin ? selectedFarmId || undefined : undefined

  const { data: summaryRes } = useDashboardSummary(ownerId, canLoadFarmData)
  const summary = summaryRes?.data

  // Zones for zone-health grid
  const { data: adminZonesRes } = useAdminZones(isAdmin && canLoadFarmData)
  const { data: farmerZonesRes } = useZones(!isAdmin && canLoadFarmData)
  const allAdminZones = adminZonesRes?.data || []
  const zones = isAdmin
    ? allAdminZones.filter(z => z.assigned_farmers.some(f => f.id === ownerId))
    : (farmerZonesRes?.data || [])

  // Alert summary for farmer
  const { data: alertSummaryRes } = useAlertSummary(undefined, !isAdmin)
  const alertSummary = alertSummaryRes?.data
  const { data: recentAlertsRes } = useAlerts(undefined, !isAdmin, 3)
  const recentAlerts = recentAlertsRes?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-border/50 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            {isAdmin ? 'Admin mode' : 'Farmer mode'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Dashboard hệ thống' : 'Dashboard nông trại'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Tổng quan trạng thái khu vực và cảm biến của từng farmer.'
              : 'Theo dõi thông số môi trường và trạng thái tăng trưởng cây trồng.'}
          </p>
        </div>
        {isAdmin && (
          <FarmSelectCard
            farms={farmers}
            value={selectedFarmId}
            onValueChange={setSelectedFarmId}
            title="Chọn farmer"
            description="Mọi số liệu bên dưới sẽ thay đổi theo farmer được chọn."
            placeholder="Chọn một farmer..."
            emptyMessage="Chưa có farmer nào trong hệ thống."
            loadingMessage="Đang tải danh sách farmer..."
            isLoading={isFarmersLoading}
            className="w-full xl:max-w-md"
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Khu vực trồng" value={canLoadFarmData && summary ? summary.total_zones : '--'} icon={<MapPin className="h-4 w-4 text-green-500" />} />
        <SummaryCard title="Khu vực hoạt động" value={canLoadFarmData && summary ? summary.active_zones : '--'} icon={<Leaf className="h-4 w-4 text-emerald-500" />} />
        <SummaryCard title="Tổng cảm biến" value={canLoadFarmData && summary ? summary.total_sensors : '--'} icon={<Radio className="h-4 w-4 text-sky-500" />} />
        <SummaryCard title="Cảnh báo hôm nay" value={canLoadFarmData && summary ? summary.alerts_today : '--'} icon={<BellRing className="h-4 w-4 text-amber-500" />} />
        <SummaryCard title="Cảnh báo nghiêm trọng" value={canLoadFarmData && summary ? summary.high_severity_alerts : '--'} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
      </div>

      {/* Zone health + Sensor chart */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        {/* Zone health grid */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Trạng thái khu vực ({zones.length})</h3>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-muted-foreground">
              <MapPin className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">{canLoadFarmData ? 'Chưa có khu vực nào.' : 'Chọn farmer để xem.'}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {zones.map(z => (
                <ZoneHealthCard key={z.id} zoneId={z.id} zoneName={z.name} plantName={z.plant_profile_id ?? ''} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {!isAdmin && (
            <>
              <AlertSummaryPanel alertSummary={alertSummary} recentAlerts={recentAlerts} />
            </>
          )}

          <SensorChartPanel ownerId={ownerId} canLoad={canLoadFarmData} />

          <div className="space-y-2">
            <Button asChild className="w-full justify-start gap-2">
              <Link to="/zones"><MapPin size={16} />{isAdmin ? 'Khu vực của farmer' : 'Khu vực của tôi'}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/alerts"><BellRing size={16} />{isAdmin ? 'Cảnh báo của farmer' : 'Cảnh báo của tôi'}</Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/users"><Users size={16} />Quản lý nông dân</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ZoneHealthCard({ zoneId, zoneName, plantName }: { zoneId: string; zoneName: string; plantName: string }) {
  const { data: readingsRes } = useLatestReadings(zoneId)
  const readings = readingsRes?.data || []

  return (
    <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{zoneName}</CardTitle>
          <Badge variant="outline" className="text-xs">{readings.length} cảm biến</Badge>
        </div>
        {plantName && <CardDescription className="text-xs">Cây: {plantName}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4" />
          <span>{readings.length > 0 ? `${readings.length} chỉ số mới nhất` : 'Chưa có dữ liệu'}</span>
        </div>
        <Button asChild variant="link" size="sm" className="mt-1 h-6 px-0 text-xs">
          <Link to="/sensors">Xem chi tiết →</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function SensorChartPanel({ ownerId, canLoad }: { ownerId: string | undefined; canLoad: boolean }) {
  const isAdmin = Boolean(ownerId !== undefined)
  const { data: adminZonesRes } = useAdminZones(isAdmin && canLoad)
  const { data: farmerZonesRes } = useZones(!isAdmin && canLoad)
  // For admin: filter all zones to only show zones assigned to selected farmer
  const allAdminZones = adminZonesRes?.data || []
  const farmerZones = isAdmin
    ? allAdminZones.filter(z => z.assigned_farmers.some(f => f.id === ownerId))
    : (farmerZonesRes?.data || [])
  const zones = farmerZones
  const [selectedZoneId, setSelectedZoneId] = useState('')

  useEffect(() => {
    if (zones.length > 0 && (!selectedZoneId || !zones.some(z => z.id === selectedZoneId)))
      setSelectedZoneId(zones[0].id)
  }, [zones, selectedZoneId])

  const { data: sensorsRes } = useSensors(selectedZoneId || undefined)
  const sensors = sensorsRes?.data || []
  const [selectedSensorId, setSelectedSensorId] = useState('')

  useEffect(() => {
    if (sensors.length > 0 && (!selectedSensorId || !sensors.some(s => s.id === selectedSensorId)))
      setSelectedSensorId(sensors[0].id)
  }, [sensors, selectedSensorId])

  const [date, setDate] = useState(getTodayInputValue())
  const { data: readingsRes, isLoading } = useReadings(selectedSensorId || undefined, date)
  const readings = readingsRes?.data || []

  const sensor = sensors.find(s => s.id === selectedSensorId)

  const chartData = useMemo(() =>
    readings.map(r => ({
      time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: r.value,
    })), [readings])

  return (
    <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Biểu đồ cảm biến</CardTitle>
        <div className="flex flex-wrap gap-2 mt-1">
          {zones.length > 0 && (
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Khu vực..." /></SelectTrigger>
              <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {sensors.length > 0 && (
            <Select value={selectedSensorId} onValueChange={setSelectedSensorId}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Cảm biến..." /></SelectTrigger>
              <SelectContent>{sensors.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({SENSOR_LABEL[s.sensor_type]})</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-xs w-34" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-36 items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-muted-foreground text-sm">Không có dữ liệu.</div>
        ) : (
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={30} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }}
                  label={{ value: sensor?.unit ?? '', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 10 } }} />
                <Tooltip formatter={(value) => [`${value ?? ''} ${sensor?.unit ?? ''}`, sensor ? SENSOR_LABEL[sensor.sensor_type] : '']} />
                <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AlertSummaryPanel({ alertSummary, recentAlerts }: {
  alertSummary: { total_alerts: number; read_alerts: number; unread_alerts: number } | undefined
  recentAlerts: Array<{ id: string; message: string; is_read: boolean; triggered_at: string; severity?: string }>
}) {
  return (
    <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Cảnh báo của tôi</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link to="/alerts">Xem tất cả</Link>
          </Button>
        </div>
        {alertSummary && (
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>Tổng: <b className="text-foreground">{alertSummary.total_alerts}</b></span>
            <span>Chưa đọc: <b className="text-destructive">{alertSummary.unread_alerts}</b></span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {recentAlerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có cảnh báo mới.</p>
        ) : (
          recentAlerts.map(a => (
            <div key={a.id} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2', a.is_read ? 'bg-card/30 border-border/30' : 'bg-destructive/5 border-destructive/20')}>
              <BellRing className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', a.is_read ? 'text-muted-foreground' : 'text-destructive')} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{a.message}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(a.triggered_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
              </div>
              {!a.is_read && <span className="text-[10px] rounded-full bg-destructive/15 px-1.5 py-0.5 text-destructive font-medium shrink-0">Mới</span>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm border-border/50 bg-card/60 backdrop-blur transition-all hover:shadow-md hover:bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 bg-background/50 rounded-full">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}
