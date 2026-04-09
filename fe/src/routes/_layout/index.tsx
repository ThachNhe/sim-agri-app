import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { BellRing, Cpu, Download, Droplet, ThermometerSun, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'
import { cn, formatDate, slugify } from '@/lib/utils'
import { useAlertSummary, useAlerts } from '@/hooks/useAlerts'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useDevices } from '@/hooks/useDevices'
import { useReadings } from '@/hooks/useReadings'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/useAuthStore'
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

type CsvCell = string | number | boolean | null | undefined

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function average(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function escapeCsvCell(value: CsvCell) {
  const normalized = value === null || value === undefined ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

function buildCsv(rows: CsvCell[][]) {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\ufeff', content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const shouldLoadFarmerPreview = !isAdmin
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
  const { data: alertSummaryRes } = useAlertSummary(undefined, shouldLoadFarmerPreview)
  const alertSummary = alertSummaryRes?.data
  const { data: recentAlertsRes } = useAlerts(undefined, shouldLoadFarmerPreview, 3)
  const recentAlerts = recentAlertsRes?.data || []
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

  const selectedSensorDevice = useMemo(
    () => sensorDevices.find(device => device.id === selectedDevice),
    [sensorDevices, selectedDevice],
  )

  const { data: readingsRes, isLoading: isReadingsLoading } = useReadings(
    selectedDevice || undefined,
    selectedDate,
  )
  const readings = readingsRes?.data || []

  const readingSummary = useMemo(() => {
    if (readings.length === 0) {
      return null
    }

    const temperatures = readings.map(reading => reading.temperature)
    const humidities = readings.map(reading => reading.humidity)
    const soilMoistures = readings
      .filter((reading): reading is typeof reading & { soil_moisture: number } => typeof reading.soil_moisture === 'number')
      .map(reading => reading.soil_moisture)

    return {
      count: readings.length,
      avgTemperature: average(temperatures),
      minTemperature: Math.min(...temperatures),
      maxTemperature: Math.max(...temperatures),
      avgHumidity: average(humidities),
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities),
      avgSoilMoisture: average(soilMoistures),
    }
  }, [readings])

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

  const handleDownloadReport = () => {
    if (!selectedSensorDevice) {
      return
    }

    const reportRows: CsvCell[][] = [
      ['Phần báo cáo', 'Giá trị'],
      ['Farm', isAdmin ? selectedFarmName : user?.name ?? 'Farm của tôi'],
      ['Thiết bị', selectedSensorDevice.name],
      ['Ngày', selectedDateLabel],
      ['Số bản ghi', readingSummary?.count ?? 0],
      ['Nhiệt độ TB (°C)', readingSummary?.avgTemperature?.toFixed(1) ?? '--'],
      ['Nhiệt độ thấp nhất (°C)', readingSummary ? readingSummary.minTemperature.toFixed(1) : '--'],
      ['Nhiệt độ cao nhất (°C)', readingSummary ? readingSummary.maxTemperature.toFixed(1) : '--'],
      ['Độ ẩm TB (%)', readingSummary?.avgHumidity?.toFixed(1) ?? '--'],
      ['Độ ẩm thấp nhất (%)', readingSummary ? readingSummary.minHumidity.toFixed(1) : '--'],
      ['Độ ẩm cao nhất (%)', readingSummary ? readingSummary.maxHumidity.toFixed(1) : '--'],
      ['Độ ẩm đất TB (%)', readingSummary?.avgSoilMoisture?.toFixed(1) ?? '--'],
      ['Cảnh báo chưa đọc', alertSummary?.unread_alerts ?? 0],
      [],
      ['Thời gian ghi nhận', 'Nhiệt độ (°C)', 'Độ ẩm (%)', 'Độ ẩm đất (%)'],
      ...readings.map(reading => [
        new Date(reading.recorded_at).toISOString(),
        reading.temperature.toFixed(1),
        reading.humidity.toFixed(1),
        reading.soil_moisture?.toFixed(1) ?? '',
      ]),
    ]

    const csvContent = buildCsv(reportRows)
    const fileName = `bao-cao-${selectedDate}-${slugify(selectedSensorDevice.name)}.csv`
    downloadTextFile(fileName, csvContent)
  }

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

            {!isAdmin && (
              <>
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Cảnh báo chưa đọc</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {alertSummary ? alertSummary.unread_alerts : '--'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {alertSummary
                      ? `Đã đọc ${alertSummary.read_alerts}/${alertSummary.total_alerts} cảnh báo`
                      : 'Đang tải số liệu cảnh báo...'}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Cảnh báo gần đây</p>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Link to="/alerts">Xem tất cả</Link>
                    </Button>
                  </div>

                  {recentAlerts.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Chưa có cảnh báo mới.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {recentAlerts.map(alert => (
                        <div
                          key={alert.id}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2"
                        >
                          <div className={cn('mt-0.5 rounded-full p-1.5', alert.is_read ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
                            <BellRing size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.triggered_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </p>
                          </div>
                          {!alert.is_read && (
                            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
                              Mới
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm text-muted-foreground">Báo cáo nhanh</p>
                      <p className="text-base font-semibold">Xuất CSV cho thiết bị đang chọn</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSensorDevice && readingSummary
                          ? `${selectedSensorDevice.name} · ${readingSummary.count} bản ghi · ${selectedDateLabel}`
                          : 'Chọn thiết bị để tạo báo cáo.'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleDownloadReport}
                      disabled={!selectedSensorDevice || readings.length === 0}
                    >
                      <Download size={16} />
                      Xuất CSV
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>T. độ TB: {readingSummary?.avgTemperature?.toFixed(1) ?? '--'}°C</div>
                    <div>Độ ẩm TB: {readingSummary?.avgHumidity?.toFixed(1) ?? '--'}%</div>
                    <div>Độ ẩm đất TB: {readingSummary?.avgSoilMoisture?.toFixed(1) ?? '--'}%</div>
                    <div>Cảnh báo chưa đọc: {alertSummary?.unread_alerts ?? 0}</div>
                  </div>
                </div>
              </>
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
