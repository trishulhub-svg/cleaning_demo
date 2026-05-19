'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  LogOut,
  MapPin,
  Pencil,
  QrCode,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
  X,
  Mail,
  Phone,
  Home,
  CalendarCheck,
  FileText,
  ChevronDown,
  Menu,
  Loader2,
  CheckCircle2,
  CircleDot,
  XCircle,
  AlertCircle,
  Inbox,
  Eye,
  Lock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { CancelBookingModal, type BookingForCancel } from './cancel-booking-modal'
import { RescheduleModal, type BookingForReschedule } from './reschedule-modal'
import {
  updateProfile,
  changePassword,
  type ActionResult,
} from './actions'
import { CURRENCY } from '@/lib/constants'

// ============ Types ============

type Booking = {
  id: number
  serviceId: number
  service: { id: number; name: string; description: string }
  bookingDate: string
  bookingTime: string
  address: string
  accessNotes: string | null
  totalPrice: number
  paymentStatus: string
  paymentMethod: string | null
  bookingStatus: string
  assignedStaffId: number | null
  qrCompletionCode: string | null
  createdAt: string
  updatedAt: string | null
}

type Refund = {
  id: number
  bookingId: number
  amount: number
  refundType: string
  status: string
  reason: string | null
  requestedAt: string
  processedAt: string | null
  booking: {
    id: number
    service: { name: string }
    bookingDate: string
  }
}

type UserProfile = {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  role: string
  emailVerified: boolean
  createdAt: string
}

type DashboardClientProps = {
  user: UserProfile
  bookings: Booking[]
  refunds: Refund[]
}

type BookingFilter = 'all' | 'pending' | 'completed'

// ============ Helpers ============

function formatBookingDateTime(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time}`)
    return {
      date: format(d, 'd MMM yyyy'),
      time: format(d, 'h:mm a'),
      full: format(d, 'd MMM yyyy, h:mm a'),
    }
  } catch {
    return { date, time, full: `${date} ${time}` }
  }
}

function canCancel(booking: Booking): boolean {
  if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') return false
  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
  return bookingDateTime.getTime() - Date.now() > 0
}

function canReschedule(booking: Booking): boolean {
  if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') return false
  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
  const diffHours = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
  return diffHours > 24
}

// ============ Badge Components ============

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    },
    completed: {
      label: 'Completed',
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    },
    cash_pending: {
      label: 'Cash Pending',
      className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    },
  }

  const c = config[status] || { label: status, className: '' }

  return (
    <Badge variant="outline" className={c.className}>
      <CircleDot className="h-3 w-3 mr-0.5" />
      {c.label}
    </Badge>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    paid: {
      label: 'Paid',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
      icon: Clock,
    },
    cash_on_service: {
      label: 'Cash on Service',
      className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
      icon: DollarSign,
    },
  }

  const c = config[status] || { label: status, className: '', icon: CircleDot }
  const Icon = c.icon

  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="h-3 w-3 mr-0.5" />
      {c.label}
    </Badge>
  )
}

function RefundStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
    },
    approved: {
      label: 'Approved',
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    },
    processing: {
      label: 'Processing',
      className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    },
  }

  const c = config[status] || { label: status, className: '' }

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

// ============ Main Component ============

export default function DashboardClient({
  user,
  bookings: initialBookings,
  refunds: initialRefunds,
}: DashboardClientProps) {
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = React.useState('bookings')
  const [filter, setFilter] = React.useState<BookingFilter>('all')
  const [search, setSearch] = React.useState('')
  const [bookings, setBookings] = React.useState<Booking[]>(initialBookings)
  const [refunds, setRefunds] = React.useState<Refund[]>(initialRefunds)

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false)
  const [cancelBookingData, setCancelBookingData] = React.useState<BookingForCancel | null>(null)

  // Reschedule modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false)
  const [rescheduleBookingData, setRescheduleBookingData] = React.useState<BookingForReschedule | null>(null)

  // Profile form
  const [profileName, setProfileName] = React.useState(user.name || '')
  const [profilePhone, setProfilePhone] = React.useState(user.phone || '')
  const [profileAddress, setProfileAddress] = React.useState(user.address || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Filter bookings
  const filteredBookings = React.useMemo(() => {
    let result = bookings

    if (filter !== 'all') {
      if (filter === 'pending') {
        result = result.filter(
          (b) => b.bookingStatus === 'pending' || b.bookingStatus === 'confirmed'
        )
      } else if (filter === 'completed') {
        result = result.filter(
          (b) => b.bookingStatus === 'completed' || b.bookingStatus === 'cancelled'
        )
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.service.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.bookingDate.includes(q) ||
          b.bookingTime.includes(q)
      )
    }

    return result
  }, [bookings, filter, search])

  // Handlers
  function openCancelModal(booking: Booking) {
    setCancelBookingData({
      id: booking.id,
      service: booking.service,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      totalPrice: booking.totalPrice,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      address: booking.address,
    })
    setCancelModalOpen(true)
  }

  function openRescheduleModal(booking: Booking) {
    setRescheduleBookingData({
      id: booking.id,
      service: booking.service,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      totalPrice: booking.totalPrice,
      bookingStatus: booking.bookingStatus,
    })
    setRescheduleModalOpen(true)
  }

  function handleBookingAction() {
    // Refresh data after cancel/reschedule
    router.refresh()
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      const result: ActionResult = await updateProfile({
        name: profileName,
        phone: profilePhone,
        address: profileAddress,
      })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setIsChangingPassword(true)
    try {
      const result: ActionResult = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      if (result.success) {
        toast.success(result.message)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Nav items
  const navItems = [
    { id: 'bookings', label: 'My Bookings', icon: CalendarDays, count: bookings.length },
    { id: 'refunds', label: 'My Refunds', icon: CreditCard, count: refunds.length },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your bookings, refunds, and account settings from one place.
          </p>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden mb-6">
          <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setSidebarOpen(false)
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap min-w-0 ${
                  activeTab === item.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {item.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && (
                    <Badge
                      variant={activeTab === item.id ? 'default' : 'secondary'}
                      className={`h-5 px-1.5 text-xs ${
                        activeTab === item.id ? 'bg-primary/20 text-primary' : ''
                      }`}
                    >
                      {item.count}
                    </Badge>
                  )}
                </button>
              ))}

              <Separator className="my-4" />

              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                asChild
              >
                <Link href="/logout">
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </Link>
              </Button>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* ============ BOOKINGS TAB ============ */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-2 flex-wrap">
                        <Select
                          value={filter}
                          onValueChange={(v) => setFilter(v as BookingFilter)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Bookings</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search bookings..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bookings Table */}
                {filteredBookings.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead>Service</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead className="hidden md:table-cell">Address</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Payment</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBookings.map((booking, idx) => {
                              const { date, time } = formatBookingDateTime(booking.bookingDate, booking.bookingTime)
                              const isCancelled = booking.bookingStatus === 'cancelled'
                              const isCompleted = booking.bookingStatus === 'completed'
                              const cancelAllowed = canCancel(booking)
                              const rescheduleAllowed = canReschedule(booking)

                              return (
                                <TableRow
                                  key={booking.id}
                                  className={idx % 2 === 1 ? 'bg-muted/20' : ''}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                        <CalendarDays className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm truncate max-w-[140px]">
                                          {booking.service.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground md:hidden">
                                          {booking.address}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <p className="font-medium">{date}</p>
                                      <p className="text-muted-foreground">{time}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex items-start gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                      <span className="text-sm truncate max-w-[180px]">
                                        {booking.address}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-semibold text-sm">
                                      {CURRENCY}{booking.totalPrice.toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge status={booking.bookingStatus} />
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <PaymentBadge status={booking.paymentStatus} />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {booking.qrCompletionCode && !isCancelled && !isCompleted && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8"
                                          asChild
                                        >
                                          <Link href="/scan-qr">
                                            <QrCode className="h-3.5 w-3.5" />
                                            <span className="hidden xl:inline">Scan QR</span>
                                          </Link>
                                        </Button>
                                      )}
                                      {rescheduleAllowed && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8"
                                          onClick={() => openRescheduleModal(booking)}
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                          <span className="hidden xl:inline">Reschedule</span>
                                        </Button>
                                      )}
                                      {cancelAllowed && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => openCancelModal(booking)}
                                        >
                                          <XCircle className="h-3.5 w-3.5" />
                                          <span className="hidden xl:inline">Cancel</span>
                                        </Button>
                                      )}
                                      {isCancelled || isCompleted || !cancelAllowed ? (
                                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                                          {isCancelled ? '—' : isCompleted ? '—' : ''}
                                        </span>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-16">
                      <div className="text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <CalendarDays className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {search ? 'No bookings found' : 'No bookings yet'}
                          </h3>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {search
                              ? 'Try adjusting your search or filter criteria.'
                              : 'You haven\'t made any bookings yet. Browse our services and book your first cleaning!'}
                          </p>
                        </div>
                        {!search && (
                          <Button asChild>
                            <Link href="/services">
                              Browse Services
                              <ChevronDown className="ml-1 h-4 w-4 rotate-[-90deg]" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ============ REFUNDS TAB ============ */}
            {activeTab === 'refunds' && (
              <div className="space-y-4">
                {refunds.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead>Refund ID</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Requested</TableHead>
                              <TableHead className="hidden md:table-cell">Processed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {refunds.map((refund, idx) => (
                              <TableRow
                                key={refund.id}
                                className={idx % 2 === 1 ? 'bg-muted/20' : ''}
                              >
                                <TableCell>
                                  <span className="font-mono text-sm">RF-{String(refund.id).padStart(5, '0')}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-sm">
                                    {CURRENCY}{refund.amount.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="capitalize">
                                    {refund.refundType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <RefundStatusBadge status={refund.status} />
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                  {format(new Date(refund.requestedAt), 'd MMM yyyy')}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {refund.processedAt
                                    ? format(new Date(refund.processedAt), 'd MMM yyyy')
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-16">
                      <div className="text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">No refunds yet</h3>
                          <p className="text-muted-foreground mt-1 text-sm max-w-md mx-auto">
                            When you cancel a paid booking, refunds will appear here. Refunds of 90% are available
                            when cancelling more than 24 hours before the scheduled booking. Cancellations within
                            24 hours are not eligible for a refund.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>&gt;24h before: 90% refund</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span>&lt;24h before: No refund</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ============ PROFILE TAB ============ */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal details and contact information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-name">
                            Full Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="profile-name"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Your full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-email">Email</Label>
                          <Input
                            id="profile-email"
                            value={user.email}
                            disabled
                            className="bg-muted/50"
                          />
                          <p className="text-xs text-muted-foreground">
                            Email cannot be changed. Contact support if needed.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-phone">Phone Number</Label>
                          <Input
                            id="profile-phone"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            placeholder="Your phone number"
                            type="tel"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-address">Address</Label>
                          <Input
                            id="profile-address"
                            value={profileAddress}
                            onChange={(e) => setProfileAddress(e.target.value)}
                            placeholder="Your address"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isUpdatingProfile}>
                          {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Change Password Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Change Password
                    </CardTitle>
                    <CardDescription>
                      Ensure your account is using a strong, unique password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Current Password <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">
                            New Password <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">
                            Confirm New Password <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                        >
                          {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                          Update Password
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Account Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{user.email}</span>
                        {user.emailVerified && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Member since:</span>
                        <span className="font-medium">
                          {format(new Date(user.createdAt), 'd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <CancelBookingModal
        booking={cancelBookingData}
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onCancelled={handleBookingAction}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={rescheduleBookingData}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onRescheduled={handleBookingAction}
      />
    </div>
  )
}
