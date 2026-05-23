import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useSensors, useCreateSensor, useDeleteSensor } from '@/hooks/useSensors'
import { useZones } from '@/hooks/useZones'
import { useAdminZones } from '@/hooks/useAdminZones'
import { useReadings } from '@/hooks/useReadings'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Radio, Trash2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SensorType } from '@/types/common.types'
import { SENSOR_LABEL, SENSOR_UNIT } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'

export const Route = createFileRoute('/_layout/sensors')({
    component: SensorsPage,
})

const SENSOR_TYPES: SensorType[] = ['temperature', 'humidity', 'soil_moisture', 'light', 'ph', 'ec', 'co2']

function getTodayValue() {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function SensorsPage() {
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

    const canLoad = !isAdmin || Boolean(selectedFarmId)
    const ownerId = isAdmin ? selectedFarmId || undefined : undefined

    const { data: adminZonesRes } = useAdminZones(isAdmin && canLoad)
    const { data: farmerZonesRes } = useZones(!isAdmin && canLoad)
    const allAdminZones = adminZonesRes?.data
    const farmerZones = farmerZonesRes?.data
    const zones = useMemo(
        () => isAdmin
            ? (allAdminZones || []).filter(z => z.assigned_farmers.some(f => f.id === ownerId))
            : (farmerZones || []),
        [allAdminZones, farmerZones, isAdmin, ownerId],
    )

    const [selectedZoneId, setSelectedZoneId] = useState('')
    useEffect(() => {
        if (zones.length > 0 && (!selectedZoneId || !zones.some(z => z.id === selectedZoneId)))
            setSelectedZoneId(zones[0].id)
    }, [zones, selectedZoneId])

    const { data: sensorsRes } = useSensors(selectedZoneId || undefined)
    const sensors = sensorsRes?.data || []

    const deleteSensor = useDeleteSensor()
    const [isOpen, setIsOpen] = useState(false)

    // Chart
    const [chartSensorId, setChartSensorId] = useState('')
    const [chartDate, setChartDate] = useState(getTodayValue())
    useEffect(() => {
        if (sensors.length > 0 && (!chartSensorId || !sensors.some(s => s.id === chartSensorId)))
            setChartSensorId(sensors[0].id)
    }, [sensors, chartSensorId])

    const { data: readingsRes, isLoading: isReadingsLoading } = useReadings(chartSensorId || undefined, chartDate)
    const readings = readingsRes?.data || []
    const chartSensor = sensors.find(s => s.id === chartSensorId)

    const chartData = useMemo(() =>
        readings.map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: r.value,
        })), [readings])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Cảm biến & Dữ liệu</h2>
                        <p className="text-muted-foreground mt-1">Theo dõi thông số môi trường từng khu vực theo thời gian thực.</p>
                    </div>

                    {isAdmin && (
                        <FarmSelectCard farms={farmers} value={selectedFarmId} onValueChange={setSelectedFarmId}
                            title="Chọn farmer" description="" placeholder="Chọn farmer..."
                            emptyMessage="Chưa có farmer." loadingMessage="Đang tải..." isLoading={isFarmersLoading} />
                    )}
                </div>

                {/* Zone selector */}
                {zones.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {zones.map(z => (
                            <Button key={z.id} size="sm" variant={selectedZoneId === z.id ? 'default' : 'outline'}
                                onClick={() => setSelectedZoneId(z.id)}>
                                {z.name}
                            </Button>
                        ))}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Sensor list */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-base">Danh sách cảm biến</CardTitle>
                                <CardDescription>Khu vực: {zones.find(z => z.id === selectedZoneId)?.name ?? '—'}</CardDescription>
                            </div>
                            {!isAdmin && selectedZoneId && (
                                <Button size="sm" onClick={() => setIsOpen(true)}>
                                    <Plus className="mr-1 h-4 w-4" /> Thêm
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            {sensors.length === 0 ? (
                                <div className="py-10 text-center text-muted-foreground">
                                    <Radio className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    <p>Chưa có cảm biến trong khu vực này.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tên</TableHead>
                                            <TableHead>Loại</TableHead>
                                            <TableHead>Vị trí</TableHead>
                                            <TableHead>Địa chỉ</TableHead>
                                            <TableHead>Chu kỳ</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            {!isAdmin && <TableHead />}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sensors.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium">{s.name}</TableCell>
                                                <TableCell>{SENSOR_LABEL[s.sensor_type]}</TableCell>
                                                <TableCell>{s.location || zones.find(z => z.id === s.zone_id)?.name || '—'}</TableCell>
                                                <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">{s.device_address || '—'}</TableCell>
                                                <TableCell>{s.update_interval_seconds ?? 60}s</TableCell>
                                                <TableCell>
                                                    <Badge variant={s.is_active ? 'default' : 'secondary'}>
                                                        {s.is_active ? 'Hoạt động' : 'Tắt'}
                                                    </Badge>
                                                </TableCell>
                                                {!isAdmin && (
                                                    <TableCell>
                                                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                                                            onClick={() => {
                                                                if (confirm('Xóa cảm biến này?'))
                                                                    deleteSensor.mutate(s.id, { onSuccess: () => toast.success('Đã xóa!') })
                                                            }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Biểu đồ thông số</CardTitle>
                            <div className="flex gap-2 flex-wrap mt-2">
                                <Input type="date" value={chartDate} onChange={e => setChartDate(e.target.value)} className="w-36" />
                                {sensors.length > 0 && (
                                    <Select value={chartSensorId} onValueChange={setChartSensorId}>
                                        <SelectTrigger className="w-48"><SelectValue placeholder="Chọn cảm biến..." /></SelectTrigger>
                                        <SelectContent>
                                            {sensors.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name} ({SENSOR_LABEL[s.sensor_type]})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isReadingsLoading ? (
                                <div className="flex h-52 items-center justify-center text-muted-foreground">Đang tải...</div>
                            ) : chartData.length === 0 ? (
                                <div className="flex h-52 items-center justify-center text-muted-foreground">Không có dữ liệu.</div>
                            ) : (
                                <div className="h-52 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={30} />
                                            <YAxis axisLine={false} tickLine={false}
                                                label={{ value: chartSensor?.unit ?? '', angle: -90, position: 'insideLeft', offset: 10 }} />
                                            <Tooltip formatter={(value) => [`${value ?? ''} ${chartSensor?.unit ?? ''}`, SENSOR_LABEL[chartSensor?.sensor_type ?? 'temperature']]} />
                                            <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddSensorDialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                zoneId={selectedZoneId}
                zones={zones}
                onCreatedZone={setSelectedZoneId}
            />
        </Dialog>
    )
}

function AddSensorDialog({
    open,
    onClose,
    zoneId,
    zones,
    onCreatedZone,
}: {
    open: boolean
    onClose: () => void
    zoneId: string
    zones: Array<{ id: string; name: string; location?: string }>
    onCreatedZone: (zoneId: string) => void
}) {
    const createSensor = useCreateSensor()
    const [form, setForm] = useState({
        name: '',
        sensor_type: '' as SensorType | '',
        zone_id: zoneId,
        location: '',
        device_address: '',
        update_interval_seconds: '60',
    })

    useEffect(() => {
        if (!open) return
        const selectedZone = zones.find(z => z.id === zoneId)
        setForm({
            name: '',
            sensor_type: '',
            zone_id: zoneId,
            location: selectedZone?.name || '',
            device_address: '',
            update_interval_seconds: '60',
        })
    }, [open, zoneId, zones])

    const handleSubmit = () => {
        if (!form.name || !form.sensor_type || !form.zone_id || !form.device_address || !form.update_interval_seconds) return
        const interval = Math.max(5, Number(form.update_interval_seconds) || 60)
        createSensor.mutate(
            {
                name: form.name,
                sensor_type: form.sensor_type as SensorType,
                zone_id: form.zone_id,
                location: form.location,
                device_address: form.device_address,
                update_interval_seconds: interval,
            },
            {
                onSuccess: () => {
                    onCreatedZone(form.zone_id)
                    toast.success('Thêm cảm biến thành công!')
                    onClose()
                },
                onError: () => toast.error('Thất bại'),
            }
        )
    }

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Thêm cảm biến mới</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Tên cảm biến *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Cảm biến nhiệt độ khu A" />
                </div>
                <div className="space-y-2">
                    <Label>Loại cảm biến *</Label>
                    <Select value={form.sensor_type} onValueChange={v => setForm(f => ({ ...f, sensor_type: v as SensorType }))}>
                        <SelectTrigger><SelectValue placeholder="Chọn loại cảm biến..." /></SelectTrigger>
                        <SelectContent>
                            {SENSOR_TYPES.map(t => (
                                <SelectItem key={t} value={t}>
                                    {SENSOR_LABEL[t]} ({SENSOR_UNIT[t] || 'không có đơn vị'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Vị trí / khu vực *</Label>
                    <Select
                        value={form.zone_id}
                        onValueChange={v => {
                            const selectedZone = zones.find(z => z.id === v)
                            setForm(f => ({ ...f, zone_id: v, location: selectedZone?.name || f.location }))
                        }}
                    >
                        <SelectTrigger><SelectValue placeholder="Chọn khu vực..." /></SelectTrigger>
                        <SelectContent>
                            {zones.map(z => (
                                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Nhãn vị trí</Label>
                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="VD: Luống 1 - cửa Đông" />
                </div>
                <div className="space-y-2">
                    <Label>Địa chỉ thiết bị *</Label>
                    <Input value={form.device_address} onChange={e => setForm(f => ({ ...f, device_address: e.target.value }))} placeholder="VD: farm/A/temp-01 hoặc greenhouse/a/temp" />
                </div>
                <div className="space-y-2">
                    <Label>Khoảng thời gian cập nhật *</Label>
                    <div className="flex items-center gap-2">
                        <Input type="number" min={5} step={5} value={form.update_interval_seconds}
                            onChange={e => setForm(f => ({ ...f, update_interval_seconds: e.target.value }))} />
                        <span className="text-sm text-muted-foreground">giây</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={!form.name || !form.sensor_type || !form.zone_id || !form.device_address || createSensor.isPending}>
                    Thêm cảm biến
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
