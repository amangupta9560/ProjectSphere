import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, GraduationCap, LayoutDashboard, FolderOpen, Bell,
  CheckCircle, XCircle, FileText, RefreshCw, MessageSquare,
  Clock, Send, AlertCircle, Download, Calendar,
  Megaphone, Pin, Plus, X, Trash2, Users, Search,
  Filter, ChevronDown, ChevronUp, ExternalLink, User, BarChart2,
  AlertTriangle, BookOpen, UserCheck, TrendingUp, HelpCircle,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import Sidebar from '../Components/Sidebar';
import HeaderNotificationBell from '../Components/HeaderNotificationBell';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const HOD_NAV = (pendingFac, pendingProps, notifications) => [
  { id: 'overview',      label: 'Overview',           icon: LayoutDashboard },
  { id: 'monitoring',    label: 'Project Monitoring', icon: FolderOpen },
  { id: 'teams',         label: 'Team Management',    icon: Users,        badge: pendingProps },
  { id: 'faculty',       label: 'Faculty Monitoring', icon: UserCheck,    badge: pendingFac },
  { id: 'submissions',   label: 'Submission Reviews', icon: FileText },
  { id: 'announcements', label: 'Announcements',      icon: Megaphone },
  { id: 'deadlines',     label: 'Deadlines',          icon: Calendar },
  { id: 'notifications', label: 'Notifications',      icon: Bell,         badge: notifications },
  { id: 'analytics',     label: 'Reports & Analytics', icon: BarChart2 }
];

const STATUS_COLORS = {
  'Pending HOD Review':  'bg-yellow-50 text-yellow-700 border-yellow-200',
  'HOD Approved':        'bg-blue-50 text-blue-700 border-blue-200',
  'Rejected (HOD)':      'bg-red-50 text-red-600 border-red-200',
  'Faculty Assigned':    'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Faculty Accepted':    'bg-green-50 text-green-700 border-green-200',
  'Rejected (Faculty)':  'bg-red-50 text-red-600 border-red-200',
  'Submitted':           'bg-purple-50 text-purple-700 border-purple-200',
};

const DONUT_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const HodDashboard = () => {
  const [activeTab, setActiveTab]             = useState('overview');
  const [data, setData]                       = useState({
    profile: null,
    stats: { totalStudents: 0, totalFaculty: 0, totalProposals: 0, approvedProposals: 0 },
    pendingProposals: [],
    unapprovedFaculty: [],
    recentSubmissions: [],
    approvedNeedingAssignment: [],
    projectFiles: {}
  });
  
  const [projects, setProjects]               = useState([]);
  const [students, setStudents]               = useState([]);
  const [facultyWorkload, setFacultyWorkload] = useState([]);
  const [approvedFacultyList, setApprovedFacultyList] = useState([]);
  const [deadlines, setDeadlines]             = useState([]);
  
  // Notification states
  const [hodNotifications, setHodNotifications] = useState([]);
  const [unreadCount, setUnreadCount]         = useState(0);

  const [loading, setLoading]                 = useState(true);
  const [activeModal, setActiveModal]         = useState({ type: null, id: null });
  const [reason, setReason]                   = useState('');
  const [requiredCorrections, setRequiredCorrections] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [facSearch, setFacSearch]             = useState('');
  const [projectFilter, setProjectFilter]     = useState('all');
  const [searchQuery, setSearchQuery]         = useState('');
  const [deadlineForm, setDeadlineForm]       = useState({ title: '', description: '', dueDate: '', targetRoles: ['all'] });
  const [addForm, setAddForm]                 = useState({ name: '', email: '', password: '', mobileNumber: '', department: '', designation: '', employeeId: '', course: '', year: '', branch: '', section: '' });
  
  // Announcements
  const [announcements, setAnnouncements]     = useState([]);
  const [annForm, setAnnForm]                 = useState({ title: '', content: '', targetAudience: 'all', pinned: false });
  const [showAnnForm, setShowAnnForm]         = useState(false);
  const [annSubmitting, setAnnSubmitting]     = useState(false);

  // Upgrade states (Detailed Modal)
  const [selectedProject, setSelectedProject] = useState(null);
  const [privateNoteText, setPrivateNoteText] = useState('');
  const [savingPrivateNote, setSavingPrivateNote] = useState(false);

  // Chat in detailed modal
  const [modalMessages, setModalMessages]     = useState([]);
  const [newModalMsg, setNewModalMsg]         = useState('');
  const modalMessagesEndRef = useRef(null);

  const navigate = useNavigate();

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/login'); };

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, facRes] = await Promise.all([
        api.get('/hod/dashboard'),
        api.get('/hod/faculty/approved')
      ]);
      setData(dashRes.data);
      setApprovedFacultyList(facRes.data);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) handleLogout();
      else toast.error('Failed to load HOD dashboard.');
    } finally { setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setHodNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }, []);

  const fetchProjects = useCallback(async () => {
    try { 
      const r = await api.get(`/hod/projects?status=${projectFilter}`); 
      setProjects(r.data); 
    } catch {}
  }, [projectFilter]);

  const fetchStudents = useCallback(async () => {
    try { 
      const r = await api.get(`/hod/students${searchQuery ? `?search=${searchQuery}` : ''}`); 
      setStudents(r.data); 
    } catch {}
  }, [searchQuery]);

  const fetchFacultyWorkload = useCallback(async () => {
    try { 
      const r = await api.get('/hod/faculty/workload'); 
      setFacultyWorkload(r.data); 
    } catch {}
  }, []);

  const fetchDeadlines = useCallback(async () => {
    try {
      const r = await api.get('/deadlines');
      setDeadlines(r.data.deadlines || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchNotifications]);

  useEffect(() => {
    if (activeTab === 'monitoring') fetchProjects();
    if (activeTab === 'teams') { fetchProjects(); fetchFacultyWorkload(); }
    if (activeTab === 'faculty') { fetchFacultyWorkload(); }
    if (activeTab === 'submissions') fetchProjects();
    if (activeTab === 'deadlines') fetchDeadlines();
    if (activeTab === 'announcements') {
      api.get('/announcements').then(r => setAnnouncements(r.data.announcements || [])).catch(() => {});
    }
  }, [activeTab, fetchProjects, fetchStudents, fetchFacultyWorkload, fetchDeadlines]);

  // Polling messages in HOD detailed modal
  const fetchModalMessages = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      const res = await api.get(`/projects/${projectId}/messages`);
      setModalMessages(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject._id) {
      const projectId = selectedProject._id;
      fetchModalMessages(projectId);
      const interval = setInterval(() => fetchModalMessages(projectId), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedProject, fetchModalMessages]);

  useEffect(() => {
    if (modalMessagesEndRef.current) {
      modalMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [modalMessages]);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setHodNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setHodNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const resolveFaculty = async (id, action) => {
    try {
      const endpoint = action === 'accept' ? `/hod/faculty/${id}/approve` : `/hod/faculty/${id}/reject`;
      const payload = action === 'reject' ? { reason } : {};
      await api.put(endpoint, payload);
      toast.success(action === 'accept' ? 'Faculty approved!' : 'Faculty rejected.');
      setActiveModal({ type: null, id: null });
      setReason('');
      fetchDashboard();
      fetchFacultyWorkload();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed.');
    }
  };

  const resolveProposal = async (id, action) => {
    if (action === 'reject' && (!reason || reason.trim().length < 20)) {
      return toast.error('Rejection reason must be at least 20 characters.');
    }
    try {
      if (action === 'accept') {
        if (!selectedFaculty) return toast.error('Please select a faculty member to assign.');
        await api.put(`/hod/proposals/${id}/approve`, { facultyId: selectedFaculty });
        toast.success('Proposal approved and faculty assigned!');
      } else {
        await api.put(`/hod/proposals/${id}/reject`, { reason });
        toast.success('Proposal rejected.');
      }
      setActiveModal({ type: null, id: null });
      setReason('');
      setSelectedFaculty('');
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to resolve proposal.');
    }
  };

  const assignFacultyOnly = async (proposalId) => {
    if (!selectedFaculty) return toast.error('Please select a faculty member.');
    try {
      await api.put(`/hod/proposals/${proposalId}/assign-faculty`, { facultyId: selectedFaculty });
      toast.success('Faculty assigned successfully!');
      setActiveModal({ type: null, id: null });
      setSelectedFaculty('');
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Assignment failed.');
    }
  };

  const evaluateFinalSubmission = async (proposalId, status) => {
    if (status === 'Rejected' && ((reason || '').trim().length < 20 || (requiredCorrections || '').trim().length < 20)) {
      return toast.error('Please specify both rejection reason and corrections (min 20 characters).');
    }
    try {
      const payload = status === 'Rejected' 
        ? { status, reason, requiredCorrections } 
        : { status };
      await api.put(`/hod/proposals/${proposalId}/submission`, payload);
      toast.success(status === 'Rejected' ? 'Final submission rejected.' : 'Submission routed to Faculty supervisor.');
      setActiveModal({ type: null, id: null });
      setReason('');
      setRequiredCorrections('');
      fetchDashboard();
      fetchProjects();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submission evaluation failed.');
    }
  };

  const submitDeadline = async (e) => {
    e.preventDefault();
    try {
      await api.post('/deadlines', deadlineForm);
      toast.success('Global deadline created successfully!');
      setDeadlineForm({ title: '', description: '', dueDate: '', targetRoles: ['all'] });
      fetchDeadlines();
    } catch {
      toast.error('Failed to create deadline.');
    }
  };

  const handleSavePrivateNotes = async (projectId) => {
    setSavingPrivateNote(true);
    try {
      await api.put(`/projects/${projectId}/private-notes`, { privateNotes: privateNoteText });
      toast.success('Private notes saved!');
      if (selectedProject && selectedProject._id === projectId) {
        setSelectedProject(prev => ({
          ...prev,
          privateNotes: privateNoteText
        }));
      }
      fetchProjects();
    } catch (e) {
      toast.error('Failed to save private notes.');
    } finally {
      setSavingPrivateNote(false);
    }
  };

  const handleSendModalMessage = async (e, projectId) => {
    e.preventDefault();
    if (!newModalMsg.trim()) return;
    try {
      const res = await api.post(`/projects/${projectId}/messages`, { content: newModalMsg });
      setModalMessages(prev => [...prev, res.data]);
      setNewModalMsg('');
    } catch {
      toast.error('Failed to send message');
    }
  };

  // ── Project Health Score Logic ──
  const calculateHealthScore = (p) => {
    const completedTargets = p.targets?.filter(t => t.status === 'Completed').length || 0;
    const totalTargets = p.targets?.length || 0;
    const targetPct = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 100;
    const missedDeadlinesCount = p.deadlineSubmissions?.filter(d => d.status === 'Deadline Missed').length || 0;
    const penalty = missedDeadlinesCount * 15;
    const healthScore = Math.max(0, Math.min(100, Math.round((p.progress * 0.6) + (targetPct * 0.4) - penalty)));
    return healthScore;
  };

  const getHealthBadge = (score) => {
    if (score > 75) return { text: 'Good', color: 'bg-green-50 text-green-700 border-green-200' };
    if (score >= 50) return { text: 'Average', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { text: 'At Risk', color: 'bg-red-50 text-red-600 border-red-200' };
  };

  // ── CSV Report Export ──
  const handleCSVExport = () => {
    const items = projects.length > 0 ? projects : (data.approvedNeedingAssignment || []);
    if (items.length === 0) return toast.error('No projects available to export.');
    
    const headers = ['Project Title', 'Department', 'Domain', 'Leader Name', 'Leader Email', 'Team Size', 'Progress %', 'Health Score', 'Status'];
    const rows = items.map(p => {
      const health = calculateHealthScore(p);
      return [
        `"${p.title.replace(/"/g, '""')}"`,
        `"${p.department}"`,
        `"${p.domain || ''}"`,
        `"${p.studentId?.name || ''}"`,
        `"${p.studentId?.email || ''}"`,
        p.teamMembers?.length + 1 || 1,
        p.progress || 0,
        health,
        `"${p.status}"`
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "HOD_Projects_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('HOD CSV Report exported!');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        navItems={HOD_NAV(data.unapprovedFaculty?.length, data.pendingProposals?.length, unreadCount)}
        user={data.profile}
        role="hod"
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto flex flex-col h-screen">
        <header className="bg-white border-b border-gray-100 shadow-sm px-8 py-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 capitalize">
              {HOD_NAV().find(t => t.id === activeTab)?.label || 'HOD Panel'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">Department Head Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <HeaderNotificationBell 
              notifications={hodNotifications} 
              unreadCount={unreadCount} 
              onMarkRead={handleMarkRead} 
              onMarkAllRead={handleMarkAllRead} 
            />
            <button onClick={() => { fetchDashboard(); fetchNotifications(); }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-gray-200 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full">

              {/* ── Tab: Overview ── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Department Students</p>
                      <p className="text-3xl font-extrabold mt-1 text-purple-600">{data.stats?.totalStudents || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Department Faculty</p>
                      <p className="text-3xl font-extrabold mt-1 text-blue-600">{data.stats?.totalFaculty || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Project Proposals</p>
                      <p className="text-3xl font-extrabold mt-1 text-teal-600">{data.stats?.totalProposals || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Approved Projects</p>
                      <p className="text-3xl font-extrabold mt-1 text-green-600">{data.stats?.approvedProposals || 0}</p>
                    </div>
                  </div>

                  {/* Workload Bar Chart */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-purple-500" /> Faculty Workload vs Capacity</h3>
                    {facultyWorkload.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-6 text-center">No workload data mapped.</p>
                    ) : (
                      <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={facultyWorkload.map(f => ({ name: f.name.split(' ')[0], Assigned: f.studentCount, Capacity: f.capacity || 60 }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} domain={[0, 60]} />
                            <RechartsTooltip />
                            <Bar dataKey="Assigned" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="Capacity" fill="#ddd6fe" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Project Monitoring ── */}
              {activeTab === 'monitoring' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    <div className="flex gap-2">
                      <select className="bg-white border border-gray-200 rounded-2xl py-2 px-3 text-xs focus:outline-none" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="Pending HOD Review">Pending HOD</option>
                        <option value="Faculty Assigned">Faculty Assigned</option>
                        <option value="Submitted">Final Approved</option>
                      </select>
                      <button onClick={fetchProjects} className="p-2 text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
                    </div>
                    <button 
                      onClick={handleCSVExport}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Export CSV Report
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => {
                      const health = calculateHealthScore(p);
                      const hb = getHealthBadge(health);
                      return (
                        <div key={p._id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase border border-indigo-100">{p.domain || 'General'}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${hb.color}`}>Health: {hb.text}</span>
                            </div>
                            <h4 className="font-extrabold text-gray-900 leading-snug line-clamp-2 mb-2">{p.title}</h4>
                            <p className="text-xs text-gray-500 mb-4">Leader: {p.studentId?.name} • Supervisor: {p.assignedFaculty?.name || 'Unassigned'}</p>
                            
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4">
                              <div className="flex justify-between items-center mb-1 text-xs">
                                <span className="text-gray-400">Progress</span>
                                <span className="font-black text-indigo-600">{p.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }}></div>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => { setSelectedProject(p); setPrivateNoteText(p.privateNotes || ''); }}
                            className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Users className="w-4 h-4" /> View Details & Discussions
                          </button>
                        </div>
                      );
                    })}
                    {projects.length === 0 && (
                      <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-100 font-medium">No projects found.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Team Management ── */}
              {activeTab === 'teams' && (
                <div className="space-y-6">
                  {/* Pending Project Proposals */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Clock className="w-4 h-4 text-purple-500" /> Pending Project Proposals ({(data.pendingProposals || []).length})</h3>
                    <div className="divide-y divide-gray-100">
                      {(data.pendingProposals || []).map(p => (
                        <div key={p._id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 leading-tight">{p.title}</h4>
                              <p className="text-[10px] text-gray-500 mt-1">Student: {p.studentId?.name} • Branch: {p.studentId?.branch} • Domain: {p.domain}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">Team Size: {p.teamMembers?.length + 1}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start md:self-center">
                            <button onClick={() => { setSelectedFaculty(''); setFacSearch(''); setActiveModal({ type: 'approveProposalModal', id: p._id }); }} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition cursor-pointer">Approve</button>
                            <button onClick={() => setActiveModal({ type: 'rejectProp', id: p._id })} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer">Reject</button>
                          </div>
                        </div>
                      ))}
                      {(data.pendingProposals || []).length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-6">No pending proposals.</p>
                      )}
                    </div>
                  </div>

                  {/* Assign Faculty to HOD approved proposals */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-indigo-500" /> Assign Faculty to Approved Proposals</h3>
                    <div className="divide-y divide-gray-100">
                      {(data.approvedNeedingAssignment || []).map(p => (
                        <div key={p._id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-gray-900">{p.title}</h4>
                            <p className="text-[10px] text-gray-400 mt-1">Leader: {p.studentId?.name} • Members: {p.teamMembers?.length}</p>
                          </div>
                          <button onClick={() => { setSelectedFaculty(''); setFacSearch(''); setActiveModal({ type: 'assignFac', id: p._id }); }} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                            Assign Faculty
                          </button>
                        </div>
                      ))}
                      {(data.approvedNeedingAssignment || []).length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-6">No unassigned approved proposals.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Faculty Monitoring ── */}
              {activeTab === 'faculty' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-gray-900 font-bold text-base">Faculty Workloads</h2>
                    <button onClick={() => setActiveModal({ type: 'addFaculty', id: null })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer">
                      <Plus className="w-4 h-4" /> Add Faculty
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {facultyWorkload.map(f => {
                      const capacity = f.capacity || 60;
                      const pct = Math.min(Math.round((f.studentCount / capacity) * 100), 100);
                      return (
                        <div key={f._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-extrabold text-gray-900 text-sm">{f.name}</p>
                              <p className="text-xs text-gray-500">{f.designation || 'Faculty'}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{f.email}</p>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${pct > 80 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-green-50 text-green-600 border-green-200'}`}>
                              {f.studentCount}/{capacity}
                            </span>
                          </div>
                          <div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className={`h-2 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-bold">
                              <span>{pct}% workload load</span>
                              <span>{capacity - f.studentCount} slots left</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {facultyWorkload.length === 0 && <p className="text-xs text-gray-400 italic col-span-full text-center py-10">No department faculty mapped.</p>}
                  </div>

                  {/* Pending approvals */}
                  {data.unapprovedFaculty?.length > 0 && (
                    <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden mt-6">
                      <div className="p-5 border-b border-gray-100 bg-orange-50/10 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h3 className="font-extrabold text-gray-900 text-sm">Awaiting HOD Signup Approvals ({data.unapprovedFaculty.length})</h3>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {data.unapprovedFaculty.map(fac => (
                          <div key={fac._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                            <div><p className="font-bold text-gray-900 text-xs">{fac.name}</p><p className="text-[10px] text-gray-500 mt-0.5">{fac.email} • {fac.department}</p></div>
                            <div className="flex gap-2">
                              <button onClick={() => resolveFaculty(fac._id, 'accept')} className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold cursor-pointer">Approve</button>
                              <button onClick={() => setActiveModal({ type: 'rejectFac', id: fac._id })} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold cursor-pointer">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Submission Reviews ── */}
              {activeTab === 'submissions' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><FileText className="w-4 h-4 text-purple-500" /> Final Deliverables Evaluative Reviews</h3>
                    <div className="divide-y divide-gray-100">
                      {projects.filter(p => p.status === 'Submitted' && p.finalSubmission?.status === 'Under HOD Review').map(p => (
                        <div key={p._id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-gray-900">{p.title}</h4>
                            <p className="text-[10px] text-gray-500 mt-1">Leader: {p.studentId?.name} • Links: 
                              {p.finalSubmission?.liveLink && <a href={p.finalSubmission.liveLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">Live Demo</a>}
                              {p.finalSubmission?.githubLink && <a href={p.finalSubmission.githubLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-2">GitHub</a>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => evaluateFinalSubmission(p._id, 'Under Faculty Review')} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition cursor-pointer">Route to Supervisor</button>
                            <button onClick={() => setActiveModal({ type: 'rejectSubmission', id: p._id })} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer">Reject</button>
                          </div>
                        </div>
                      ))}
                      {projects.filter(p => p.status === 'Submitted' && p.finalSubmission?.status === 'Under HOD Review').length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-8">No final submissions awaiting HOD review.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Announcements ── */}
              {activeTab === 'announcements' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-gray-900 font-bold text-base">Announcements ({announcements.length})</h2>
                    <button onClick={() => setShowAnnForm(p => !p)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition shadow-md cursor-pointer">
                      <Plus className="w-4 h-4" /> New Announcement
                    </button>
                  </div>
                  
                  {showAnnForm && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-4 h-4 text-indigo-500" /> Create Announcement</h3>
                        <button onClick={() => setShowAnnForm(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault(); if (!annForm.title || !annForm.content) return;
                        setAnnSubmitting(true);
                        try {
                          await api.post('/announcements', annForm);
                          toast.success('Announcement published!');
                          setAnnForm({ title: '', content: '', targetAudience: 'all', pinned: false });
                          setShowAnnForm(false);
                          const r = await api.get('/announcements'); setAnnouncements(r.data.announcements || []);
                        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
                        finally { setAnnSubmitting(false); }
                      }} className="p-5 space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Title *</label><input required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none" value={annForm.title} onChange={e => setAnnForm(p => ({...p, title: e.target.value}))} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Content *</label><textarea required rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs resize-none focus:outline-none" value={annForm.content} onChange={e => setAnnForm(p => ({...p, content: e.target.value}))} /></div>
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => setShowAnnForm(false)} className="px-4 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl cursor-pointer">Cancel</button>
                          <button type="submit" disabled={annSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer">{annSubmitting ? 'Publishing…' : 'Publish'}</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {announcements.map(ann => (
                      <div key={ann._id} className="bg-white rounded-3xl border border-gray-100 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-gray-900 font-extrabold text-sm">{ann.title}</h3>
                            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{ann.content}</p>
                            <p className="text-gray-400 text-[10px] mt-3">By <span className="font-semibold capitalize">{ann.createdByName}</span> · {new Date(ann.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          {ann.createdBy === data.profile?._id && (
                            <button onClick={async () => { if(!window.confirm('Delete?')) return; await api.delete(`/announcements/${ann._id}`); const r = await api.get('/announcements'); setAnnouncements(r.data.announcements || []); }}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Deadlines ── */}
              {activeTab === 'deadlines' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-500" /> Create Global Department Milestone</h3>
                    <form onSubmit={submitDeadline} className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Milestone Title *</label><input required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={deadlineForm.title} onChange={e => setDeadlineForm({...deadlineForm, title: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label><textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs resize-none focus:outline-none" rows={2} value={deadlineForm.description} onChange={e => setDeadlineForm({...deadlineForm, description: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Due Date & Time *</label><input required type="datetime-local" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={deadlineForm.dueDate} onChange={e => setDeadlineForm({...deadlineForm, dueDate: e.target.value})} /></div>
                      <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition cursor-pointer">Assign Global Milestone</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Tab: Notifications ── */}
              {activeTab === 'notifications' && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Bell className="w-4 h-4 text-indigo-500" /> Notifications Log</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Mark all as read</button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {hodNotifications.map(n => (
                      <div key={n._id} className={`py-4 flex justify-between items-center gap-4 ${!n.isRead ? 'bg-indigo-50/10 px-3 rounded-xl border-l-4 border-l-indigo-600' : ''}`}>
                        <div>
                          <p className="text-xs text-gray-800 font-semibold">{n.message}</p>
                          <span className="text-[9px] text-gray-400 font-bold block mt-1">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        {!n.isRead && (
                          <button onClick={() => handleMarkRead(n._id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><Check className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                    {hodNotifications.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-8">No notifications logged.</p>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Approve Proposal / Assign Faculty Modal */}
      {activeModal.type === 'approveProposalModal' && activeModal.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Approve Proposal & Assign Supervisor</h2>
              <button onClick={() => { setActiveModal({ type: null, id: null }); setSelectedFaculty(''); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block font-extrabold">Select Department Supervisor</label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search guides by name..." className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none" value={facSearch} onChange={e => setFacSearch(e.target.value)} />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {approvedFacultyList.filter(f => f.name.toLowerCase().includes(facSearch.toLowerCase())).map(f => (
                    <div 
                      key={f._id} 
                      onClick={() => setSelectedFaculty(f._id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                        selectedFaculty === f._id 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-800">{f.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{f.designation || 'Supervisor'} • {f.email}</p>
                      </div>
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{f.studentCount}/{f.capacity || 60} Students</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button onClick={() => { setActiveModal({ type: null, id: null }); setSelectedFaculty(''); }} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={() => resolveProposal(activeModal.id, 'accept')} className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-xl cursor-pointer">Approve Project</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Assign Faculty ONLY Modal */}
      {activeModal.type === 'assignFac' && activeModal.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Assign Faculty Supervisor</h2>
              <button onClick={() => { setActiveModal({ type: null, id: null }); setSelectedFaculty(''); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Available Supervisors</label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {approvedFacultyList.map(f => (
                    <div 
                      key={f._id} 
                      onClick={() => setSelectedFaculty(f._id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                        selectedFaculty === f._id 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-800">{f.name}</p>
                        <p className="text-[10px] text-gray-500">{f.email}</p>
                      </div>
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold">{f.studentCount}/{f.capacity || 60} Students</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button onClick={() => { setActiveModal({ type: null, id: null }); setSelectedFaculty(''); }} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={() => assignFacultyOnly(activeModal.id)} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer">Assign supervisor</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Proposal Modal */}
      {activeModal.type === 'rejectProp' && activeModal.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Reject Student Proposal</h2>
              <button onClick={() => { setActiveModal({ type: null, id: null }); setReason(''); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Rejection Feedback Reason (min 20 characters)</label>
                <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none focus:outline-none" placeholder="Provide reason..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setActiveModal({ type: null, id: null }); setReason(''); }} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={() => resolveProposal(activeModal.id, 'reject')} className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl cursor-pointer">Confirm Reject</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Submission Modal */}
      {activeModal.type === 'rejectSubmission' && activeModal.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Reject Final Submission</h2>
              <button onClick={() => { setActiveModal({ type: null, id: null }); setReason(''); setRequiredCorrections(''); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Rejection Reason *</label>
                <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none focus:outline-none" placeholder="Reason..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Required Corrections *</label>
                <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none focus:outline-none" placeholder="Corrections..." value={requiredCorrections} onChange={e => setRequiredCorrections(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setActiveModal({ type: null, id: null }); setReason(''); setRequiredCorrections(''); }} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={() => evaluateFinalSubmission(activeModal.id, 'Rejected')} className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl cursor-pointer">Confirm Rejection</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Faculty manual signup */}
      {activeModal.type === 'addFaculty' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Faculty Member</h2>
              <button onClick={() => setActiveModal({ type: null, id: null })} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/hod/faculty/create', { ...addForm, department: data.profile.department });
                toast.success('Faculty member added successfully!');
                setActiveModal({ type: null, id: null });
                setAddForm({ name: '', email: '', password: '', mobileNumber: '' });
                fetchFacultyWorkload();
              } catch (e) {
                toast.error(e.response?.data?.message || 'Failed to add faculty.');
              }
            }} className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label><input required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email *</label><input required type="email" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Password *</label><input required type="password" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile Number *</label><input required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none" value={addForm.mobileNumber} onChange={e => setAddForm({ ...addForm, mobileNumber: e.target.value })} /></div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer">Register Faculty</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── HOD DETAILED PROJECT MODAL ── */}
      {selectedProject && (() => {
        const project = selectedProject;
        const projectFilesArr = data.projectFiles?.[project._id] || [];
        const health = calculateHealthScore(project);
        const hb = getHealthBadge(health);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col border border-gray-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-slate-900 p-6 text-white shrink-0 flex justify-between items-center">
                <div>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider block w-fit">{project.domain}</span>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${hb.color}`}>Health: {hb.text} ({health}%)</span>
                  </div>
                  <h2 className="font-extrabold text-xl leading-tight truncate max-w-2xl">{project.title}</h2>
                  <p className="text-purple-200/80 text-xs mt-0.5">Leader: <span className="font-semibold text-white">{project.studentId?.name}</span> • Supervisor: {project.assignedFaculty?.name || 'Unassigned'}</p>
                </div>
                <button 
                  onClick={() => { setSelectedProject(null); }} 
                  className="p-2 bg-white/10 hover:bg-white/20 text-white/90 rounded-2xl transition-all border border-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Panel: Profile & Team Details */}
                <div className="w-full md:w-80 border-r border-gray-100 overflow-y-auto p-5 shrink-0 bg-slate-50/50 space-y-5 flex flex-col justify-between">
                  <div>
                    {/* Team Details */}
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team Members ({1 + (project.teamMembers?.length || 0)})</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 p-2 bg-purple-50/50 border border-purple-100 rounded-xl">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-700 shrink-0">L</div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{project.studentId?.name} (Leader)</p>
                            <p className="text-[10px] text-gray-400 truncate">{project.studentId?.email}</p>
                          </div>
                        </div>
                        {(project.teamMembers || []).map((m, i) => (
                          <div key={i} className="flex items-center gap-2.5 p-2 bg-white border border-gray-100 rounded-xl">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">{i+1}</div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{m.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Private Notes Editor */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Private Notes (Supervisor/HOD)</p>
                    <textarea 
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:outline-none resize-none font-medium text-gray-700"
                      placeholder="Add private remarks..."
                      value={privateNoteText}
                      onChange={e => setPrivateNoteText(e.target.value)}
                    />
                    <button
                      onClick={() => handleSavePrivateNotes(project._id)}
                      disabled={savingPrivateNote}
                      className="mt-2 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingPrivateNote ? 'Saving...' : 'Save Private Notes'}
                    </button>
                  </div>
                </div>

                {/* Center Panel: Project Info, Deliverables, Stepper */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-gray-100">
                  {/* Abstract */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Project Abstract</p>
                    <p className="text-xs text-gray-600 border-l-4 border-purple-200 pl-3 leading-relaxed font-semibold bg-slate-50 p-3.5 rounded-xl">{project.description}</p>
                  </div>

                  {/* Stepper Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress Timeline Stepper</p>
                      <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">{project.progress || 0}% Completed</span>
                    </div>

                    {!project.timeline || project.timeline.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 p-4 rounded-xl text-center">Student has not logged progress updates yet.</p>
                    ) : (
                      <div className="relative border-l-2 border-purple-100 pl-5 ml-2.5 space-y-5">
                        {project.timeline.map((item) => (
                          <div key={item._id} className="relative">
                            <span className="absolute -left-[27px] top-1.5 w-3 h-3 bg-purple-600 rounded-full ring-4 ring-purple-50" />
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
                              <div className="flex justify-between items-start flex-wrap gap-2 mb-1.5">
                                <h5 className="font-bold text-gray-800 text-[10px] tracking-wide bg-purple-100/50 text-purple-700 px-2 py-0.5 rounded-md uppercase">{item.status}</h5>
                                <span className="text-[10px] text-gray-400 font-bold">{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                              {item.remarks && (
                                <p className="text-xs text-gray-600 leading-relaxed font-semibold italic">"{item.remarks}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Uploaded Deliverables */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Uploaded Deliverables</p>
                    {projectFilesArr.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 p-4 rounded-xl text-center">No uploads logged.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {projectFilesArr.map(f => (
                          <div key={f._id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{f.fileName}</p>
                                <p className="text-[10px] text-gray-400">{f.fileType} • v{f.version}</p>
                              </div>
                            </div>
                            <a href={f.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shrink-0"><Download className="w-3.5 h-3.5" /></a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Inline Team Chat */}
                <div className="w-full md:w-80 flex flex-col h-full bg-slate-50/30 overflow-hidden shrink-0">
                  <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-1.5 shrink-0">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-gray-800">Team Messaging Channel</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {modalMessages.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-8">No messages. Type below to start chat.</p>
                    ) : (
                      modalMessages.map(msg => {
                        const isMe = msg.senderId === data.profile?._id;
                        return (
                          <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] font-black text-gray-500 mb-0.5">{msg.senderName}</span>
                            <div className={`p-2.5 rounded-2xl max-w-[220px] text-[11px] leading-normal shadow-sm ${
                              isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                            }`}>
                              <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                            </div>
                            <span className="text-[8px] text-gray-400 font-bold mt-1 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={modalMessagesEndRef} />
                  </div>

                  <form onSubmit={(e) => handleSendModalMessage(e, project._id)} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                    <input 
                      type="text" 
                      placeholder="Message team..." 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none" 
                      value={newModalMsg} 
                      onChange={e => setNewModalMsg(e.target.value)} 
                    />
                    <button type="submit" disabled={!newModalMsg.trim()} className="px-3 bg-purple-600 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>
                  </form>
                </div>

              </div>
            </motion.div>
          </div>
        );
      })()}

    </div>
  );
};

export default HodDashboard;
