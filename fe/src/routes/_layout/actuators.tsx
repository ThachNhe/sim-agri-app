import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/actuators')({
  beforeLoad: () => {
    throw redirect({ to: '/devices' })
  },
})
