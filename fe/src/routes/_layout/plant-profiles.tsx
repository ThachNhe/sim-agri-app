import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { usePlantProfiles, useCreatePlantProfile, useUpdatePlantProfile, useDeletePlantProfile } from '@/hooks/usePlantProfiles'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, Leaf } from 'lucide-react'
import type { PlantProfile } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'

export const Route = createFileRoute('/_layout/plant-profiles')({
    component: PlantProfilesPage,
})

type ProfileForm = Omit<PlantProfile, 'id' | 'created_at' | 'updated_at'>

const EMPTY_FORM: ProfileForm = {
    name: '',
    description: '',
    temp_min: 20,
    temp_max: 30,
    humidity_min: 50,
    humidity_max: 80,
    soil_moisture_min: 40,
    soil_moisture_max: 70,
    light_min: undefined,
    light_max: undefined,
    ph_min: undefined,
    ph_max: undefined,
    ec_min: undefined,
    ec_max: undefined,
    growth_period_days: undefined,
}

function PlantProfilesPage() {
    const user = useAuthStore(s => s.user)
    const isAdmin = user?.role === 'admin'

    const { data: res, isLoading } = usePlantProfiles()
    const profiles = res?.data || []

    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<PlantProfile | null>(null)

    const openCreate = () => { setEditing(null); setIsOpen(true) }
    const openEdit = (p: PlantProfile) => { setEditing(p); setIsOpen(true) }

    const deleteProfile = useDeletePlantProfile()
    const handleDelete = (id: string) => {
        if (!confirm('Xóa hồ sơ cây trồng này?')) return
        deleteProfile.mutate(id, { onSuccess: () => toast.success('Đã xóa!'), onError: () => toast.error('Xóa thất bại') })
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Hồ sơ cây trồng</h2>
                        <p className="text-muted-foreground mt-1">Xác định ngưỡng tối ưu cho từng loại cây trồng.</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={openCreate}>
                            <Plus className="mr-1 h-4 w-4" /> Thêm hồ sơ
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
                ) : profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
                        <Leaf className="mb-3 h-10 w-10 opacity-40" />
                        <p>Chưa có hồ sơ cây trồng nào.</p>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-0 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên cây trồng</TableHead>
                                        <TableHead>Nhiệt độ (°C)</TableHead>
                                        <TableHead>Độ ẩm KK (%)</TableHead>
                                        <TableHead>Độ ẩm đất (%)</TableHead>
                                        <TableHead>Ánh sáng (lux)</TableHead>
                                        <TableHead>pH</TableHead>
                                        <TableHead>EC (mS/cm)</TableHead>
                                        <TableHead>T. sinh trưởng</TableHead>
                                        {isAdmin && <TableHead className="w-24" />}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profiles.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="font-medium">{p.name}</div>
                                                {p.description && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{p.description}</div>}
                                            </TableCell>
                                            <TableCell>{p.temp_min} – {p.temp_max}</TableCell>
                                            <TableCell>{p.humidity_min} – {p.humidity_max}</TableCell>
                                            <TableCell>{p.soil_moisture_min} – {p.soil_moisture_max}</TableCell>
                                            <TableCell>{p.light_min != null && p.light_max != null ? `${p.light_min} – ${p.light_max}` : '—'}</TableCell>
                                            <TableCell>{p.ph_min != null && p.ph_max != null ? `${p.ph_min} – ${p.ph_max}` : '—'}</TableCell>
                                            <TableCell>{p.ec_min != null && p.ec_max != null ? `${p.ec_min} – ${p.ec_max}` : '—'}</TableCell>
                                            <TableCell>{p.growth_period_days != null ? `${p.growth_period_days} ngày` : '—'}</TableCell>
                                            {isAdmin && (
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <ProfileFormDialog
                    profile={editing}
                    onClose={() => setIsOpen(false)}
                />
            </Dialog>
        </>
    )
}

function ProfileFormDialog({ profile, onClose }: { profile: PlantProfile | null; onClose: () => void }) {
    const createProfile = useCreatePlantProfile()
    const updateProfile = useUpdatePlantProfile(profile?.id ?? '')
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)

    useEffect(() => {
        if (profile) {
            const { id, created_at, updated_at, ...rest } = profile as PlantProfile & { created_at: string; updated_at: string }
            setForm({ ...EMPTY_FORM, ...rest })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [profile])

    const set = (key: keyof ProfileForm, value: string | number | undefined) =>
        setForm(f => ({ ...f, [key]: value }))

    const numInput = (key: keyof ProfileForm, label: string, required = false, unit = '') => (
        <div>
            <Label>{label}{required ? ' *' : ''}{unit ? ` (${unit})` : ''}</Label>
            <Input
                type="number"
                step="0.1"
                value={form[key] ?? ''}
                onChange={e => set(key, e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder={required ? 'Bắt buộc' : 'Tùy chọn'}
            />
        </div>
    )

    const handleSubmit = () => {
        if (!form.name) return
        const payload = { ...form }
        if (profile) {
            updateProfile.mutate(payload, {
                onSuccess: () => { toast.success('Đã cập nhật!'); onClose() },
                onError: () => toast.error('Thất bại')
            })
        } else {
            createProfile.mutate(payload, {
                onSuccess: () => { toast.success('Tạo hồ sơ thành công!'); onClose() },
                onError: () => toast.error('Thất bại')
            })
        }
    }

    const isPending = createProfile.isPending || updateProfile.isPending

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{profile ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ cây trồng mới'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                    <Label>Tên cây trồng *</Label>
                    <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Lúa, Cà chua, Rau muống..." />
                </div>
                <div>
                    <Label>Mô tả</Label>
                    <textarea value={form.description ?? ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('description', e.target.value)} rows={2} placeholder="Mô tả ngắn về loại cây..." className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">Nhiệt độ *</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('temp_min', 'Thấp nhất', true, '°C')}
                    {numInput('temp_max', 'Cao nhất', true, '°C')}
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">Độ ẩm không khí *</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('humidity_min', 'Thấp nhất', true, '%')}
                    {numInput('humidity_max', 'Cao nhất', true, '%')}
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">Độ ẩm đất *</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('soil_moisture_min', 'Thấp nhất', true, '%')}
                    {numInput('soil_moisture_max', 'Cao nhất', true, '%')}
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">Ánh sáng (tùy chọn)</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('light_min', 'Thấp nhất', false, 'lux')}
                    {numInput('light_max', 'Cao nhất', false, 'lux')}
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">pH đất (tùy chọn)</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('ph_min', 'Thấp nhất')}
                    {numInput('ph_max', 'Cao nhất')}
                </div>

                <p className="text-sm font-semibold text-muted-foreground pt-2 border-t">EC (tùy chọn)</p>
                <div className="grid grid-cols-2 gap-3">
                    {numInput('ec_min', 'Thấp nhất', false, 'mS/cm')}
                    {numInput('ec_max', 'Cao nhất', false, 'mS/cm')}
                </div>

                <div className="pt-2 border-t">
                    {numInput('growth_period_days', 'Thời gian sinh trưởng', false, 'ngày')}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={!form.name || isPending}>
                    {profile ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
