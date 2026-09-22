import { useState } from 'react'
import { BarChart3, BrainCircuit, Clock3, FileChartColumn, FileSpreadsheet, FlaskConical, GitCompareArrows, LayoutDashboard, LogOut, Menu, Settings, Sparkles, UserRound, WandSparkles, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/predict', label: 'Predict Performance', icon: Sparkles },
  { to: '/batch-predict', label: 'Batch Prediction', icon: FileSpreadsheet },
  { to: '/what-if', label: 'What-If Simulator', icon: FlaskConical },
  { to: '/compare', label: 'Student Comparison', icon: GitCompareArrows },
  { to: '/insights', label: 'AI Insights', icon: WandSparkles },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/model', label: 'Model Performance', icon: FileChartColumn },
  { to: '/about', label: 'About', icon: BrainCircuit },
]

const titles = {
  '/dashboard': ['Student Performance Dashboard', 'Overview of your academic profile and predicted performance.'],
  '/predict': ['Predict Your Performance', 'Tell us about your academic profile and learning environment.'],
  '/predict/result': ['Prediction Result', 'Your latest estimate and personalized recommendations.'],
  '/batch-predict': ['Batch Prediction', 'Upload multiple student profiles to generate performance predictions.'],
  '/what-if': ['What-If Simulator', 'Explore how different student profiles change the model-estimated exam score.'],
  '/compare': ['Student Comparison', 'Compare performance estimates and key learning factors.'],
  '/insights': ['AI Performance Insights', 'Understand your model-estimated performance and the areas highlighted by your profile.'],
  '/analytics': ['Student Performance Analytics', 'Explore patterns observed in the student performance dataset.'],
  '/model': ['Model Performance', 'A transparent view of the baseline regression workflow.'],
  '/about': ['How Student Performance AI Works', 'A clear path from data to personalized insight.'],
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [title, description] = titles[location.pathname] || titles['/dashboard']
  const initials = user?.fullName?.split(' ').map(part => part[0]).slice(0, 2).join('') || 'SP'

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}><span className="rounded-xl bg-indigo-600 p-2 text-white"><BrainCircuit size={20} /></span><span className="text-sm font-extrabold tracking-tight">Student Performance AI</span></NavLink>
        <button className="text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <nav className="mt-12 space-y-1">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} />{label}</NavLink>)}
        <NavLink to="/history" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><Clock3 size={18} />History</NavLink>
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-4">
        <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><UserRound size={18} />{user?.fullName || 'Profile'}</Link>
        <Link to="/settings" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><Settings size={18} />Settings</Link>
        <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50" onClick={() => { logout(); navigate('/login') }}><LogOut size={18} />Logout</button>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
    <main className="min-h-screen lg:ml-72">
      <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:px-10">
        <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><h1 className="text-lg font-extrabold text-slate-950">{title}</h1><p className="hidden text-xs text-slate-500 sm:block">{description}</p></div></div>
        <div className="relative">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" aria-label={`Account for ${user?.fullName || 'student'}`} aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>{initials}</button>
          {accountOpen && <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-soft"><p className="border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-800">{user?.fullName || 'Student account'}</p><Link to="/profile" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><UserRound size={16} />Profile</Link><Link to="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Settings size={16} />Settings</Link><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={() => { setAccountOpen(false); logout(); navigate('/login') }}><LogOut size={16} />Logout</button></div>}
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10"><Outlet /></div>
    </main>
  </div>
}
