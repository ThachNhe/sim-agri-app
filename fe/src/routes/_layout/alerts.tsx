import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminZones } from '@/hooks/useAdminZones'
import { useAlerts, useMarkAlertRead } from '@/hooks/useAlerts'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { SENSOR_LABEL, SENSOR_UNIT } from '@/types/common.types'
import type { Alert, AlertSeverity, AlertType, GrowingZoneAdminResponse, SensorType } from '@/types/common.types'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lightbulb, MapPin, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_layout/alerts')({
  component: AlertsPage,
})

const SENSOR_DISPLAY_LABEL: Record<SensorType, string> = {
  temperature: 'Nhiệt độ',
  humidity: 'Độ ẩm không khí',
  soil_moisture: 'Độ ẩm đất',
  light: 'Ánh sáng',
  ph: 'pH',
  ec: 'EC dinh dưỡng',
  co2: 'CO₂',
}

const SENSOR_RANGE: Record<SensorType, { min: number; max: number }> = {
  temperature: { min: 0, max: 50 },
  humidity: { min: 0, max: 100 },
  soil_moisture: { min: 0, max: 100 },
  light: { min: 0, max: 80000 },
  ph: { min: 0, max: 14 },
  ec: { min: 0, max: 5 },
  co2: { min: 0, max: 2000 },
}

function AlertsPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const { data: adminZonesRes, isLoading: isAdminZonesLoading } = useAdminZones(Boolean(isAdmin))
  const adminZones = adminZonesRes?.data || []
  const [selectedFarmId, setSelectedFarmId] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    if (adminZones.length === 0) {
      if (selectedFarmId) setSelectedFarmId('')
      return
    }
    if (!selectedFarmId || !adminZones.some(farm => farm.id === selectedFarmId)) {
      setSelectedFarmId(adminZones[0].id)
    }
  }, [adminZones, isAdmin, selectedFarmId])

  const selectedFarm = adminZones.find(farm => farm.id === selectedFarmId)
  const canLoadFarmData = !isAdmin || Boolean(selectedFarmId)

  const { data: res, isLoading: isAlertsLoading } = useAlerts(undefined, canLoadFarmData)
  const allAlerts = res?.data || []
  const alerts = isAdmin
    ? allAlerts.filter(alert => alert.zone_id === selectedFarmId)
    : allAlerts

  const alertSummary = useMemo(() => ({
    total_alerts: alerts.length,
    read_alerts: alerts.filter(alert => alert.is_read).length,
    unread_alerts: alerts.filter(alert => !alert.is_read).length,
    auto_executed_alerts: alerts.filter(alert => alert.automation_status === 'executed').length,
  }), [alerts])

  const markRead = useMarkAlertRead()

  const handleMarkRead = (id: string) => {
    markRead.mutate(id, {
      onSuccess: () => toast.success('Đã đánh dấu đọc'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Cảnh báo & tự động hóa theo farm' : 'Cảnh báo & tự động hóa'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Thống kê thông số cảnh báo theo từng farm/khu vực, không thao tác xử lý thay farmer.'
              : 'Cảnh báo vượt ngưỡng kèm số đo, ngưỡng rule engine và hành động tự động.'}
          </p>
        </div>

        {isAdmin && (
          <FarmFilterCard
            farms={adminZones}
            value={selectedFarmId}
            onValueChange={setSelectedFarmId}
            title="Chọn farm"
            description="Thống kê cảnh báo sẽ lọc theo farm/khu vực này."
            placeholder="Chọn một farm..."
            emptyMessage="Chưa có farm nào trong hệ thống."
            loadingMessage="Đang tải danh sách farm..."
            isLoading={isAdminZonesLoading}
            className="w-full xl:max-w-md"
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Tổng cảnh báo"
          value={alertSummary.total_alerts}
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
          description={selectedFarm ? `Farm: ${selectedFarm.name}` : 'Theo dữ liệu hiện tại'}
        />
        <MetricCard
          title={isAdmin ? 'Nghiêm trọng' : 'Đã đọc'}
          value={isAdmin ? alerts.filter(alert => alert.severity === 'high').length : alertSummary.read_alerts}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          description={isAdmin ? 'Cảnh báo high trong farm' : 'Cảnh báo đã được mở xem'}
        />
        <MetricCard
          title={isAdmin ? 'Thông số bị ảnh hưởng' : 'Chưa đọc'}
          value={isAdmin ? new Set(alerts.map(alert => alert.parameter).filter(Boolean)).size : alertSummary.unread_alerts}
          icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
          description={isAdmin ? 'Số loại cảm biến có cảnh báo' : 'Cảnh báo cần xử lý'}
        />
        <MetricCard
          title="Đã tự động xử lý"
          value={alertSummary.auto_executed_alerts ?? 0}
          icon={<Zap className="h-4 w-4 text-emerald-500" />}
          description="Lệnh điều khiển đã ghi nhận"
        />
      </div>

      {!canLoadFarmData ? (
        <div className="rounded-xl border border-border/50 bg-card/60 px-6 py-12 text-center text-muted-foreground backdrop-blur">
          Chọn farm để xem cảnh báo.
        </div>
      ) : isAlertsLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/60 px-6 py-12 text-center text-muted-foreground backdrop-blur">
          Không có cảnh báo nào.
        </div>
      ) : isAdmin ? (
        <AdminAlertStats alerts={alerts} selectedFarm={selectedFarm} />
      ) : (
        <div className="max-h-[calc(100vh-20rem)] space-y-3 overflow-y-auto pr-2 overscroll-contain">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onMarkRead={() => handleMarkRead(alert.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FarmFilterCard({
  farms,
  value,
  onValueChange,
  title,
  description,
  placeholder,
  emptyMessage,
  loadingMessage,
  isLoading = false,
  className,
}: {
  farms: GrowingZoneAdminResponse[]
  value: string
  onValueChange: (value: string) => void
  title: string
  description: string
  placeholder: string
  emptyMessage: string
  loadingMessage: string
  isLoading?: boolean
  className?: string
}) {
  return (
    <Card className={cn('border-border/50 bg-card/60 shadow-sm backdrop-blur', className)}>
      <div className="space-y-2 p-4">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        {isLoading ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
            {loadingMessage}
          </div>
        ) : farms.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {farms.map(farm => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  )
}

function AdminAlertStats({ alerts, selectedFarm }: { alerts: Alert[]; selectedFarm?: GrowingZoneAdminResponse }) {
  const rows = useMemo(() => {
    const grouped = new Map<string, {
      label: string
      total: number
      high: number
      medium: number
      low: number
      auto: number
      latest?: Alert
    }>()

    for (const alert of alerts) {
      const key = alert.parameter || alert.alert_type
      const label = alert.parameter ? SENSOR_DISPLAY_LABEL[alert.parameter] : alert.alert_type === 'compound_condition' ? 'Điều kiện tổ hợp' : 'Thiết bị'
      const current = grouped.get(key) || { label, total: 0, high: 0, medium: 0, low: 0, auto: 0 }
      current.total += 1
      current[alert.severity] += 1
      if (alert.automation_status === 'executed') current.auto += 1
      if (!current.latest || new Date(alert.triggered_at) > new Date(current.latest.triggered_at)) {
        current.latest = alert
      }
      grouped.set(key, current)
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }, [alerts])

  const latestAlerts = alerts.slice(0, 5)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="border-border/50 bg-card/60 py-0 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Thống kê thông số theo farm</CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedFarm ? selectedFarm.name : 'Farm được chọn'} · chỉ xem, không thao tác xử lý cảnh báo.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Thông số</th>
                  <th className="px-4 py-3 text-left font-medium">Tổng</th>
                  <th className="px-4 py-3 text-left font-medium">Mức độ</th>
                  <th className="px-4 py-3 text-left font-medium">Tự động hóa</th>
                  <th className="px-4 py-3 text-left font-medium">Lần gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">{row.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">High {row.high}</Badge>
                        <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Medium {row.medium}</Badge>
                        <Badge className="border-0 bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300">Low {row.low}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.auto > 0 ? 'default' : 'secondary'} className={cn(row.auto > 0 && 'bg-emerald-600 hover:bg-emerald-600')}>
                        {row.auto} lệnh
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.latest ? (
                        <div>
                          <div className="font-medium text-foreground">{new Date(row.latest.triggered_at).toLocaleString('vi-VN')}</div>
                          {row.latest.actual_value != null && row.latest.threshold_value != null && (
                            <div className="text-xs">
                              Giá trị {formatValue(row.latest.actual_value, row.latest.sensor_unit ?? (row.latest.parameter ? SENSOR_UNIT[row.latest.parameter] : ''))}
                              {' '}· Ngưỡng {formatValue(row.latest.threshold_value, row.latest.sensor_unit ?? (row.latest.parameter ? SENSOR_UNIT[row.latest.parameter] : ''))}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/60 py-0 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Cảnh báo gần nhất</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {latestAlerts.map(alert => (
            <div key={alert.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{alert.parameter ? SENSOR_DISPLAY_LABEL[alert.parameter] : 'Cảnh báo hệ thống'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{alert.sensor_name || alert.zone_name || selectedFarm?.name}</div>
                </div>
                <SeverityBadge severity={alert.severity} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{new Date(alert.triggered_at).toLocaleString('vi-VN')}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AlertCard({ alert, onMarkRead }: { alert: Alert; onMarkRead: () => void }) {
  const tone = severityTone(alert.severity)
  const unit = alert.sensor_unit ?? (alert.parameter ? SENSOR_UNIT[alert.parameter] : '')
  const date = new Date(alert.triggered_at)
  const hasRuleValues = alert.parameter && alert.actual_value != null && alert.threshold_value != null
  const deviation = hasRuleValues ? alert.actual_value! - alert.threshold_value! : null
  const thresholdLabel = getThresholdLabel(alert.alert_type)
  const title = getAlertTitle(alert, unit)
  const statusLine = [alert.zone_name, alert.sensor_name].filter(Boolean).join(' • ') || fallbackLocation(alert.message)

  return (
    <Card className={cn('overflow-hidden border-l-4 bg-card/90 py-0 shadow-sm', tone.card)}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tone.iconBg)}>
              {severityIcon(alert.severity)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/80">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{statusLine}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex shrink-0 items-start justify-between gap-3 sm:flex-col sm:items-end">
            <div className="text-right">
              <div className="text-xs font-medium">{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {date.toLocaleDateString('vi-VN')}</div>
              <SeverityBadge severity={alert.severity} />
            </div>
            {!alert.is_read && (
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={onMarkRead}>
                Đánh dấu đã đọc
              </Button>
            )}
            {alert.is_read && (
              <Badge variant="outline" className="bg-background/70">
                <CheckCircle2 className="h-3 w-3" /> Đã đọc
              </Badge>
            )}
          </div>
        </div>

        {hasRuleValues && (
          <>
            <div className="grid border-y border-border/70 sm:grid-cols-3">
              <MetricCell
                label="GIÁ TRỊ ĐO"
                value={`${formatValue(alert.actual_value!, unit)}`}
                subLabel={alert.parameter ? SENSOR_DISPLAY_LABEL[alert.parameter] : 'Thông số'}
                valueClassName={tone.valueText}
              />
              <MetricCell
                label={thresholdLabel.toUpperCase()}
                value={formatValue(alert.threshold_value!, unit)}
                subLabel="Rule engine"
              />
              <MetricCell
                label="CHÊNH LỆCH"
                value={formatSignedValue(deviation!, unit)}
                subLabel={alert.alert_type === 'below_min' ? 'Dưới ngưỡng' : 'Vượt ngưỡng'}
                valueClassName={tone.valueText}
              />
            </div>

            <ThresholdBar
              parameter={alert.parameter!}
              actualValue={alert.actual_value!}
              thresholdValue={alert.threshold_value!}
              unit={unit}
              severity={alert.severity}
            />
          </>
        )}

        <div className="space-y-2 p-4 pt-3">
          {alert.recommended_action && (
            <div className="flex items-start gap-2 rounded-lg bg-lime-100/80 px-3 py-2 text-sm text-lime-950 dark:bg-lime-950/40 dark:text-lime-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
              <span><b>Gợi ý:</b> {alert.recommended_action}</span>
            </div>
          )}

          {alert.automation_status === 'executed' ? (
            <AutomationNotice alert={alert} />
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Chưa có thiết bị tự động được kích hoạt cho cảnh báo này.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCell({
  label,
  value,
  subLabel,
  valueClassName,
}: {
  label: string
  value: string
  subLabel: string
  valueClassName?: string
}) {
  return (
    <div className="border-border/70 px-4 py-3 sm:border-r sm:last:border-r-0">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-base font-bold leading-none', valueClassName)}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subLabel}</div>
    </div>
  )
}

function ThresholdBar({
  parameter,
  actualValue,
  thresholdValue,
  unit,
  severity,
}: {
  parameter: SensorType
  actualValue: number
  thresholdValue: number
  unit: string
  severity: AlertSeverity
}) {
  const tone = severityTone(severity)
  const range = getDisplayRange(parameter, actualValue, thresholdValue)
  const valuePct = toPercent(actualValue, range.min, range.max)
  const thresholdPct = toPercent(thresholdValue, range.min, range.max)

  return (
    <div className="px-4 py-3">
      <div className="relative h-8">
        <span className="absolute top-0 -translate-x-1/2 text-[10px] font-medium text-muted-foreground" style={{ left: `${thresholdPct}%` }}>
          Ngưỡng {formatValue(thresholdValue, unit)}
        </span>
        <span className="absolute top-0 -translate-x-1/2 text-[10px] font-medium text-foreground" style={{ left: `${valuePct}%` }}>
          {formatValue(actualValue, unit)}
        </span>
        <span className="absolute bottom-0 left-0 text-[10px] font-semibold">{formatValue(range.min, unit)}</span>
        <span className="absolute bottom-0 right-0 text-[10px] font-semibold">{formatValue(range.max, unit)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className={cn('absolute left-0 top-0 h-full rounded-full', tone.progress)} style={{ width: `${valuePct}%` }} />
        <div className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-foreground" style={{ left: `${thresholdPct}%` }} />
        <div className={cn('absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full', tone.marker)} style={{ left: `${valuePct}%` }} />
      </div>
    </div>
  )
}

function AutomationNotice({ alert }: { alert: Alert }) {
  const topic = extractTopic(alert.automation_action)
  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-100/80 px-3 py-2 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-200">
      <Zap className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <b>Tự động hoá đã kích hoạt:</b> Gửi lệnh{' '}
        {alert.automation_command && (
          <code className="rounded bg-blue-200/70 px-1 py-0.5 text-xs dark:bg-blue-900">
            {alert.automation_command}
          </code>
        )}{' '}
        {alert.automation_device_name && <>→ {alert.automation_device_name}</>}
        {topic && (
          <>
            {' '}
            <code className="rounded bg-blue-200/70 px-1 py-0.5 text-xs dark:bg-blue-900">{topic}</code>
          </>
        )}
        {!alert.automation_command && !alert.automation_device_name && (alert.automation_action || 'Thiết bị liên kết đã được điều khiển.')}
      </span>
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

function getAlertTitle(alert: Alert, unit: string) {
  if (!alert.parameter) return alert.message
  const label = SENSOR_DISPLAY_LABEL[alert.parameter] || SENSOR_LABEL[alert.parameter]
  const direction = alert.alert_type === 'below_min' ? 'dưới ngưỡng tối thiểu' : alert.severity === 'high' ? 'vượt ngưỡng nguy hiểm' : 'vượt ngưỡng tối đa'
  const diff = alert.actual_value != null && alert.threshold_value != null ? alert.actual_value - alert.threshold_value : null
  return `${label} ${direction}${diff != null ? ` — lệch ${formatSignedValue(diff, unit)}` : ''}`
}

function getThresholdLabel(alertType: AlertType) {
  return alertType === 'below_min' ? 'Ngưỡng tối thiểu' : 'Ngưỡng tối đa'
}

function getDisplayRange(parameter: SensorType, actual: number, threshold: number) {
  const base = SENSOR_RANGE[parameter]
  const min = Math.min(base.min, actual, threshold)
  const max = Math.max(base.max, actual, threshold)
  return min === max ? { min: min - 1, max: max + 1 } : { min, max }
}

function toPercent(value: number, min: number, max: number) {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

function formatValue(value: number, unit: string) {
  const digits = Math.abs(value) >= 1000 ? 0 : unit === '' ? 2 : 1
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`
}

function formatSignedValue(value: number, unit: string) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatValue(value, unit)}`
}

function fallbackLocation(message: string) {
  const match = message.match(/^\[([^\]]+)\]\s*([^:]+)?/)
  if (!match) return 'Khu vực cảm biến'
  return [match[1], match[2]].filter(Boolean).join(' • ')
}

function extractTopic(text?: string) {
  if (!text) return ''
  const match = text.match(/tới\s+([^;]+)/i)
  return match?.[1]?.replace(/`/g, '').trim() || ''
}

function severityTone(severity: AlertSeverity) {
  switch (severity) {
    case 'high':
      return {
        card: 'border-l-red-500',
        iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300',
        badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
        valueText: 'text-red-600 dark:text-red-300',
        progress: 'bg-red-500',
        marker: 'bg-red-600',
      }
    case 'medium':
      return {
        card: 'border-l-amber-500',
        iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        valueText: 'text-amber-600 dark:text-amber-300',
        progress: 'bg-amber-500',
        marker: 'bg-amber-600',
      }
    case 'low':
      return {
        card: 'border-l-yellow-500',
        iconBg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
        valueText: 'text-yellow-700 dark:text-yellow-300',
        progress: 'bg-emerald-600',
        marker: 'bg-yellow-600',
      }
  }
}

function severityIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'high': return <AlertCircle className="h-4 w-4" />
    case 'medium': return <AlertTriangle className="h-4 w-4" />
    case 'low': return <Info className="h-4 w-4" />
  }
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const label: Record<AlertSeverity, string> = {
    high: 'Nghiêm trọng',
    medium: 'Trung bình',
    low: 'Mức thấp',
  }
  return (
    <Badge className={cn('mt-1 border-0 px-2 py-0.5 text-[11px] font-semibold', severityTone(severity).badge)}>
      {label[severity]}
    </Badge>
  )
}
