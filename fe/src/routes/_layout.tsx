import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { FarmerLayout } from '@/components/layout/FarmerLayout'
import { useAuthStore } from '@/stores/useAuthStore'

export const Route = createFileRoute('/_layout')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: LayoutByRole,
})

function LayoutByRole() {
  const role = useAuthStore(s => s.user?.role)

  return role === 'admin' ? <AdminLayout /> : <FarmerLayout />
}
