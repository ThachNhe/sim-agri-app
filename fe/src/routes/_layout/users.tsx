import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Lock, Plus, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCreateUser, useToggleUserStatus, useUsers } from '@/hooks/useUsers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User } from '@/types/common.types'

export const Route = createFileRoute('/_layout/users')({
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role

    if (role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: UsersPage,
})

function getStatusLabel(status: User['status']) {
  if (status === 'active') return 'Hoạt động'
  if (status === 'inactive') return 'Chưa kích hoạt'
  return 'Đã khóa'
}

function getStatusVariant(status: User['status']) {
  if (status === 'active') return 'default' as const
  if (status === 'inactive') return 'secondary' as const
  return 'destructive' as const
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function UsersPage() {
  const currentUser = useAuthStore(s => s.user)
  const { data: res, isLoading } = useUsers()
  const farmers = res?.data || []
  const createUser = useCreateUser()
  const toggleUserStatus = useToggleUserStatus()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
  })

  const handleCreateFarmer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const fullName = formState.fullName.trim()
    const email = formState.email.trim().toLowerCase()

    if (!fullName || !email) {
      toast.error('Vui lòng nhập đầy đủ họ tên và email')
      return
    }

    createUser.mutate(
      { fullName, email },
      {
        onSuccess: () => {
          toast.success('Đã tạo farmer mới. Mật khẩu đã được gửi qua MailHog.')
          setFormState({ fullName: '', email: '' })
          setIsCreateOpen(false)
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Không thể tạo tài khoản mới'))
        },
      },
    )
  }

  const handleToggleStatus = (user: User) => {
    const nextStatus = user.status === 'banned' ? 'active' : 'banned'

    toggleUserStatus.mutate(
      { id: user.id, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(
            nextStatus === 'banned' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
          )
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái'))
        },
      },
    )
  }

  const canToggleUser = (user: User) =>
    user.role !== 'admin' && user.id !== currentUser?.id

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Danh sách farmer</h2>
          <p className="text-muted-foreground mt-1">
            Chỉ hiển thị farmer trong hệ thống. Admin có thể tạo, khóa và mở khóa tài khoản tại đây.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 md:w-auto">
              <Plus size={16} />
              Thêm farmer
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg sm:max-w-md">
            <form onSubmit={handleCreateFarmer}>
              <DialogHeader>
                <DialogTitle>Tạo farmer mới</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ tên</Label>
                  <Input
                    id="fullName"
                    value={formState.fullName}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, fullName: event.target.value }))
                    }
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="farmer@example.com"
                    required
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Mật khẩu tạm thời sẽ được tạo tự động và gửi vào MailHog.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Đang tạo...' : 'Tạo farmer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/50 bg-card/60 backdrop-blur">
        <CardContent className="p-0">
          <div className="space-y-3 p-3 sm:p-4 md:hidden">
            {isLoading ? (
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Đang tải...
              </div>
            ) : farmers.length === 0 ? (
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Không có farmer nào
              </div>
            ) : (
              farmers.map((user) => {
                const canManage = canToggleUser(user)

                return (
                  <div key={user.id} className="rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{user.name}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={getStatusVariant(user.status)}>{getStatusLabel(user.status)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => handleToggleStatus(user)}
                          disabled={toggleUserStatus.isPending}
                        >
                          {user.status === 'banned' ? <Unlock size={16} /> : <Lock size={16} />}
                          {user.status === 'banned' ? 'Mở khóa' : 'Khóa'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không áp dụng</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày đăng ký</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : farmers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Không có farmer nào
                    </TableCell>
                  </TableRow>
                ) : (
                  farmers.map((user) => {
                    const canManage = canToggleUser(user)

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {user.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span>{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(user.status)}>{getStatusLabel(user.status)}</Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="text-right">
                          {canManage ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleToggleStatus(user)}
                              disabled={toggleUserStatus.isPending}
                            >
                              {user.status === 'banned' ? <Unlock size={16} /> : <Lock size={16} />}
                              {user.status === 'banned' ? 'Mở khóa' : 'Khóa'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Không áp dụng</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
