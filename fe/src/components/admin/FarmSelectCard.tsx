import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { User } from '@/types/common.types'

interface FarmSelectCardProps {
    farms: User[]
    value: string
    onValueChange: (value: string) => void
    title: string
    description: string
    placeholder: string
    emptyMessage: string
    loadingMessage: string
    isLoading?: boolean
    className?: string
}

export function FarmSelectCard({
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
}: FarmSelectCardProps) {
    return (
        <Card className={cn('border-border/50 bg-card/60 shadow-sm backdrop-blur', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                        {loadingMessage}
                    </div>
                ) : farms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
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
            </CardContent>
        </Card>
    )
}