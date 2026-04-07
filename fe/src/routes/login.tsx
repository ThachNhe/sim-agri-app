import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useLogin } from '@/hooks/useAuth';

export const Route = createFileRoute('/login')({
    component: LoginPage,
});

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

function LoginPage() {
    const login = useLogin();
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', password: '' },
    });

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden">
            <div className="bg-primary/10 pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
            <div className="bg-primary/10 pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/2 rounded-full blur-3xl" />

            <Card className="border-border/50 bg-card/80 z-10 w-full max-w-sm shadow-2xl backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="bg-primary/20 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                            <Leaf className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        AgriSmart
                    </CardTitle>
                    <CardDescription>
                        Đăng nhập vào hệ thống quản lý
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={form.handleSubmit((data) =>
                            login.mutate(data)
                        )}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                {...form.register('email')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                {...form.register('password')}
                            />
                        </div>
                        {login.isError && (
                            <p className="text-destructive text-sm font-medium">
                                Tài khoản hoặc mật khẩu không đúng!
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="text-md w-full font-semibold"
                            disabled={login.isPending}
                        >
                            {login.isPending
                                ? 'Đang đăng nhập...'
                                : 'Đăng nhập'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
