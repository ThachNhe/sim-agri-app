import { BellRing, Cpu, LayoutDashboard } from 'lucide-react'
import { LayoutShell, type LayoutNavItem } from './LayoutShell'

const farmerNavItems: LayoutNavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Tổng quan của tôi' },
    { to: '/devices', icon: <Cpu size={20} />, label: 'Thiết bị của tôi' },
    { to: '/alerts', icon: <BellRing size={20} />, label: 'Cảnh báo của tôi' },
]

export function FarmerLayout() {
    return (
        <LayoutShell
            roleLabel="Nông dân"
            title="Trang trại của bạn"
            subtitle="Theo dõi thiết bị và cảnh báo thuộc quyền quản lý của bạn."
            navItems={farmerNavItems}
        />
    )
}