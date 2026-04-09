import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice } from '@/hooks/useDevices'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Device, DeviceType } from '@/types/common.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'

export const Route = createFileRoute('/_layout/devices')({
  component: DevicesPage,
})

function DevicesPage() {
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

  const selectedFarm = farmers.find(farm => farm.id === selectedFarmId)
  const canLoadFarmData = !isAdmin || Boolean(selectedFarmId)
  const devicesOwnerId = isAdmin ? selectedFarmId || undefined : undefined

  const { data: res, isLoading } = useDevices(devicesOwnerId, canLoadFarmData)
  const devices = res?.data || []
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
        onSuccess: () => toast.success('Đã xóa thiết bị!')
      })
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          setEditingDevice(null)
        }
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {isAdmin ? 'Thiết bị theo farm' : 'Thiết bị của tôi'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? `Danh sách thiết bị của farm ${selectedFarm?.name ?? 'được chọn'}, có thể sửa hoặc xóa nhưng không được thêm mới.`
                : 'Danh sách các thiết bị mà bạn đang sở hữu và theo dõi.'}
            </p>
          </div>

          {isAdmin ? (
            <FarmSelectCard
              farms={farmers}
              value={selectedFarmId}
              onValueChange={setSelectedFarmId}
              title="Chọn farm"
              description="Danh sách thiết bị bên dưới sẽ lọc theo farm này."
              placeholder="Chọn một farm..."
              emptyMessage="Chưa có farmer nào trong hệ thống."
              loadingMessage="Đang tải danh sách farmer..."
              isLoading={isFarmersLoading}
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

        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg sm:max-w-2xl">
          <DeviceForm
            device={editingDevice}
            onSuccess={() => setIsOpen(false)}
          />
        </DialogContent>

        <Card className="shadow-sm border-border/50 bg-card/60 backdrop-blur">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 sm:p-4 md:hidden">
              {!canLoadFarmData ? (
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Chọn farm để xem thiết bị.
                </div>
              ) : isLoading ? (
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Đang tải...
                </div>
              ) : devices.length === 0 ? (
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Không có thiết bị nào
                </div>
              ) : devices.map(device => (
                <div key={device.id} className="rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{device.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{device.location}</p>
                    </div>
                    <Badge variant={device.is_active ? 'default' : 'secondary'} className="shrink-0">
                      {device.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {device.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: {device.id.slice(0, 8)}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => handleEdit(device)}>
                      <Pencil size={16} /> Sửa
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 size={16} /> Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Tên thiết bị</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!canLoadFarmData ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Chọn farm để xem thiết bị.
                      </TableCell>
                    </TableRow>
                  ) : isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
                  ) : devices.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không có thiết bị nào</TableCell></TableRow>
                  ) : devices.map(device => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {device.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.is_active ? "default" : "secondary"}>
                          {device.is_active ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(device)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(device.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
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

function DeviceForm({ device, onSuccess }: { device: Device | null, onSuccess: () => void }) {
  const createDev = useCreateDevice()
  const updateDev = useUpdateDevice()

  const [formData, setFormData] = useState({
    name: device?.name || '',
    location: device?.location || '',
    type: device?.type || 'sensor' as DeviceType,
    is_active: device !== null ? device.is_active : true,
  })

  useEffect(() => {
    setFormData({
      name: device?.name || '',
      location: device?.location || '',
      type: device?.type || 'sensor' as DeviceType,
      is_active: device !== null ? device.is_active : true,
    })
  }, [device])

  // To fix typing error on submit event
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (device) {
      updateDev.mutate({ id: device.id, data: formData }, {
        onSuccess: () => {
          toast.success('Cập nhật thành công')
          onSuccess()
        }
      })
    } else {
      createDev.mutate(formData, {
        onSuccess: () => {
          toast.success('Thêm thiết bị thành công')
          onSuccess()
        }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{device ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Tên thiết bị</Label>
          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Vị trí</Label>
          <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Loại thiết bị</Label>
          <Select value={formData.type} onValueChange={(v: DeviceType) => setFormData({ ...formData, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sensor">Sensor</SelectItem>
              <SelectItem value="actuator">Actuator</SelectItem>
              <SelectItem value="gateway">Gateway</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>Hủy</Button>
        <Button type="submit" disabled={createDev.isPending || updateDev.isPending}>
          {device ? 'Lưu thay đổi' : 'Tạo mới'}
        </Button>
      </DialogFooter>
    </form>
  )
}
