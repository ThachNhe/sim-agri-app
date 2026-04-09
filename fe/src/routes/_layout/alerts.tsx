import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAlertSummary, useAlerts, useMarkAlertRead } from '@/hooks/useAlerts'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FarmSelectCard } from '@/components/admin/FarmSelectCard'

export const Route = createFileRoute('/_layout/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
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
  const alertsOwnerId = isAdmin ? selectedFarmId || undefined : undefined

  const { data: res, isLoading: isAlertsLoading } = useAlerts(alertsOwnerId, !isAdmin)
  const alerts = res?.data || []

  const { data: summaryRes, isLoading: isSummaryLoading } = useAlertSummary(
    alertsOwnerId,
    isAdmin && canLoadFarmData,
  )
  const alertSummary = summaryRes?.data

  const markRead = useMarkAlertRead()

  const handleMarkRead = (id: string) => {
    markRead.mutate(id, {
      onSuccess: () => toast.success('Đã đánh dấu đọc')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Cảnh báo theo farm' : 'Cảnh báo của tôi'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Thống kê số cảnh báo và số cảnh báo đã đọc theo farm được chọn.'
              : 'Danh sách các cảnh báo vượt ngưỡng liên quan đến thiết bị của bạn.'}
          </p>
        </div>

        {isAdmin && (
          <FarmSelectCard
            farms={farmers}
            value={selectedFarmId}
            onValueChange={setSelectedFarmId}
            title="Chọn farm"
            description="Các thống kê cảnh báo bên dưới sẽ lọc theo farm này."
            placeholder="Chọn một farm..."
            emptyMessage="Chưa có farmer nào trong hệ thống."
            loadingMessage="Đang tải danh sách farmer..."
            isLoading={isFarmersLoading}
            className="w-full xl:max-w-md"
          />
        )}
      </div>

      {isAdmin ? (
        !canLoadFarmData ? (
          <div className="rounded-xl border border-border/50 bg-card/60 px-6 py-12 text-center text-muted-foreground backdrop-blur">
            Chọn farm để xem thống kê cảnh báo.
          </div>
        ) : isSummaryLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
        ) : alertSummary ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title="Tổng cảnh báo"
                value={alertSummary.total_alerts}
                icon={<AlertCircle className="h-4 w-4 text-destructive" />}
                description={selectedFarm ? `Farm: ${selectedFarm.name}` : 'Theo farm được chọn'}
              />
              <MetricCard
                title="Đã đọc"
                value={alertSummary.read_alerts}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                description="Cảnh báo đã được farmer mở xem"
              />
              <MetricCard
                title="Chưa đọc"
                value={alertSummary.unread_alerts}
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                description="Cảnh báo vẫn còn chưa được xử lý"
              />
            </div>

            <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Tóm tắt farm</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {selectedFarm
                  ? `Đang xem thống kê cảnh báo của ${selectedFarm.name}.`
                  : 'Chọn farm để xem thống kê cảnh báo tương ứng.'}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/60 px-6 py-12 text-center text-muted-foreground backdrop-blur">
            Không có dữ liệu cảnh báo cho farm này.
          </div>
        )
      ) : isAlertsLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card/60 backdrop-blur rounded-xl border border-border/50">
          Không có cảnh báo nào của bạn
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <Card
              key={alert.id}
              className={cn(
                'transition-all border-l-4',
                alert.is_read ? 'border-l-border bg-card/40' : 'border-l-destructive bg-destructive/5 shadow-sm',
              )}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      alert.is_read ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{alert.message}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>Ngưỡng giám sát: {alert.threshold}</span>
                      <span>•</span>
                      <span>{new Date(alert.triggered_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {!alert.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => handleMarkRead(alert.id)}
                  >
                    <CheckCircle2 size={16} /> Đã đọc
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  description: string
}) {
  return (
    <Card className="border-border/50 bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-full bg-background/50 p-2">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
