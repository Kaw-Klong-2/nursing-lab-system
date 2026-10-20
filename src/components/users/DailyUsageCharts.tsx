'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Clock,
  Users,
  Activity,
  RefreshCw,
  Calendar,
  Smartphone,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface DailyUsageChartsProps {
  actorId: string;
}

export default function DailyUsageCharts({ actorId }: DailyUsageChartsProps) {
  const [range, setRange] = useState<'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS'>('TODAY');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isManual = false) => {
    if (!actorId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/users/analytics?range=${range}`, {
        headers: { 'x-user-id': actorId },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load user analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, actorId]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-6">
      {/* Top Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>สถิติการเข้าใช้งานและกิจกรรมรายวัน (Daily Usage & Activity Analytics)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            สรุปจำนวนผู้เข้าสู่ระบบ ช่วงเวลาที่มีการใช้งานหนาแน่น และประเภทธุรกรรมในห้องปฏิบัติการ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            {[
              { key: 'TODAY', label: 'วันนี้' },
              { key: 'YESTERDAY', label: 'เมื่อวาน' },
              { key: '7DAYS', label: '7 วันล่าสุด' },
              { key: '30DAYS', label: '30 วันล่าสุด' },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setRange(btn.key as any)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  range === btn.key
                    ? 'bg-teal-600 text-white shadow-sm font-extrabold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-sm"
            title="รีเฟรชข้อมูลสถิติ"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner message="กำลังประมวลผลข้อมูลสถิติรายวัน..." />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-slate-400 text-xs">ไม่สามารถโหลดข้อมูลสถิติได้</div>
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">กิจกรรมทั้งหมด</span>
                <strong className="text-lg font-black text-slate-800 dark:text-white">
                  {data.summary?.totalActivities?.toLocaleString() || 0}
                </strong>
                <span className="text-[10px] text-slate-400 block">รายการ</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">ผู้ใช้ที่เคลื่อนไหว</span>
                <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {data.summary?.uniqueUsersCount?.toLocaleString() || 0}
                </strong>
                <span className="text-[10px] text-slate-400 block">คน (Unique)</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">ผ่านคอมพิวเตอร์</span>
                <strong className="text-lg font-black text-sky-600 dark:text-sky-400">
                  {data.summary?.desktopCount?.toLocaleString() || 0}
                </strong>
                <span className="text-[10px] text-slate-400 block">ครั้ง (Desktop)</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">ผ่านสมาร์ทโฟน</span>
                <strong className="text-lg font-black text-purple-600 dark:text-purple-400">
                  {data.summary?.mobileCount?.toLocaleString() || 0}
                </strong>
                <span className="text-[10px] text-slate-400 block">ครั้ง (Mobile)</span>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Hourly Timeline & Transaction Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Hourly Activity Timeline */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  ความหนาแน่นของกิจกรรมรายชั่วโมง (08:00 - 18:00 น.)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">ยอดรวมกิจกรรม</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.hourlyTimeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                              <p className="font-bold text-teal-400">เวลา {item.hour} น.</p>
                              <p className="text-[11px] text-slate-300 mt-1">กิจกรรมทั้งหมด: <strong>{item.count}</strong> ครั้ง</p>
                              <p className="text-[11px] text-sky-300">เข้าสู่ระบบ: {item.logins} ครั้ง</p>
                              <p className="text-[11px] text-indigo-300">ทำรายการอื่นๆ: {item.transactions} ครั้ง</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#hourlyGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Transaction Breakdown Bar Chart */}
            <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  จำแนกตามประเภทรายการที่เข้ามาทำ
                </span>
                <span className="text-[10px] text-slate-500 font-medium">จำนวนครั้ง</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.transactionBreakdown || []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                              <p className="font-bold text-white">{item.name}</p>
                              <p className="text-teal-300 mt-1">จำนวน: <strong>{item.count}</strong> รายการ</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {(data.transactionBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart Row 2: Active Users by Role (Donut) & Role Breakdown Cards */}
          <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                สัดส่วนผู้เข้าใช้งานแยกตามบทบาท (Active Users by Role)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">นับเฉพาะผู้ใช้ที่ไม่ซ้ำคน</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-3">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.usersByRole || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {(data.usersByRole || []).map((entry: any, index: number) => (
                        <Cell key={`role-cell-${index}`} fill={entry.fill || '#0d9488'} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2 rounded-xl text-xs shadow-xl border border-slate-700">
                              <p className="font-bold text-white">{item.name}</p>
                              <p className="text-teal-300">เข้าใช้งาน: <strong>{item.count}</strong> คน</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {(data.usersByRole || []).map((r: any) => (
                  <div key={r.role} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.fill }} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{r.count} คน</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
