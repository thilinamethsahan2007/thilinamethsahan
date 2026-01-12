import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Trash2 } from 'lucide-react';

// Reusable Inputs
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

export default function SiteSettings() {
    const { addToast } = useToast();
    const [activeSubTab, setActiveSubTab] = useState('hero');
    const [settings, setSettings] = useState({
        meta_title: '', meta_description: '',
        hero_greeting: '', hero_name: '', hero_tagline: '',
        about_title: '', about_text: '', about_image_url: '',
        skills: [], socials: [],
        projects_title: '', socials_title: '',
        copyright_text: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
        if (data) {
            setSettings({
                ...data,
                skills: Array.isArray(data.skills) ? data.skills : [],
                socials: Array.isArray(data.socials) ? data.socials : []
            });
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        const { error } = await supabase.from('site_settings').upsert({ id: 1, ...settings });
        if (error) addToast('Error saving settings: ' + error.message, 'error');
        else addToast('Site settings saved successfully!', 'success');
        setSaving(false);
    };

    const handleImageUpload = async (file, field) => {
        if (!file) return;
        const fileName = `${Date.now()}_${file.name}`;
        try {
            const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setSettings({ ...settings, [field]: data.publicUrl });
        } catch (err) {
            addToast("Upload failed", "error");
        }
    };

    // Arrays helpers
    const updateArrayItem = (arrName, index, field, value) => {
        const newArr = [...settings[arrName]];
        if (!newArr[index]) newArr[index] = {};
        newArr[index][field] = value;
        setSettings({ ...settings, [arrName]: newArr });
    };

    const addArrayItem = (arrName, defaultItem) => {
        setSettings({ ...settings, [arrName]: [...settings[arrName], defaultItem] });
    };

    const removeArrayItem = (arrName, index) => {
        const newArr = [...settings[arrName]];
        newArr.splice(index, 1);
        setSettings({ ...settings, [arrName]: newArr });
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
            {/* Sub-nav */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['hero', 'about', 'sections', 'socials', 'footer', 'meta'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        style={{
                            textAlign: 'left',
                            padding: '0.8rem 1rem',
                            borderRadius: '0.5rem',
                            background: activeSubTab === tab ? '#222' : 'transparent',
                            color: activeSubTab === tab ? '#fff' : '#888',
                            border: 'none',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Form Area */}
            <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h2 style={{ textTransform: 'capitalize' }}>{activeSubTab} Settings</h2>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: '#8b5cf6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>

                    {/* HERO */}
                    {activeSubTab === 'hero' && (
                        <>
                            <Input label="Greeting (Typewriter)" value={settings.hero_greeting} onChange={e => setSettings({ ...settings, hero_greeting: e.target.value })} />
                            <Input label="Hero Name" value={settings.hero_name} onChange={e => setSettings({ ...settings, hero_name: e.target.value })} />
                            <Input label="Tagline" value={settings.hero_tagline} onChange={e => setSettings({ ...settings, hero_tagline: e.target.value })} />
                        </>
                    )}

                    {/* ABOUT */}
                    {activeSubTab === 'about' && (
                        <>
                            <Input label="About Title" value={settings.about_title} onChange={e => setSettings({ ...settings, about_title: e.target.value })} />
                            <TextArea label="About Text" value={settings.about_text} onChange={e => setSettings({ ...settings, about_text: e.target.value })} />

                            <label style={{ display: 'block', fontSize: '0.9rem', color: '#888' }}>Profile Image</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {settings.about_image_url && <img src={settings.about_image_url} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />}
                                <input type="file" onChange={e => handleImageUpload(e.target.files[0], 'about_image_url')} style={{ color: '#888' }} />
                            </div>
                            <Input placeholder="Or Image URL" value={settings.about_image_url} onChange={e => setSettings({ ...settings, about_image_url: e.target.value })} />

                            <h3 style={{ marginTop: '1rem' }}>Skills</h3>
                            {settings.skills.map((skill, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <Input label="Title" value={skill.title} onChange={e => updateArrayItem('skills', idx, 'title', e.target.value)} />
                                    <Input label="Subtitle" value={skill.subtitle} onChange={e => updateArrayItem('skills', idx, 'subtitle', e.target.value)} />
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Icon</label>
                                        <select value={skill.icon} onChange={e => updateArrayItem('skills', idx, 'icon', e.target.value)} style={{ width: '100%', padding: '0.7rem', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '0.5rem' }}>
                                            {['Code', 'Database', 'Brain', 'Globe', 'Rocket', 'Layers', 'Cpu', 'Github'].map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={() => removeArrayItem('skills', idx)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 /></button>
                                </div>
                            ))}
                            <button onClick={() => addArrayItem('skills', { title: '', subtitle: '', icon: 'Code' })} style={{ width: 'fit-content', padding: '0.5rem 1rem', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '0.5rem' }}>+ Add Skill</button>
                        </>
                    )}

                    {/* SECTIONS */}
                    {activeSubTab === 'sections' && (
                        <>
                            <Input label="Projects Title" value={settings.projects_title} onChange={e => setSettings({ ...settings, projects_title: e.target.value })} />
                            <Input label="Socials Title" value={settings.socials_title} onChange={e => setSettings({ ...settings, socials_title: e.target.value })} />
                        </>
                    )}

                    {/* SOCIALS */}
                    {activeSubTab === 'socials' && (
                        <>
                            {settings.socials.map((social, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '1rem', alignItems: 'end', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <Input label="Label" value={social.label} onChange={e => updateArrayItem('socials', idx, 'label', e.target.value)} />
                                    <Input label="URL" value={social.url} onChange={e => updateArrayItem('socials', idx, 'url', e.target.value)} />
                                    <Input label="Icon" value={social.icon} onChange={e => updateArrayItem('socials', idx, 'icon', e.target.value)} />
                                    <button onClick={() => removeArrayItem('socials', idx)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 /></button>
                                </div>
                            ))}
                            <button onClick={() => addArrayItem('socials', { label: '', url: '', icon: 'Globe' })} style={{ width: 'fit-content', padding: '0.5rem 1rem', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '0.5rem' }}>+ Add Social</button>
                        </>
                    )}

                    {/* FOOTER */}
                    {activeSubTab === 'footer' && (
                        <Input label="Copyright Text" value={settings.copyright_text} onChange={e => setSettings({ ...settings, copyright_text: e.target.value })} />
                    )}

                    {/* META */}
                    {activeSubTab === 'meta' && (
                        <>
                            <Input label="Browser Tab Title" value={settings.meta_title} onChange={e => setSettings({ ...settings, meta_title: e.target.value })} />
                            <TextArea label="Meta Description" value={settings.meta_description} onChange={e => setSettings({ ...settings, meta_description: e.target.value })} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
