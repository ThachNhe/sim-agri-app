import { BellRing, Cpu, LayoutDashboard, Users } from 'lucide-react'
import { LayoutShell, type LayoutNavItem } from './LayoutShell'

const adminNavItems: LayoutNavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard theo farm' },
  { to: '/devices', icon: <Cpu size={20} />, label: 'Thiết bị theo farm' },
  { to: '/alerts', icon: <BellRing size={20} />, label: 'Cảnh báo theo farm' },
  { to: '/users', icon: <Users size={20} />, label: 'Nông dân' },
]

export function AdminLayout() {
  return (
    <LayoutShell
      roleLabel="Quản trị viên"
      title="Điều hành toàn hệ thống"
      subtitle="Chọn một farm để xem số liệu, thiết bị và cảnh báo tương ứng."
      navItems={adminNavItems}
    />
  )
}
