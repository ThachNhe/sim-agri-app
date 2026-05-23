import { BellRing, LayoutDashboard, MapPin, Radio, Settings2 } from 'lucide-react'
import { LayoutShell, type LayoutNavItem } from './LayoutShell'

const farmerNavItems: LayoutNavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Tổng quan' },
    { to: '/zones', icon: <MapPin size={20} />, label: 'Khu vực trồng trọt' },
    { to: '/sensors', icon: <Radio size={20} />, label: 'Cảm biến & Dữ liệu' },
    { to: '/devices', icon: <Settings2 size={20} />, label: 'Điều khiển thiết bị' },
    { to: '/alerts', icon: <BellRing size={20} />, label: 'Cảnh báo' },
]

export function FarmerLayout() {
    return (
        <LayoutShell
            roleLabel="Nông dân"
            title="Hệ thống canh tác thông minh"
            subtitle="Theo dõi thông số môi trường và điều chỉnh để cây trồng phát triển tốt nhất."
            navItems={farmerNavItems}
        />
    )
}
