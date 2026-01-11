import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Github, Save, Trash2, Globe, Tag, Image as ImageIcon, Plus, RefreshCw, LayoutTemplate, User, Share2, Type, ChevronUp, ChevronDown, Pin } from 'lucide-react';

export default function Admin() {
    const { addToast } = useToast();

    // 1. Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    // 2. Data State
    const [repos, setRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [aiContent, setAiContent] = useState({ title: '', description: '', tags: '', image_url: '', repo_url: '', demo_url: '' });

    // 3. CMS State
    const [dbProjects, setDbProjects] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [activeProjectId, setActiveProjectId] = useState(null);

    // 4. Image Upload State
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // 5. Tab & Site Settings State
    const [activeTab, setActiveTab] = useState('projects');
    const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('hero'); // hero, about, sections, footer, meta

    const [siteSettings, setSiteSettings] = useState({
        // Meta
        meta_title: '',
        meta_description: '',
        // Hero
        hero_greeting: '',
        hero_name: '',
        hero_tagline: '',
        // About
        about_title: '',
        about_text: '',
        about_image_url: '',
        skills: [], // Array of objects
        socials: [], // Array of { label, url, icon }
        // Sections
        projects_title: '',
        socials_title: '',
        // Footer
        copyright_text: ''
    });
    const [settingsSaving, setSettingsSaving] = useState(false);

    // --- Effects ---
    const fetchDbProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('is_pinned', { ascending: false, nullsFirst: false })
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('id', { ascending: false });
        if (error) addToast("Failed to load projects: " + error.message, "error");
        if (data) setDbProjects(data);
    };

    const fetchSiteSettings = async () => {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
        if (error) {
            console.error(error);
            // Don't toast here as it might just be empty initial state or rls
        }
        if (data) {
            // Ensure skills and socials are arrays
            const safeData = {
                ...data,
                skills: Array.isArray(data.skills) ? data.skills : [],
                socials: Array.isArray(data.socials) ? data.socials : []
            };
            setSiteSettings(safeData);
        }
    };

    const saveSiteSettings = async () => {
        setSettingsSaving(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert({ id: 1, ...siteSettings });

        if (error) addToast('Error saving settings: ' + error.message, 'error');
        else addToast('Site settings saved successfully!', 'success');
        setSettingsSaving(false);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchDbProjects();
            fetchSiteSettings();
        }
    }, [isAuthenticated]);

    // --- Handlers ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            addToast("Welcome back, Admin!", "success");
        } else {
            addToast("Incorrect Password", "error");
        }
    };

    const fetchRepos = async () => {
        const username = import.meta.env.VITE_GITHUB_USERNAME;
        const token = import.meta.env.VITE_GITHUB_TOKEN;

        try {
            const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated`, {
                headers: token ? { Authorization: `token ${token}` } : {}
            });

            if (!res.ok) throw new Error("Failed to fetch repos");

            const data = await res.json();
            setRepos(Array.isArray(data) ? data : []);
            addToast(`Fetched ${data.length} repositories.`, "info");
        } catch (error) {
            console.error(error);
            addToast("Error loading repos: " + error.message, "error");
        }
    };

    const importRepo = (repo) => {
        setSelectedRepo(repo);
        setEditMode(false);
        setAiContent({
            title: repo.name,
            description: repo.description || '',
            tags: repo.language ? [repo.language] : [],
            repo_url: repo.html_url,
            demo_url: repo.homepage || '',
            image_url: `https://opengraph.githubassets.com/1/${repo.full_name}`
        });
        addToast(`Imported info from ${repo.name}`, "info");
    };

    const handleImageUpload = async (file, target = 'project') => {
        if (!file) return;

        setUploading(true);
        const fileName = `${Date.now()}_${file.name}`;

        try {
            const { data, error } = await supabase.storage
                .from('images')
                .upload(fileName, file, { upsert: true });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            if (target === 'project') {
                setAiContent({ ...aiContent, image_url: urlData.publicUrl });
            } else if (target === 'profile') {
                setSiteSettings({ ...siteSettings, about_image_url: urlData.publicUrl });
            }

            addToast('Image uploaded successfully!', 'success');
        } catch (err) {
            console.error(err);
            addToast('Upload failed: ' + err.message, 'error');
        }
        setUploading(false);
    };

    const handleDrop = (e, target = 'project') => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file, target);
        } else {
            addToast('Please drop an image file.', 'error');
        }
    };

    const prepareEdit = (project) => {
        setEditMode(true);
        setActiveProjectId(project.id);
        setSelectedRepo(null);
        setAiContent({
            title: project.title,
            description: project.description,
            tags: project.tags || [],
            image_url: project.image_url,
            repo_url: project.repo_url || '',
            demo_url: project.demo_url || ''
        });
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;

        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) addToast(error.message, "error");
        else {
            addToast("Project deleted.", "success");
            fetchDbProjects();
        }
    };

    // Move project up/down in order
    const moveProject = async (projectId, direction) => {
        const currentIndex = dbProjects.findIndex(p => p.id === projectId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= dbProjects.length) return;

        // Swap sort_order values
        const currentProject = dbProjects[currentIndex];
        const swapProject = dbProjects[newIndex];

        const currentOrder = currentProject.sort_order ?? currentIndex;
        const swapOrder = swapProject.sort_order ?? newIndex;

        const { error: err1 } = await supabase.from('projects').update({ sort_order: swapOrder }).eq('id', currentProject.id);
        const { error: err2 } = await supabase.from('projects').update({ sort_order: currentOrder }).eq('id', swapProject.id);

        if (err1 || err2) addToast("Failed to reorder", "error");
        else fetchDbProjects();
    };

    // Toggle pin status
    const togglePin = async (project) => {
        const newPinned = !project.is_pinned;
        const { error } = await supabase.from('projects').update({ is_pinned: newPinned }).eq('id', project.id);
        if (error) addToast("Failed to update pin status", "error");
        else {
            addToast(newPinned ? "Project pinned!" : "Project unpinned", "success");
            fetchDbProjects();
        }
    };

    const handleSaveProject = async () => {
        const payload = {
            title: aiContent.title,
            description: aiContent.description,
            tags: aiContent.tags,
            image_url: aiContent.image_url || (selectedRepo ? `https://opengraph.githubassets.com/1/${selectedRepo.full_name}` : ''),
            repo_url: aiContent.repo_url || (selectedRepo ? selectedRepo.html_url : null),
            demo_url: aiContent.demo_url || (selectedRepo ? selectedRepo.homepage : null)
        };

        if (!payload.title) return addToast("Title is required", "error");

        let error;
        if (editMode && activeProjectId) {
            const res = await supabase.from('projects').update(payload).eq('id', activeProjectId);
            error = res.error;
        } else {
            const res = await supabase.from('projects').insert([payload]);
            error = res.error;
        }

        if (error) addToast("Error saving: " + error.message, "error");
        else {
            addToast("Project saved successfully!", "success");
            setAiContent({ title: '', description: '', tags: '', image_url: '', repo_url: '', demo_url: '' });
            setSelectedRepo(null);
            setEditMode(false);
            fetchDbProjects();
        }
    };

    // Skills Helper
    const updateSkill = (index, field, value) => {
        const newSkills = [...siteSettings.skills];
        if (!newSkills[index]) newSkills[index] = {};
        newSkills[index][field] = value;
        setSiteSettings({ ...siteSettings, skills: newSkills });
    };

    const addSkill = () => {
        setSiteSettings({
            ...siteSettings,
            skills: [...(siteSettings.skills || []), { title: '', subtitle: '', icon: 'Code' }]
        });
    };

    const removeSkill = (index) => {
        const newSkills = [...siteSettings.skills];
        newSkills.splice(index, 1);
        setSiteSettings({ ...siteSettings, skills: newSkills });
    };

    // Socials Helpers
    const updateSocial = (index, field, value) => {
        const newSocials = [...(siteSettings.socials || [])];
        if (!newSocials[index]) newSocials[index] = {};
        newSocials[index][field] = value;
        setSiteSettings({ ...siteSettings, socials: newSocials });
    };

    const addSocial = () => {
        setSiteSettings({
            ...siteSettings,
            socials: [...(siteSettings.socials || []), { label: '', url: '', icon: 'Globe' }]
        });
    };

    const removeSocial = (index) => {
        const newSocials = [...siteSettings.socials];
        newSocials.splice(index, 1);
        setSiteSettings({ ...siteSettings, socials: newSocials });
    };

    // --- RENDER ---
    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#000', color: '#fff' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', padding: '2rem', border: '1px solid #333', borderRadius: '1rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Admin Access</h2>
                    <input
                        type="password"
                        placeholder="Enter Admin Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #444', background: '#111', color: '#fff' }}
                    />
                    <button type="submit" style={{ padding: '0.8rem', background: 'var(--primary)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        Login
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', background: '#050505', minHeight: '100vh', color: '#e5e5e5', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutTemplate color="#8b5cf6" /> CMS Dashboard
                </h1>
                <button
                    onClick={() => setIsAuthenticated(false)}
                    style={{ padding: '0.5rem 1rem', background: '#222', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                    Logout
                </button>
            </div>

            {/* Main Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Globe size={18} />} label="Projects" />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<User size={18} />} label="Site Settings" />
            </div>

            {/* CONTENT: PROJECTS */}
            {activeTab === 'projects' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>

                    {/* Left: Project List */}
                    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '1.5rem', height: 'fit-content' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Your Projects</h3>
                            <button onClick={fetchDbProjects} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><RefreshCw size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                onClick={() => { setEditMode(false); setAiContent({ title: '', description: '', tags: '', image_url: '', repo_url: '', demo_url: '' }); setSelectedRepo(null); }}
                                style={{ padding: '0.8rem', background: '#222', border: '1px dashed #444', borderRadius: '0.5rem', color: '#888', cursor: 'pointer', textAlign: 'center', marginBottom: '1rem' }}
                            >
                                + Create New
                            </button>

                            {dbProjects.map((p, index) => (
                                <div key={p.id} style={{
                                    padding: '1rem',
                                    background: p.is_pinned ? '#1a1a2e' : '#111',
                                    borderRadius: '0.5rem',
                                    border: p.is_pinned ? '1px solid #8b5cf6' : '1px solid #222',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    {/* Reorder Arrows */}
                                    <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
                                        <button
                                            onClick={() => moveProject(p.id, 'up')}
                                            disabled={index === 0}
                                            style={{ background: 'transparent', border: 'none', color: index === 0 ? '#333' : '#666', cursor: index === 0 ? 'default' : 'pointer', padding: '0.1rem' }}
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveProject(p.id, 'down')}
                                            disabled={index === dbProjects.length - 1}
                                            style={{ background: 'transparent', border: 'none', color: index === dbProjects.length - 1 ? '#333' : '#666', cursor: index === dbProjects.length - 1 ? 'default' : 'pointer', padding: '0.1rem' }}
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <b style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                            {p.is_pinned && <Pin size={12} color="#8b5cf6" />}
                                            {p.title}
                                        </b>
                                        <span style={{ fontSize: '0.7rem', color: '#666' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => togglePin(p)}
                                            title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                                            style={{ padding: '0.4rem', background: p.is_pinned ? '#8b5cf6' : '#222', border: 'none', color: '#fff', borderRadius: '0.3rem', cursor: 'pointer' }}
                                        >
                                            <Pin size={14} />
                                        </button>
                                        <button onClick={() => prepareEdit(p)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#fbbf24', borderRadius: '0.3rem', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => handleDelete(p.id)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#ef4444', borderRadius: '0.3rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* GitHub Fetcher */}
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Github size={18} /> Quick Import</h3>
                                <button onClick={fetchRepos} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: '#222', border: 'none', color: '#fff', borderRadius: '0.3rem', cursor: 'pointer' }}>Fetch GitHub</button>
                            </div>
                            {repos.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {repos.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => importRepo(r)}
                                            style={{ flexShrink: 0, padding: '0.5rem 1rem', background: '#111', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Form */}
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: editMode ? '#fbbf24' : '#22c55e' }}>{editMode ? 'Edit Project' : 'New Project'}</h2>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <Input label="Project Title" value={aiContent.title} onChange={e => setAiContent({ ...aiContent, title: e.target.value })} />
                                <TextArea label="Description" value={aiContent.description} onChange={e => setAiContent({ ...aiContent, description: e.target.value })} />

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Project Image</label>
                                    <div
                                        onDrop={(e) => handleDrop(e, 'project')}
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        style={{
                                            border: `2px dashed ${isDragging ? '#22c55e' : '#333'}`,
                                            borderRadius: '0.5rem',
                                            padding: '2rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            background: isDragging ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                            transition: 'all 0.2s',
                                            marginBottom: '0.5rem'
                                        }}
                                    >
                                        {uploading ? <span>Uploading...</span> : aiContent.image_url ? (
                                            <img src={aiContent.image_url} alt="Preview" style={{ maxHeight: '200px', borderRadius: '0.5rem' }} />
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                                                <ImageIcon size={32} style={{ marginBottom: '0.5rem' }} />
                                                <span>Drag image or click to upload</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0], 'project')} style={{ position: 'absolute', opacity: 0, width: '100px' }} />
                                    </div>
                                    <Input
                                        placeholder="Or paste image URL"
                                        value={aiContent.image_url}
                                        onChange={e => setAiContent({ ...aiContent, image_url: e.target.value })}
                                        style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                                    />
                                </div>

                                <Input label="Tags (comma separated)" value={aiContent.tags} onChange={e => setAiContent({ ...aiContent, tags: Array.isArray(e.target.value) ? e.target.value : e.target.value.split(',') })} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Input label="Repo URL" value={aiContent.repo_url} onChange={e => setAiContent({ ...aiContent, repo_url: e.target.value })} placeholder="https://github.com/..." />
                                    <Input label="Demo URL" value={aiContent.demo_url} onChange={e => setAiContent({ ...aiContent, demo_url: e.target.value })} placeholder="https://..." />
                                </div>

                                <button
                                    onClick={handleSaveProject}
                                    style={{
                                        padding: '1rem',
                                        background: editMode ? '#fbbf24' : '#22c55e',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Save size={18} /> {editMode ? 'Update Project' : 'Save Project'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
                    {/* Settings Sub-nav */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {['hero', 'about', 'sections', 'socials', 'footer', 'meta'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveSettingsSubTab(tab)}
                                style={{
                                    textAlign: 'left',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '0.5rem',
                                    background: activeSettingsSubTab === tab ? '#222' : 'transparent',
                                    color: activeSettingsSubTab === tab ? '#fff' : '#888',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Settings Form */}
                    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2 style={{ textTransform: 'capitalize' }}>{activeSettingsSubTab} Settings</h2>
                            <button
                                onClick={saveSiteSettings}
                                disabled={settingsSaving}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    background: '#8b5cf6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    opacity: settingsSaving ? 0.7 : 1
                                }}
                            >
                                {settingsSaving ? 'Saving...' : 'Save All Changes'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {activeSettingsSubTab === 'hero' && (
                                <>
                                    <Input label="Greeting (Typewriter)" value={siteSettings.hero_greeting} onChange={e => setSiteSettings({ ...siteSettings, hero_greeting: e.target.value })} placeholder="Hello there." />
                                    <Input label="Hero Name" value={siteSettings.hero_name} onChange={e => setSiteSettings({ ...siteSettings, hero_name: e.target.value })} />
                                    <Input label="Tagline" value={siteSettings.hero_tagline} onChange={e => setSiteSettings({ ...siteSettings, hero_tagline: e.target.value })} />
                                </>
                            )}

                            {activeSettingsSubTab === 'about' && (
                                <>
                                    <Input label="About Title" value={siteSettings.about_title} onChange={e => setSiteSettings({ ...siteSettings, about_title: e.target.value })} />
                                    <TextArea label="About Text" value={siteSettings.about_text} onChange={e => setSiteSettings({ ...siteSettings, about_text: e.target.value })} />

                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#888' }}>Profile Image</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {siteSettings.about_image_url && <img src={siteSettings.about_image_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />}
                                        <input type="file" onChange={e => handleImageUpload(e.target.files[0], 'profile')} style={{ color: '#888' }} />
                                    </div>
                                    <Input placeholder="Or Image URL" value={siteSettings.about_image_url} onChange={e => setSiteSettings({ ...siteSettings, about_image_url: e.target.value })} />

                                    <h3 style={{ marginTop: '1rem' }}>Skills Cards</h3>
                                    {siteSettings.skills?.map((skill, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
                                            <Input label="Title" value={skill.title} onChange={e => updateSkill(idx, 'title', e.target.value)} />
                                            <Input label="Subtitle" value={skill.subtitle} onChange={e => updateSkill(idx, 'subtitle', e.target.value)} />
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Icon</label>
                                                <select
                                                    value={skill.icon || 'Code'}
                                                    onChange={e => updateSkill(idx, 'icon', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.7rem',
                                                        background: '#0a0a0a',
                                                        border: '1px solid #333',
                                                        borderRadius: '0.5rem',
                                                        color: '#fff',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="Code">Code</option>
                                                    <option value="Database">Database</option>
                                                    <option value="Brain">Brain / AI</option>
                                                    <option value="Globe">Globe / Web</option>
                                                    <option value="Rocket">Rocket</option>
                                                    <option value="Layers">Layers</option>
                                                    <option value="Cpu">CPU / Hardware</option>
                                                    <option value="Github">GitHub</option>
                                                </select>
                                            </div>
                                            <button onClick={() => removeSkill(idx)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', paddingBottom: '0.5rem' }}><Trash2 /></button>
                                        </div>
                                    ))}
                                    <button onClick={addSkill} style={{ width: 'fit-content', padding: '0.5rem 1rem', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '0.5rem', cursor: 'pointer' }}>+ Add Skill</button>
                                </>
                            )}

                            {activeSettingsSubTab === 'sections' && (
                                <>
                                    <Input label="Projects Section Title" value={siteSettings.projects_title} onChange={e => setSiteSettings({ ...siteSettings, projects_title: e.target.value })} />
                                    <Input label="Socials Section Title" value={siteSettings.socials_title} onChange={e => setSiteSettings({ ...siteSettings, socials_title: e.target.value })} />
                                </>
                            )}

                            {activeSettingsSubTab === 'socials' && (
                                <>
                                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>Add your social media links. Use Lucide icon names (e.g., Github, Linkedin, Instagram, Mail, Globe, Twitter).</p>
                                    {siteSettings.socials?.map((social, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '1rem', alignItems: 'end', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
                                            <Input label="Label" value={social.label} onChange={e => updateSocial(idx, 'label', e.target.value)} placeholder="GitHub" />
                                            <Input label="URL" value={social.url} onChange={e => updateSocial(idx, 'url', e.target.value)} placeholder="https://..." />
                                            <Input label="Icon (Lucide)" value={social.icon} onChange={e => updateSocial(idx, 'icon', e.target.value)} placeholder="Github" />
                                            <button onClick={() => removeSocial(idx)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', paddingBottom: '0.5rem' }}><Trash2 /></button>
                                        </div>
                                    ))}
                                    <button onClick={addSocial} style={{ width: 'fit-content', padding: '0.5rem 1rem', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '0.5rem', cursor: 'pointer' }}>+ Add Social Link</button>
                                </>
                            )}

                            {activeSettingsSubTab === 'footer' && (
                                <Input label="Copyright Text" value={siteSettings.copyright_text} onChange={e => setSiteSettings({ ...siteSettings, copyright_text: e.target.value })} />
                            )}

                            {activeSettingsSubTab === 'meta' && (
                                <>
                                    <Input label="Browser Tab Title" value={siteSettings.meta_title} onChange={e => setSiteSettings({ ...siteSettings, meta_title: e.target.value })} />
                                    <TextArea label="Meta Description (SEO)" value={siteSettings.meta_description} onChange={e => setSiteSettings({ ...siteSettings, meta_description: e.target.value })} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---
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

const Input = ({ label, icon, style, ...props }) => (
    <div>
        {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>{label}</label>}
        <div style={{ position: 'relative' }}>
            {icon && <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>{icon}</div>}
            <input
                {...props}
                style={{
                    width: '100%',
                    padding: '0.8rem',
                    paddingLeft: icon ? '2.5rem' : '0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #333',
                    background: '#111',
                    color: '#fff',
                    outline: 'none',
                    ...style
                }}
            />
        </div>
    </div>
);

const TextArea = ({ label, ...props }) => (
    <div>
        {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>{label}</label>}
        <textarea
            {...props}
            style={{
                width: '100%',
                height: '100px',
                padding: '0.8rem',
                borderRadius: '0.5rem',
                border: '1px solid #333',
                background: '#111',
                color: '#fff',
                outline: 'none',
                resize: 'vertical'
            }}
        />
    </div>
);
