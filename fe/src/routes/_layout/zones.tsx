import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from '@/hooks/useZones'
import { usePlantProfiles } from '@/hooks/usePlantProfiles'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Leaf } from 'lucide-react'
import type { GrowingZone } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'

export const Route = createFileRoute('/_layout/zones')({
    component: ZonesPage,
})

function ZonesPage() {
    const user = useAuthStore(s => s.user)
    const isAdmin = user?.role === 'admin'

    const { data: usersRes, isLoading: isFarmersLoading } = useUsers(Boolean(isAdmin))
    const farmers = usersRes?.data || []
    const [selectedFarmId, setSelectedFarmId] = useState('')

    useEffect(() => {
        if (!isAdmin) return
        if (farmers.length === 0) { if (selectedFarmId) setSelectedFarmId(''); return }
        if (!selectedFarmId || !farmers.some(f => f.id === selectedFarmId))
            setSelectedFarmId(farmers[0].id)
    }, [farmers, isAdmin, selectedFarmId])

    const canLoad = !isAdmin || Boolean(selectedFarmId)
    const ownerId = isAdmin ? selectedFarmId || undefined : undefined

    const { data: res, isLoading } = useZones(ownerId, canLoad)
    const zones = res?.data || []

    const { data: profilesRes } = usePlantProfiles()
    const profiles = profilesRes?.data || []

    const deleteZone = useDeleteZone()
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<GrowingZone | null>(null)

    const selectedFarm = farmers.find(f => f.id === selectedFarmId)

    const profileName = (id?: string) => profiles.find(p => p.id === id)?.name ?? '—'

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) setEditing(null) }}>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Khu vực trồng trọt</h2>
                        <p className="text-muted-foreground mt-1">
                            {isAdmin
                                ? `Quản lý khu vực của ${selectedFarm?.name ?? 'farmer được chọn'}`
                                : 'Danh sách khu vực canh tác của bạn, mỗi khu gắn với một loại cây trồng.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isAdmin ? (
                            <FarmSelectCard
                                farms={farmers}
                                value={selectedFarmId}
                                onValueChange={setSelectedFarmId}
                                title="Chọn farmer"
                                description="Xem khu vực của farmer."
                                placeholder="Chọn farmer..."
                                emptyMessage="Chưa có farmer."
                                loadingMessage="Đang tải..."
                                isLoading={isFarmersLoading}
                            />
                        ) : (
                            <Button onClick={() => { setEditing(null); setIsOpen(true) }}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm khu vực
                            </Button>
                        )}
                    </div>
                </div>

                {!canLoad ? (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">Chọn farmer để xem khu vực.</CardContent></Card>
                ) : isLoading ? (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">Đang tải...</CardContent></Card>
                ) : zones.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Leaf className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                            <p className="text-muted-foreground">Chưa có khu vực trồng trọt nào.</p>
                            {!isAdmin && (
                                <Button className="mt-4" onClick={() => { setEditing(null); setIsOpen(true) }}>
                                    <Plus className="mr-2 h-4 w-4" /> Thêm khu vực đầu tiên
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên khu vực</TableHead>
                                        <TableHead>Vị trí</TableHead>
                                        <TableHead>Cây trồng</TableHead>
                                        <TableHead>Diện tích</TableHead>
                                        <TableHead>Ngày trồng</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {zones.map(zone => (
                                        <TableRow key={zone.id}>
                                            <TableCell className="font-medium">{zone.name}</TableCell>
                                            <TableCell>{zone.location ?? '—'}</TableCell>
                                            <TableCell>
                                                {zone.plant_profile_id ? (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Leaf className="h-3 w-3" />
                                                        {profileName(zone.plant_profile_id)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Chưa chọn</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{zone.area_sqm ? `${zone.area_sqm} m²` : '—'}</TableCell>
                                            <TableCell>{zone.planting_date ?? '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                                                    {zone.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!isAdmin && (
                                                        <Button size="icon" variant="ghost" onClick={() => { setEditing(zone); setIsOpen(true) }}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm('Xóa khu vực này?'))
                                                                deleteZone.mutate(zone.id, { onSuccess: () => toast.success('Đã xóa khu vực!') })
                                                        }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <ZoneFormDialog
                open={isOpen}
                onClose={() => { setIsOpen(false); setEditing(null) }}
                zone={editing}
                profiles={profiles}
            />
        </Dialog>
    )
}

function ZoneFormDialog({
    open,
    onClose,
    zone,
    profiles,
}: {
    open: boolean
    onClose: () => void
    zone: GrowingZone | null
    profiles: import('@/types/common.types').PlantProfile[]
}) {
    const createZone = useCreateZone()
    const updateZone = useUpdateZone()

    const [form, setForm] = useState({
        name: '',
        description: '',
        location: '',
        area_sqm: '',
        plant_profile_id: '',
        planting_date: '',
        expected_harvest_date: '',
    })

    useEffect(() => {
        if (zone) {
            setForm({
                name: zone.name,
                description: zone.description ?? '',
                location: zone.location ?? '',
                area_sqm: zone.area_sqm?.toString() ?? '',
                plant_profile_id: zone.plant_profile_id ?? '',
                planting_date: zone.planting_date ?? '',
                expected_harvest_date: zone.expected_harvest_date ?? '',
            })
        } else {
            setForm({ name: '', description: '', location: '', area_sqm: '', plant_profile_id: '', planting_date: '', expected_harvest_date: '' })
        }
    }, [zone, open])

    const handleSubmit = () => {
        const payload = {
            name: form.name,
            description: form.description || undefined,
            location: form.location || undefined,
            area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
            plant_profile_id: form.plant_profile_id || undefined,
            planting_date: form.planting_date || undefined,
            expected_harvest_date: form.expected_harvest_date || undefined,
        }

        if (zone) {
            updateZone.mutate({ id: zone.id, data: payload }, {
                onSuccess: () => { toast.success('Cập nhật thành công!'); onClose() },
                onError: () => toast.error('Cập nhật thất bại'),
            })
        } else {
            createZone.mutate(payload, {
                onSuccess: () => { toast.success('Thêm khu vực thành công!'); onClose() },
                onError: () => toast.error('Thêm thất bại'),
            })
        }
    }

    return (
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>{zone ? 'Cập nhật khu vực' : 'Thêm khu vực trồng trọt'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div>
                    <Label>Tên khu vực *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Nhà kính cà chua số 1" />
                </div>
                <div>
                    <Label>Loại cây trồng</Label>
                    <Select value={form.plant_profile_id} onValueChange={v => setForm(f => ({ ...f, plant_profile_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Chọn cây trồng..." /></SelectTrigger>
                        <SelectContent>
                            {profiles.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Vị trí</Label>
                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="VD: Khu A – Đồng Tháp" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Diện tích (m²)</Label>
                        <Input type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} placeholder="200" />
                    </div>
                    <div>
                        <Label>Ngày trồng</Label>
                        <Input type="date" value={form.planting_date} onChange={e => setForm(f => ({ ...f, planting_date: e.target.value }))} />
                    </div>
                </div>
                <div>
                    <Label>Ngày thu hoạch dự kiến</Label>
                    <Input type="date" value={form.expected_harvest_date} onChange={e => setForm(f => ({ ...f, expected_harvest_date: e.target.value }))} />
                </div>
                <div>
                    <Label>Mô tả</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ghi chú thêm..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={!form.name || createZone.isPending || updateZone.isPending}>
                    {zone ? 'Cập nhật' : 'Thêm khu vực'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
