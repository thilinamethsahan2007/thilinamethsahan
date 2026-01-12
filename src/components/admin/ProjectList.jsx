import { Trash2, Pin, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

export default function ProjectList({ projects, onEdit, onDelete, onTogglePin, onMove, onRefresh }) {

    // Sort projects: Pinned first, then by sort_order
    const sortedProjects = [...projects].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
        return (a.sort_order || 0) - (b.sort_order || 0);
    });

    return (
        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '1rem', padding: '1.5rem', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Your Projects</h3>
                <button onClick={onRefresh} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><RefreshCw size={16} /></button>
            </div>

            <button
                onClick={() => onEdit(null)} // null = Create New
                style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px dashed #444', borderRadius: '0.5rem', color: '#888', cursor: 'pointer', textAlign: 'center', marginBottom: '1rem' }}
            >
                + Create New
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedProjects.map((p, index) => (
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
                                onClick={() => onMove(p.id, 'up')}
                                disabled={index === 0}
                                style={{ background: 'transparent', border: 'none', color: index === 0 ? '#333' : '#666', cursor: index === 0 ? 'default' : 'pointer', padding: '0.1rem' }}
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={() => onMove(p.id, 'down')}
                                disabled={index === projects.length - 1} // Using projects.length, but logically sortedProjects index is what matters for UI. 
                                // Ideally `onMove` should handle the logic based on the sorted list or actual list. 
                                // Since we pass ID, the parent handler knows all.
                                style={{ background: 'transparent', border: 'none', color: index === projects.length - 1 ? '#333' : '#666', cursor: index === projects.length - 1 ? 'default' : 'pointer', padding: '0.1rem' }}
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
                                onClick={() => onTogglePin(p)}
                                title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                                style={{ padding: '0.4rem', background: p.is_pinned ? '#8b5cf6' : '#222', border: 'none', color: '#fff', borderRadius: '0.3rem', cursor: 'pointer' }}
                            >
                                <Pin size={14} />
                            </button>
                            <button onClick={() => onEdit(p)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#fbbf24', borderRadius: '0.3rem', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => onDelete(p.id)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#ef4444', borderRadius: '0.3rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No projects found.</div>}
            </div>
        </div>
    );
}
