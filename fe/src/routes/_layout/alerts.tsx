import { createFileRoute } from '@tanstack/react-router'
import { useAlerts, useMarkAlertRead } from '@/hooks/useAlerts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

export const Route = createFileRoute('/_layout/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const { data: res, isLoading } = useAlerts()
  const alerts = res?.data || []
  const markRead = useMarkAlertRead()

  const handleMarkRead = (id: string) => {
    markRead.mutate(id, {
      onSuccess: () => toast.success('Đã đánh dấu đọc')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isAdmin ? 'Cảnh báo hệ thống' : 'Cảnh báo của tôi'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? 'Danh sách toàn bộ cảnh báo vượt ngưỡng từ tất cả thiết bị.'
            : 'Danh sách các cảnh báo vượt ngưỡng liên quan đến thiết bị của bạn.'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card/60 backdrop-blur rounded-xl border border-border/50">
          {isAdmin ? 'Không có cảnh báo nào trong hệ thống' : 'Không có cảnh báo nào của bạn'}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <Card key={alert.id} className={cn(
              "transition-all border-l-4",
              alert.is_read ? "border-l-border bg-card/40" : "border-l-destructive bg-destructive/5 shadow-sm"
            )}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={cn("p-2 rounded-full", alert.is_read ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive")}>
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
                  <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => handleMarkRead(alert.id)}>
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
