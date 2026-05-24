import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
    useAdminZones,
    useAdminCreateZone,
    useAdminUpdateZone,
    useAdminDeleteZone,
    useAssignFarmer,
    useUnassignFarmer,
} from '@/hooks/useAdminZones'
import { useZones } from '@/hooks/useZones'
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
import { Plus, Pencil, Trash2, Leaf, UserPlus, Users, X } from 'lucide-react'
import type { GrowingZoneAdminResponse } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'

export const Route = createFileRoute('/_layout/zones')({
    component: ZonesPage,
})

// ─── Entry point ────────────────────────────────────────────────────────────

function ZonesPage() {
    const user = useAuthStore(s => s.user)
    const isAdmin = user?.role === 'admin'

    return isAdmin ? <AdminZonesPage /> : <FarmerZonesPage />
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminZonesPage() {
    const { data: res, isLoading } = useAdminZones()
    const zones = res?.data || []

    const { data: profilesRes } = usePlantProfiles()
    const profiles = profilesRes?.data || []

    const { data: usersRes } = useUsers()
    const farmers = usersRes?.data || []

    const deleteZone = useAdminDeleteZone()

    const [zoneDialog, setZoneDialog] = useState<{ open: boolean; zone: GrowingZoneAdminResponse | null }>({
        open: false, zone: null,
    })
    const [assignDialog, setAssignDialog] = useState<{ open: boolean; zoneId: string | null }>(
        { open: false, zoneId: null },
    )
    // Always use live data from query cache so the dialog reflects real-time assignments
    const liveAssignZone = assignDialog.zoneId ? (zones.find(z => z.id === assignDialog.zoneId) ?? null) : null

    const profileName = (id?: string) => profiles.find(p => p.id === id)?.name ?? '—'

    const handleDelete = (zone: GrowingZoneAdminResponse) => {
        if (!confirm(`Xóa khu vực "${zone.name}"? Dữ liệu cảm biến và cảnh báo sẽ bị xóa.`)) return
        deleteZone.mutate(zone.id, {
            onSuccess: () => toast.success('Đã xóa khu vực'),
            onError: () => toast.error('Xóa thất bại'),
        })
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Khu vực trồng trọt</h2>
                        <p className="text-muted-foreground mt-1">
                            Admin quản lý toàn bộ khu vực và phân công nông dân.
                        </p>
                    </div>
                    <Button onClick={() => setZoneDialog({ open: true, zone: null })}>
                        <Plus className="mr-2 h-4 w-4" /> Tạo khu vực
                    </Button>
                </div>

                {isLoading ? (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">Đang tải...</CardContent></Card>
                ) : zones.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Leaf className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                            <p className="text-muted-foreground">Chưa có khu vực trồng trọt nào.</p>
                            <Button className="mt-4" onClick={() => setZoneDialog({ open: true, zone: null })}>
                                <Plus className="mr-2 h-4 w-4" /> Tạo khu vực đầu tiên
                            </Button>
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
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Nông dân</TableHead>
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
                                            <TableCell>
                                                <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                                                    {zone.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                    onClick={() => setAssignDialog({ open: true, zoneId: zone.id })}
                                                >
                                                    <Users className="h-4 w-4" />
                                                    {zone.assigned_farmers.length === 0
                                                        ? 'Chưa có'
                                                        : zone.assigned_farmers.map(f => f.full_name || f.email).join(', ')}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost"
                                                        onClick={() => setZoneDialog({ open: true, zone })}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(zone)}
                                                        disabled={deleteZone.isPending}>
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

            <AdminZoneFormDialog
                open={zoneDialog.open}
                zone={zoneDialog.zone}
                profiles={profiles}
                onClose={() => setZoneDialog({ open: false, zone: null })}
            />

            {liveAssignZone && (
                <AssignFarmerDialog
                    open={assignDialog.open}
                    zone={liveAssignZone}
                    allFarmers={farmers}
                    onClose={() => setAssignDialog({ open: false, zoneId: null })}
                />
            )}
        </>
    )
}

function AdminZoneFormDialog({
    open,
    zone,
    profiles,
    onClose,
}: {
    open: boolean
    zone: GrowingZoneAdminResponse | null
    profiles: import('@/types/common.types').PlantProfile[]
    onClose: () => void
}) {
    const createZone = useAdminCreateZone()
    const updateZone = useAdminUpdateZone()

    const [form, setForm] = useState({
        name: '', description: '', location: '', area_sqm: '',
        plant_profile_id: '', planting_date: '', expected_harvest_date: '',
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
                onSuccess: () => { toast.success('Tạo khu vực thành công!'); onClose() },
                onError: () => toast.error('Tạo khu vực thất bại'),
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{zone ? 'Cập nhật khu vực' : 'Tạo khu vực trồng trọt'}</DialogTitle>
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
                                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                        {zone ? 'Cập nhật' : 'Tạo khu vực'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AssignFarmerDialog({
    open,
    zone,
    allFarmers,
    onClose,
}: {
    open: boolean
    zone: GrowingZoneAdminResponse
    allFarmers: import('@/types/common.types').User[]
    onClose: () => void
}) {
    const assignFarmer = useAssignFarmer()
    const unassignFarmer = useUnassignFarmer()
    const [selectedFarmerId, setSelectedFarmerId] = useState('')

    const assignedIds = new Set(zone.assigned_farmers.map(f => f.id))
    const unassignedFarmers = allFarmers.filter(f => !assignedIds.has(f.id))

    const handleAssign = () => {
        if (!selectedFarmerId) return
        assignFarmer.mutate(
            { zoneId: zone.id, farmerId: selectedFarmerId },
            {
                onSuccess: () => { toast.success('Phân công thành công'); setSelectedFarmerId('') },
                onError: () => toast.error('Phân công thất bại'),
            },
        )
    }

    const handleUnassign = (farmerId: string) => {
        unassignFarmer.mutate(
            { zoneId: zone.id, farmerId },
            {
                onSuccess: () => toast.success('Đã gỡ phân công'),
                onError: () => toast.error('Gỡ phân công thất bại'),
            },
        )
    }

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Phân công nông dân — {zone.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Đang quản lý ({zone.assigned_farmers.length})
                        </Label>
                        {zone.assigned_farmers.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">Chưa có nông dân nào được phân công.</p>
                        ) : (
                            <div className="space-y-2">
                                {zone.assigned_farmers.map(f => (
                                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">{f.full_name || f.email}</p>
                                            {f.full_name && <p className="text-xs text-muted-foreground">{f.email}</p>}
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => handleUnassign(f.id)}
                                            disabled={unassignFarmer.isPending}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {unassignedFarmers.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Thêm nông dân
                            </Label>
                            <div className="flex gap-2">
                                <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Chọn nông dân..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unassignedFarmers.map(f => (
                                            <SelectItem key={f.id} value={f.id}>
                                                {f.name} ({f.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleAssign}
                                    disabled={!selectedFarmerId || assignFarmer.isPending}
                                    className="gap-1"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Phân công
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Farmer view ─────────────────────────────────────────────────────────────

function FarmerZonesPage() {
    const { data: res, isLoading } = useZones()
    const zones = res?.data || []

    const { data: profilesRes } = usePlantProfiles()
    const profiles = profilesRes?.data || []

    const profileName = (id?: string) => profiles.find(p => p.id === id)?.name ?? '—'

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Khu vực trồng trọt</h2>
                <p className="text-muted-foreground mt-1">
                    Danh sách khu vực canh tác được phân công cho bạn. Quyền chỉnh sửa thuộc về admin.
                </p>
            </div>

            {isLoading ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground">Đang tải...</CardContent></Card>
            ) : zones.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Leaf className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Bạn chưa được phân công khu vực nào.</p>
                        <p className="text-sm text-muted-foreground mt-1">Liên hệ admin để được phân công khu vực.</p>
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
