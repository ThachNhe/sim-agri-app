import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogin } from '@/hooks/useAuth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

function LoginPage() {
  const login = useLogin()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@example.com', password: 'admin123' },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
      
      <Card className="w-full max-w-sm z-10 border-border/50 shadow-2xl backdrop-blur-sm bg-card/80">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
               <Leaf className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">AgriSmart</CardTitle>
          <CardDescription>Đăng nhập vào hệ thống quản lý</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(data => login.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            {login.isError && (
              <p className="text-sm text-destructive font-medium">Tài khoản hoặc mật khẩu không đúng!</p>
            )}
            <Button type="submit" className="w-full text-md font-semibold" disabled={login.isPending}>
              {login.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
