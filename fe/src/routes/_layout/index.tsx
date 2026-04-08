import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cpu, BellRing, Droplet, ThermometerSun, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useDevices } from '@/hooks/useDevices'
import { useUsers } from '@/hooks/useUsers'
import { useReadings } from '@/hooks/useReadings'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_layout/')({
  component: DashboardPage,
})

function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const { data: summaryRes } = useDashboardSummary()
  const summary = summaryRes?.data

  const { data: devicesRes } = useDevices()
  const devices = devicesRes?.data || []
  const { data: usersRes } = useUsers(Boolean(isAdmin))

  const totalUsers = usersRes?.data?.length || 0
  const activeDevices = useMemo(() => devices.filter(d => d.is_active), [devices])

  const sensorDevices = useMemo(() => devices.filter(d => d.type === 'sensor'), [devices])
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  useEffect(() => {
    if (!selectedDevice && sensorDevices.length > 0) {
      setSelectedDevice(sensorDevices[0].id)
    }
  }, [sensorDevices, selectedDevice])

  const { data: readingsRes } = useReadings(selectedDevice || undefined)
  const readings = readingsRes?.data || []

  const chartData = useMemo(() => {
    return readings.map(r => ({
      time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...r
    })).reverse() // Assuming backend might return oldest first or newest first, make sure it's chronological
  }, [readings])

  const activeDeviceCount = activeDevices.length
  const totalDeviceCount = summary?.total_devices ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-border/50 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            {isAdmin ? 'Admin mode' : 'Farmer mode'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Dashboard hệ thống' : 'Dashboard nông trại'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Giám sát tổng thể thiết bị, cảnh báo và tài khoản của toàn hệ thống.'
              : 'Theo dõi trạng thái thiết bị và cảnh báo thuộc trang trại của bạn.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Tổng Thiết Bị"
          value={summary?.total_devices ?? 0}
          icon={<Cpu className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          title="Thiết bị cảm biến"
          value={sensorDevices.length}
          icon={<Cpu className="h-4 w-4 text-sky-500" />}
        />
        <SummaryCard
          title="Cảnh báo hôm nay"
          value={summary?.alerts_today ?? 0}
          icon={<BellRing className="h-4 w-4 text-destructive" />}
        />
        <SummaryCard
          title="Nhiệt độ TB (24h)"
          value={summary?.avg_temperature ? `${summary.avg_temperature.toFixed(1)}°C` : '--'}
          icon={<ThermometerSun className="h-4 w-4 text-orange-500" />}
        />
        <SummaryCard
          title="Độ ẩm TB (24h)"
          value={summary?.avg_humidity ? `${summary.avg_humidity.toFixed(1)}%` : '--'}
          icon={<Droplet className="h-4 w-4 text-blue-500" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Biểu đồ Cảm Biến</CardTitle>
              <CardDescription>Dữ liệu 24 giờ qua</CardDescription>
            </div>
            {sensorDevices.length > 0 && (
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Chọn thiết bị..." />
                </SelectTrigger>
                <SelectContent>
                  {sensorDevices.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDevice ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Không có thiết bị cảm biến nào.
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
            <CardTitle>{isAdmin ? 'Trung tâm điều hành' : 'Lối tắt nông trại'}</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Các lối đi nhanh cho quản trị viên.'
                : 'Các hành động nhanh cho nông dân.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Tổng tài khoản' : 'Thiết bị đang hoạt động'}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {isAdmin ? totalUsers : `${activeDeviceCount}/${totalDeviceCount}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isAdmin
                  ? `Thiết bị đang hoạt động: ${activeDeviceCount}/${totalDeviceCount}`
                  : `Cảm biến đang theo dõi: ${sensorDevices.length}`}
              </p>
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full justify-start gap-2">
                <Link to="/devices">
                  <Cpu size={16} />
                  {isAdmin ? 'Mở quản lý thiết bị' : 'Xem thiết bị của tôi'}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/alerts">
                  <BellRing size={16} />
                  {isAdmin ? 'Xem cảnh báo hệ thống' : 'Xem cảnh báo của tôi'}
                </Link>
              </Button>

              {isAdmin && (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link to="/users">
                    <Users size={16} />
                    Quản lý người dùng
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
