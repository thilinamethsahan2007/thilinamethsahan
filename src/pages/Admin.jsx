import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { LayoutTemplate, Globe, User, LogOut } from 'lucide-react';

// Components
import AdminLogin from '../components/admin/AdminLogin';
import ProjectList from '../components/admin/ProjectList';
import ProjectEditor from '../components/admin/ProjectEditor';
import SiteSettings from '../components/admin/SiteSettings';

export default function Admin() {
    const { addToast } = useToast();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    // Admin State
    const [activeTab, setActiveTab] = useState('projects');
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null); // Project being edited

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session) {
            fetchProjects();
        }
    }, [session]);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('is_pinned', { ascending: false, nullsFirst: false })
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('id', { ascending: false });

        if (error) addToast('Error loading projects', 'error');
        else setProjects(data || []);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        addToast("Logged out", "info");
    };

    // Project Actions
    const handleDelete = async (id) => {
        if (!confirm("Delete this project?")) return;
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) addToast("Delete failed", "error");
        else {
            addToast("Project deleted", "success");
            fetchProjects();
            if (activeProject?.id === id) setActiveProject(null);
        }
    };

    const handleTogglePin = async (project) => {
        const { error } = await supabase.from('projects').update({ is_pinned: !project.is_pinned }).eq('id', project.id);
        if (!error) fetchProjects();
    };

    const handleMove = async (id, dir) => {
        // Simplified move logic: Find index in current sorted list and swap sort_order
        // Note: Real imp needs careful handling of sort_orders to avoid collision, 
        // but swapping two adjacent items usually works if list is stable.
        const idx = projects.findIndex(p => p.id === id);
        if (idx === -1) return;

        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= projects.length) return;

        const p1 = projects[idx];
        const p2 = projects[targetIdx];

        // Use index as fallback sort order
        const o1 = p1.sort_order ?? idx;
        const o2 = p2.sort_order ?? targetIdx;

        await supabase.from('projects').update({ sort_order: o2 }).eq('id', p1.id);
        await supabase.from('projects').update({ sort_order: o1 }).eq('id', p2.id);

        fetchProjects();
    };

    if (loading) return <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;

    if (!session) {
        return <AdminLogin onLoginSuccess={() => fetchProjects()} />;
    }

    return (
        <div style={{ padding: '2rem', background: '#050505', minHeight: '100vh', color: '#e5e5e5', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutTemplate color="#8b5cf6" /> CMS Dashboard
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{session.user.email}</span>
                    <button
                        onClick={handleLogout}
                        style={{ padding: '0.5rem 1rem', background: '#222', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Globe size={18} />} label="Projects" />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<User size={18} />} label="Site Settings" />
            </div>

            {/* Content Area */}
            {activeTab === 'projects' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                    <ProjectList
                        projects={projects}
                        onEdit={setActiveProject}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onMove={handleMove}
                        onRefresh={fetchProjects}
                    />
                    <ProjectEditor
                        projectToEdit={activeProject}
                        onSaveSuccess={() => { fetchProjects(); setActiveProject(null); }}
                        onCancel={() => setActiveProject(null)}
                    />
                </div>
            )}

            {activeTab === 'settings' && <SiteSettings />}
        </div>
    );
}

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.5rem',
            borderRadius: '0.5rem',
            background: active ? '#222' : 'transparent',
            color: active ? '#fff' : '#666',
            border: active ? '1px solid #333' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: active ? 'bold' : 'normal',
            transition: 'all 0.2s'
        }}
    >
        {icon} {label}
    </button>
);
