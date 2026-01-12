import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Save, Github, Image as ImageIcon, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Simple UI Components
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

export default function ProjectEditor({ projectToEdit, onSaveSuccess, onCancel }) {
    const { addToast } = useToast();
    const [editMode, setEditMode] = useState(false);

    // Form State
    const [content, setContent] = useState({
        title: '',
        description: '',
        tags: '',
        image_url: '',
        repo_url: '',
        demo_url: ''
    });

    // Aux State
    const [repos, setRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Initialize when projectToEdit changes
    useEffect(() => {
        if (projectToEdit) {
            setEditMode(true);
            setContent({
                title: projectToEdit.title,
                description: projectToEdit.description,
                tags: projectToEdit.tags || [],
                image_url: projectToEdit.image_url,
                repo_url: projectToEdit.repo_url || '',
                demo_url: projectToEdit.demo_url || ''
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setEditMode(false);
            resetForm();
        }
    }, [projectToEdit]);

    const resetForm = () => {
        setContent({ title: '', description: '', tags: '', image_url: '', repo_url: '', demo_url: '' });
        setSelectedRepo(null);
    };

    // --- GitHub ---
    const fetchRepos = async () => {
        const username = import.meta.env.VITE_GITHUB_USERNAME; // Make sure this is set in .env
        const token = import.meta.env.VITE_GITHUB_TOKEN; // Optional

        if (!username) return addToast("Please set VITE_GITHUB_USERNAME in .env", "error");

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
        setContent({
            ...content,
            title: repo.name,
            description: repo.description || '',
            tags: repo.language ? [repo.language] : [],
            repo_url: repo.html_url,
            demo_url: repo.homepage || '',
            image_url: `https://opengraph.githubassets.com/1/${repo.full_name}`
        });
        addToast(`Imported info from ${repo.name}`, "info");
    };

    // --- AI Generator ---
    const generateContent = async () => {
        // This assumes we have a selectedRepo to generate from, or at least a title
        if (!selectedRepo && !content.repo_url) {
            return addToast("Import a GitHub repo first to generate content via AI.", "error");
        }

        setGenerating(true);
        try {
            // Initialize Gemini
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            let context = `Project Title: ${content.title}. `;
            if (selectedRepo?.description) context += `Description: ${selectedRepo.description}. `;
            if (content.repo_url) context += `Repo URL: ${content.repo_url}. `;

            const prompt = `
                I am building a web portfolio. 
                Based on the following project info: "${context}".
                
                Please generate:
                1. A catchy, professional description (max 2 sentences).
                2. A comma-separated list of 3-5 relevant technical tags (technologies likely used based on the description or common stacks).
                
                Format the response strictly as JSON:
                {
                    "description": "...",
                    "tags": "tag1, tag2, tag3"
                }
             `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Simple JSON parsing (removing markdown code blocks if present)
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            setContent(prev => ({
                ...prev,
                description: data.description || prev.description,
                tags: data.tags ? data.tags.split(',').map(t => t.trim()) : prev.tags
            }));

            addToast("AI generated description & tags!", "success");

        } catch (err) {
            console.error("AI Error:", err);
            addToast("Failed to generate content: " + err.message, "error");
        } finally {
            setGenerating(false);
        }
    };

    // --- Image Upload ---
    const handleImageUpload = async (file) => {
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

            setContent({ ...content, image_url: urlData.publicUrl });
            addToast('Image uploaded successfully!', 'success');
        } catch (err) {
            console.error(err);
            addToast('Upload failed: ' + err.message, 'error');
        }
        setUploading(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        } else {
            addToast('Please drop an image file.', 'error');
        }
    };

    // --- Save ---
    const handleSave = async () => {
        const payload = {
            title: content.title,
            description: content.description,
            tags: Array.isArray(content.tags) ? content.tags : content.tags.split(','),
            image_url: content.image_url,
            repo_url: content.repo_url,
            demo_url: content.demo_url
        };

        if (!payload.title) return addToast("Title is required", "error");

        let error;
        if (editMode && projectToEdit?.id) {
            const res = await supabase.from('projects').update(payload).eq('id', projectToEdit.id);
            error = res.error;
        } else {
            const res = await supabase.from('projects').insert([payload]);
            error = res.error;
        }

        if (error) addToast("Error saving: " + error.message, "error");
        else {
            addToast("Project saved successfully!", "success");
            onSaveSuccess();
            if (!editMode) resetForm(); // Keep form open if creating multiple unique ones, but maybe better to reset.
        }
    };

    return (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: editMode ? '#fbbf24' : '#22c55e' }}>{editMode ? 'Edit Project' : 'New Project'}</h2>
                    {(selectedRepo || content.repo_url) && (
                        <button
                            onClick={generateContent}
                            disabled={generating}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            <Sparkles size={16} /> {generating ? 'Generating...' : 'AI Enhance'}
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <Input label="Project Title" value={content.title} onChange={e => setContent({ ...content, title: e.target.value })} />
                    <TextArea label="Description" value={content.description} onChange={e => setContent({ ...content, description: e.target.value })} />

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Project Image</label>
                        <div
                            onDrop={handleDrop}
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
                            {uploading ? <span>Uploading...</span> : content.image_url ? (
                                <img src={content.image_url} alt="Preview" style={{ maxHeight: '200px', borderRadius: '0.5rem' }} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                                    <ImageIcon size={32} style={{ marginBottom: '0.5rem' }} />
                                    <span>Drag image or click to upload</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100px' }} />
                        </div>
                        <Input
                            placeholder="Or paste image URL"
                            value={content.image_url}
                            onChange={e => setContent({ ...content, image_url: e.target.value })}
                            style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                        />
                    </div>

                    <Input label="Tags (comma separated)" value={content.tags} onChange={e => setContent({ ...content, tags: Array.isArray(e.target.value) ? e.target.value : e.target.value.split(',') })} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input label="Repo URL" value={content.repo_url} onChange={e => setContent({ ...content, repo_url: e.target.value })} placeholder="https://github.com/..." />
                        <Input label="Demo URL" value={content.demo_url} onChange={e => setContent({ ...content, demo_url: e.target.value })} placeholder="https://..." />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleSave}
                            style={{
                                flex: 1,
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
                        {editMode && (
                            <button
                                onClick={onCancel}
                                style={{
                                    padding: '1rem',
                                    background: '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
