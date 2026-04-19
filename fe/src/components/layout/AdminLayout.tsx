import { BellRing, LayoutDashboard, Leaf, MapPin, Radio, Settings2, Users } from 'lucide-react'
import { LayoutShell, type LayoutNavItem } from './LayoutShell'

const adminNavItems: LayoutNavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard tổng quan' },
  { to: '/zones', icon: <MapPin size={20} />, label: 'Khu vực trồng trọt' },
  { to: '/sensors', icon: <Radio size={20} />, label: 'Cảm biến & Dữ liệu' },
  { to: '/actuators', icon: <Settings2 size={20} />, label: 'Điều khiển thiết bị' },
  { to: '/alerts', icon: <BellRing size={20} />, label: 'Cảnh báo hệ thống' },
  { to: '/plant-profiles', icon: <Leaf size={20} />, label: 'Hồ sơ cây trồng' },
  { to: '/users', icon: <Users size={20} />, label: 'Nông dân' },
]

export function AdminLayout() {
  return (
    <LayoutShell
      roleLabel="Quản trị viên"
      title="Điều hành hệ thống canh tác"
      subtitle="Quản lý hồ sơ cây trồng, khu vực canh tác và theo dõi toàn hệ thống."
      navItems={adminNavItems}
    />
  )
}
