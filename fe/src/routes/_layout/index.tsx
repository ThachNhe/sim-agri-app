import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { BellRing, Cpu, Droplet, ThermometerSun, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useDevices } from '@/hooks/useDevices'
import { useReadings } from '@/hooks/useReadings'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/useAuthStore'
import { formatDate } from '@/lib/utils'
import {
  CartesianGrid,
  Legend,
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
    if (!isAdmin) {
      return
    }

    if (farmers.length === 0) {
      if (selectedFarmId) {
        setSelectedFarmId('')
      }
      return
    }

    if (!selectedFarmId || !farmers.some(farm => farm.id === selectedFarmId)) {
      setSelectedFarmId(farmers[0].id)
    }
  }, [farmers, isAdmin, selectedFarmId])

  const selectedFarm = useMemo(
    () => farmers.find(farm => farm.id === selectedFarmId),
    [farmers, selectedFarmId],
  )

  const canLoadFarmData = !isAdmin || Boolean(selectedFarmId)
  const dashboardOwnerId = isAdmin ? selectedFarmId || undefined : undefined

  const { data: summaryRes } = useDashboardSummary(dashboardOwnerId, canLoadFarmData)
  const summary = summaryRes?.data

  const { data: devicesRes } = useDevices(dashboardOwnerId, canLoadFarmData)
  const devices = devicesRes?.data || []
  const activeDevices = useMemo(() => devices.filter(d => d.is_active), [devices])

  const sensorDevices = useMemo(() => devices.filter(d => d.type === 'sensor'), [devices])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(getTodayInputValue())

  useEffect(() => {
    if (sensorDevices.length === 0) {
      if (selectedDevice) {
        setSelectedDevice('')
      }
      return
    }

    if (!selectedDevice || !sensorDevices.some(device => device.id === selectedDevice)) {
      setSelectedDevice(sensorDevices[0].id)
    }
  }, [sensorDevices, selectedDevice])

  const { data: readingsRes, isLoading: isReadingsLoading } = useReadings(
    selectedDevice || undefined,
    selectedDate,
  )
  const readings = readingsRes?.data || []

  const chartData = useMemo(() => {
    return readings
      .slice()
      .sort(
        (left, right) =>
          new Date(left.recorded_at).getTime() - new Date(right.recorded_at).getTime(),
      )
      .map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        ...r,
      }))
  }, [readings])

  const selectedDateLabel = useMemo(
    () => formatDate(new Date(`${selectedDate}T00:00:00`)),
    [selectedDate],
  )

  const activeDeviceCount = activeDevices.length
  const selectedFarmName = selectedFarm?.name ?? 'Chưa chọn farm'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-border/50 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            {isAdmin ? 'Admin mode' : 'Farmer mode'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Dashboard theo farm' : 'Dashboard nông trại'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Chọn một farm để xem thống kê, thiết bị và cảnh báo tương ứng.'
              : 'Theo dõi trạng thái thiết bị và cảnh báo thuộc trang trại của bạn.'}
          </p>
        </div>

        {isAdmin && (
          <FarmSelectCard
            farms={farmers}
            value={selectedFarmId}
            onValueChange={setSelectedFarmId}
            title="Chọn farm"
            description="Mọi số liệu bên dưới sẽ thay đổi theo farm được chọn."
            placeholder="Chọn một farm..."
            emptyMessage="Chưa có farmer nào trong hệ thống."
            loadingMessage="Đang tải danh sách farmer..."
            isLoading={isFarmersLoading}
            className="w-full xl:max-w-md"
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Tổng Thiết Bị"
          value={canLoadFarmData && summary ? summary.total_devices : '--'}
          icon={<Cpu className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          title="Thiết bị cảm biến"
          value={canLoadFarmData && summary ? sensorDevices.length : '--'}
          icon={<Cpu className="h-4 w-4 text-sky-500" />}
        />
        <SummaryCard
          title="Cảnh báo hôm nay"
          value={canLoadFarmData && summary ? summary.alerts_today : '--'}
          icon={<BellRing className="h-4 w-4 text-destructive" />}
        />
        <SummaryCard
          title="Nhiệt độ TB (24h)"
          value={
            canLoadFarmData && summary && summary.avg_temperature !== null && summary.avg_temperature !== undefined
              ? `${summary.avg_temperature.toFixed(1)}°C`
              : '--'
          }
          icon={<ThermometerSun className="h-4 w-4 text-orange-500" />}
        />
        <SummaryCard
          title="Độ ẩm TB (24h)"
          value={
            canLoadFarmData && summary && summary.avg_humidity !== null && summary.avg_humidity !== undefined
              ? `${summary.avg_humidity.toFixed(1)}%`
              : '--'
          }
          icon={<Droplet className="h-4 w-4 text-blue-500" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-col gap-4 pb-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Biểu đồ Cảm Biến</CardTitle>
              <CardDescription>
                {canLoadFarmData
                  ? `Dữ liệu trong ngày ${selectedDateLabel}${isAdmin ? ` của ${selectedFarmName}` : ''}`
                  : 'Chọn farm để xem biểu đồ cảm biến.'}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-[180px]"
              />
              {sensorDevices.length > 0 && (
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Chọn thiết bị..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sensorDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!canLoadFarmData ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Chọn farm để xem biểu đồ và thiết bị.
              </div>
            ) : !selectedDevice ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Không có thiết bị cảm biến nào trong farm đã chọn.
              </div>
            ) : isReadingsLoading ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Đang tải dữ liệu cảm biến...
              </div>
            ) : readings.length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Không có dữ liệu cho ngày đã chọn.
              </div>
            ) : (
              <div className="mt-4 h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tickMargin={10} minTickGap={30} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" name="Nhiệt độ (°C)" dataKey="temperature" stroke="#FF7A00" strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" name="Độ ẩm (%)" dataKey="humidity" stroke="#00B2FF" strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" name="Độ ẩm đất (%)" dataKey="soil_moisture" stroke="#4ade80" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle>{isAdmin ? 'Farm đang xem' : 'Lối tắt nông trại'}</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Các hành động bên dưới áp dụng cho farm được chọn.'
                : 'Các hành động nhanh cho nông dân.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <>
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Nông trại</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{selectedFarmName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedFarm?.email ?? 'Hãy chọn farm để tải dữ liệu.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Thiết bị đang hoạt động</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {canLoadFarmData && summary ? `${activeDeviceCount}/${summary.total_devices}` : '--'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {canLoadFarmData
                      ? `Cảm biến đang theo dõi: ${sensorDevices.length}`
                      : 'Chọn farm để xem trạng thái thiết bị.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Thiết bị đang hoạt động</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {summary ? `${activeDeviceCount}/${summary.total_devices}` : '--'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {summary ? `Cảm biến đang theo dõi: ${sensorDevices.length}` : 'Đang tải số liệu...'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button asChild className="w-full justify-start gap-2">
                <Link to="/devices">
                  <Cpu size={16} />
                  {isAdmin ? 'Mở thiết bị của farm' : 'Xem thiết bị của tôi'}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/alerts">
                  <BellRing size={16} />
                  {isAdmin ? 'Xem cảnh báo của farm' : 'Xem cảnh báo của tôi'}
                </Link>
              </Button>

              {isAdmin && (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link to="/users">
                    <Users size={16} />
                    Quản lý nông dân
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
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
