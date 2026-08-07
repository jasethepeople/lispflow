"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  Code2, 
  Play, 
  History, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  ChevronRight,
  Activity
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// Mock data for demo
const MOCK_CUSTOMERS = [
  { id: "cust-42", name: "Acme Corp", email: "billing@acme.com", total_billed: 15420.50, currency: "USD", active_plan: "Pro Tier", last_eval: "2026-07-28T14:30:00Z" },
  { id: "cust-88", name: "Globex Inc", email: "finance@globex.com", total_billed: 8930.25, currency: "USD", active_plan: "Enterprise", last_eval: "2026-07-28T12:15:00Z" },
  { id: "cust-15", name: "Initech", email: "accounting@initech.com", total_billed: 3420.00, currency: "USD", active_plan: "Starter", last_eval: "2026-07-27T09:00:00Z" },
  { id: "cust-73", name: "Umbrella Corp", email: "billing@umbrella.net", total_billed: 45200.75, currency: "USD", active_plan: "Enterprise", last_eval: "2026-07-28T16:45:00Z" },
];

const MOCK_STATS = {
  total_revenue: 72971.50,
  total_evaluations: 1245893,
  avg_eval_time_ms: 2.4,
  active_plans: 47,
  customers: 128,
};

const MOCK_RECENT_EVALS = [
  { customer: "Acme Corp", cost: 127.50, dimensions: { compute_units: 3200, storage_gb: 4500, egress_gb: 180 }, time: "2026-07-28T14:30:00Z", duration_ms: 3 },
  { customer: "Globex Inc", cost: 89.20, dimensions: { requests: 8920, bandwidth_gb: 45 }, time: "2026-07-28T14:28:00Z", duration_ms: 2 },
  { customer: "Umbrella Corp", cost: 340.00, dimensions: { compute_units: 8500, storage_gb: 12000, egress_gb: 520 }, time: "2026-07-28T14:25:00Z", duration_ms: 4 },
];

export default function HomePage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-lisp-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LispFlow</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Programmable Billing Engine</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 text-sm font-medium rounded-md bg-lisp-50 text-lisp-700 dark:bg-lisp-950 dark:text-lisp-300">
              Dashboard
            </Link>
            <Link href="/editor" className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Plan Editor
            </Link>
            <Link href="/simulate" className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Simulate
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard 
            icon={<DollarSign className="w-4 h-4" />} 
            label="Total Revenue" 
            value={formatCurrency(MOCK_STATS.total_revenue)} 
            trend="+12.5%" 
            trendUp 
          />
          <StatCard 
            icon={<Zap className="w-4 h-4" />} 
            label="Evaluations" 
            value={MOCK_STATS.total_evaluations.toLocaleString()} 
            trend="+8.2%" 
            trendUp 
          />
          <StatCard 
            icon={<Clock className="w-4 h-4" />} 
            label="Avg Eval Time" 
            value={`${MOCK_STATS.avg_eval_time_ms}ms`} 
            trend="-15%" 
            trendUp={false} 
          />
          <StatCard 
            icon={<Code2 className="w-4 h-4" />} 
            label="Active Plans" 
            value={MOCK_STATS.active_plans.toString()} 
          />
          <StatCard 
            icon={<Users className="w-4 h-4" />} 
            label="Customers" 
            value={MOCK_STATS.customers.toString()} 
            trend="+3" 
            trendUp 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customers List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-lisp-600" />
                  Customers
                </h2>
                <Link href="/customers/new" className="text-sm text-lisp-600 hover:text-lisp-700 font-medium">
                  + New Customer
                </Link>
              </div>
              <div className="divide-y">
                {MOCK_CUSTOMERS.map((customer) => (
                  <div 
                    key={customer.id}
                    className={cn(
                      "px-6 py-4 flex items-center justify-between cursor-pointer transition-colors",
                      selectedCustomer === customer.id 
                        ? "bg-lisp-50 dark:bg-lisp-950/30" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                    onClick={() => setSelectedCustomer(customer.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-lisp-100 dark:bg-lisp-900 flex items-center justify-center text-lisp-700 dark:text-lisp-300 font-bold text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.id} · {customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(customer.total_billed)}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-lisp-100 text-lisp-800 dark:bg-lisp-900 dark:text-lisp-300">
                        {customer.active_plan}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Evaluations */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
              <div className="px-6 py-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-lisp-600" />
                  Recent Evaluations
                </h2>
              </div>
              <div className="divide-y">
                {MOCK_RECENT_EVALS.map((eval_, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-lisp-500" />
                      <div>
                        <p className="text-sm font-medium">{eval_.customer}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {Object.entries(eval_.dimensions).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-lisp-700 dark:text-lisp-400">{formatCurrency(eval_.cost)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(eval_.time)} · {eval_.duration_ms}ms</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link 
                  href="/editor" 
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-lisp-400 hover:bg-lisp-50 dark:hover:bg-lisp-950/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-lisp-100 dark:bg-lisp-900 flex items-center justify-center group-hover:bg-lisp-200 dark:group-hover:bg-lisp-800 transition-colors">
                    <Code2 className="w-5 h-5 text-lisp-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Plan Editor</p>
                    <p className="text-xs text-muted-foreground">Build pricing with drag & drop</p>
                  </div>
                </Link>
                <Link 
                  href="/simulate" 
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-lisp-400 hover:bg-lisp-50 dark:hover:bg-lisp-950/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Run Simulation</p>
                    <p className="text-xs text-muted-foreground">Test plans against history</p>
                  </div>
                </Link>
                <Link 
                  href="/validate" 
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-lisp-400 hover:bg-lisp-50 dark:hover:bg-lisp-950/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-800 transition-colors">
                    <Play className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Validate Plan</p>
                    <p className="text-xs text-muted-foreground">Check syntax before deploy</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4">System Health</h3>
              <div className="space-y-3">
                <HealthItem label="API Server" status="healthy" latency="12ms" />
                <HealthItem label="Billing Engine" status="healthy" latency="2ms" />
                <HealthItem label="PostgreSQL" status="healthy" latency="4ms" />
                <HealthItem label="Redis" status="healthy" latency="1ms" />
                <HealthItem label="Worker Pool" status="healthy" latency="8ms" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendUp }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  trend?: string; 
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {trend && (
        <p className={cn("text-xs font-medium mt-1", trendUp ? "text-lisp-600" : "text-red-500")}>
          {trend} from last month
        </p>
      )}
    </div>
  );
}

function HealthItem({ label, status, latency }: { label: string; status: string; latency: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", status === "healthy" ? "bg-lisp-500" : "bg-red-500")} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground font-mono">{latency}</span>
    </div>
  );
}
