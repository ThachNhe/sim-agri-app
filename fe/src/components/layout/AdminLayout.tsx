import { BellRing, Cpu, LayoutDashboard, Users } from 'lucide-react'
import { LayoutShell, type LayoutNavItem } from './LayoutShell'

const adminNavItems: LayoutNavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard hệ thống' },
  { to: '/devices', icon: <Cpu size={20} />, label: 'Thiết bị toàn hệ thống' },
  { to: '/alerts', icon: <BellRing size={20} />, label: 'Cảnh báo hệ thống' },
  { to: '/users', icon: <Users size={20} />, label: 'Người dùng' },
]

export function AdminLayout() {
  return (
    <LayoutShell
      roleLabel="Quản trị viên"
      title="Điều hành toàn hệ thống"
      subtitle="Giám sát thiết bị, cảnh báo và tài khoản trên toàn nền tảng."
      navItems={adminNavItems}
    />
  )
}
