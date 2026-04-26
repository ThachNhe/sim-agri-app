import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useActuators, useSendCommand, useActuatorCommands, useCreateActuator, useDeleteActuator } from '@/hooks/useActuators'
import { useZones } from '@/hooks/useZones'
import { useAdminZones } from '@/hooks/useAdminZones'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Power, Settings2, Trash2, History } from 'lucide-react'
import type { Actuator, ActuatorType } from '@/types/common.types'
import { ACTUATOR_LABEL } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export const Route = createFileRoute('/_layout/actuators')({
    component: ActuatorsPage,
})

const ACTUATOR_TYPES: ActuatorType[] = ['irrigation', 'fan', 'heater', 'lamp', 'fertilizer_pump', 'co2_injector', 'shade_net']

function ActuatorsPage() {
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
    const allAdminZones = adminZonesRes?.data || []
    const zones = isAdmin
        ? allAdminZones.filter(z => z.assigned_farmers.some(f => f.id === ownerId))
        : (farmerZonesRes?.data || [])

    const [selectedZoneId, setSelectedZoneId] = useState('')
    useEffect(() => {
        if (zones.length > 0 && (!selectedZoneId || !zones.some(z => z.id === selectedZoneId)))
            setSelectedZoneId(zones[0].id)
    }, [zones, selectedZoneId])

    const { data: actuatorsRes } = useActuators(selectedZoneId || undefined)
    const actuators = actuatorsRes?.data || []

    const [isOpen, setIsOpen] = useState(false)
    const [historyActuator, setHistoryActuator] = useState<Actuator | null>(null)

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Điều khiển thiết bị</h2>
                        <p className="text-muted-foreground mt-1">Quản lý và điều khiển các bộ phận tác động trong từng khu vực.</p>
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

                {/* Action bar */}
                {!isAdmin && selectedZoneId && (
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => setIsOpen(true)}>
                            <Plus className="mr-1 h-4 w-4" /> Thêm thiết bị
                        </Button>
                    </div>
                )}

                {/* Actuator cards */}
                {actuators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
                        <Settings2 className="mb-3 h-10 w-10 opacity-40" />
                        <p className="text-sm">Chưa có thiết bị nào trong khu vực này.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {actuators.map(a => (
                            <ActuatorCard key={a.id} actuator={a} isAdmin={isAdmin}
                                onHistory={() => setHistoryActuator(a)} />
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <AddActuatorDialog onClose={() => setIsOpen(false)} zoneId={selectedZoneId} />
            </Dialog>

            {historyActuator && (
                <CommandHistorySheet actuator={historyActuator} onClose={() => setHistoryActuator(null)} />
            )}
        </>
    )
}

function ActuatorCard({ actuator, isAdmin, onHistory }: { actuator: Actuator; isAdmin: boolean; onHistory: () => void }) {
    const sendCommand = useSendCommand(actuator.id)
    const deleteActuator = useDeleteActuator()
    const [duration, setDuration] = useState('60')

    const isOn = actuator.current_state === 'on'

    const toggle = () => {
        sendCommand.mutate(
            { command: isOn ? 'off' : 'on', duration_seconds: isOn ? undefined : Number(duration), reason: 'Điều khiển thủ công' },
            {
                onSuccess: () => toast.success(`Đã ${isOn ? 'tắt' : 'bật'} ${actuator.name}`),
                onError: () => toast.error('Thao tác thất bại')
            }
        )
    }

    return (
        <Card className={`transition-all ${isOn ? 'border-green-500 ring-1 ring-green-500/30' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{actuator.name}</CardTitle>
                    <Badge variant={isOn ? 'default' : 'secondary'} className={isOn ? 'bg-green-500' : ''}>
                        {isOn ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                    </Badge>
                </div>
                <CardDescription>{ACTUATOR_LABEL[actuator.actuator_type]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {!isOn && (
                    <div>
                        <Label className="text-xs text-muted-foreground">Thời gian (giây)</Label>
                        <Input type="number" min={5} value={duration} onChange={e => setDuration(e.target.value)} className="h-8 text-sm" />
                    </div>
                )}
                <div className="flex gap-2">
                    <Button className={`flex-1 ${isOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                        onClick={toggle} disabled={sendCommand.isPending}>
                        <Power className="mr-2 h-4 w-4" />
                        {isOn ? 'Tắt thiết bị' : 'Bật thiết bị'}
                    </Button>
                    <Button size="icon" variant="outline" onClick={onHistory} title="Lịch sử lệnh">
                        <History className="h-4 w-4" />
                    </Button>
                    {!isAdmin && (
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => {
                                if (confirm('Xóa thiết bị này?'))
                                    deleteActuator.mutate(actuator.id, { onSuccess: () => toast.success('Đã xóa!') })
                            }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function CommandHistorySheet({ actuator, onClose }: { actuator: Actuator; onClose: () => void }) {
    const { data: commandsRes } = useActuatorCommands(actuator.id)
    const commands = commandsRes?.data || []

    return (
        <Sheet open onOpenChange={v => !v && onClose()}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Lịch sử lệnh — {actuator.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-auto">
                    {commands.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-8">Chưa có lệnh nào.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lệnh</TableHead>
                                    <TableHead>Thời gian</TableHead>
                                    <TableHead>Lý do</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commands.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <Badge variant={c.command === 'on' ? 'default' : 'secondary'}
                                                className={c.command === 'on' ? 'bg-green-500' : ''}>
                                                {c.command.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">{new Date(c.executed_at).toLocaleString('vi-VN')}</TableCell>
                                        <TableCell className="text-xs">{c.reason || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function AddActuatorDialog({ onClose, zoneId }: { onClose: () => void; zoneId: string }) {
    const createActuator = useCreateActuator()
    const [form, setForm] = useState({ name: '', actuator_type: '' as ActuatorType | '' })

    const handleSubmit = () => {
        if (!form.name || !form.actuator_type) return
        createActuator.mutate(
            { name: form.name, actuator_type: form.actuator_type as ActuatorType, zone_id: zoneId },
            { onSuccess: () => { toast.success('Thêm thiết bị thành công!'); onClose() }, onError: () => toast.error('Thất bại') }
        )
    }

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>Thêm thiết bị tác động</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                <div>
                    <Label>Tên thiết bị *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Máy bơm tưới khu A" />
                </div>
                <div>
                    <Label>Loại thiết bị *</Label>
                    <Select value={form.actuator_type} onValueChange={v => setForm(f => ({ ...f, actuator_type: v as ActuatorType }))}>
                        <SelectTrigger><SelectValue placeholder="Chọn loại thiết bị..." /></SelectTrigger>
                        <SelectContent>
                            {ACTUATOR_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{ACTUATOR_LABEL[t]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={!form.name || !form.actuator_type || createActuator.isPending}>
                    Thêm thiết bị
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
