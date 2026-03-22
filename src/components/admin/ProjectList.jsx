import { Trash2, Pin, RefreshCw, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ProjectList({ projects, onEdit, onDelete, onTogglePin, onReorder, onRefresh }) {

    // Sort projects: Pinned first, then by sort_order
    const sortedProjects = [...projects].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
        return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        
        if (sourceIndex === destinationIndex) return;

        const items = Array.from(sortedProjects);
        const [reorderedItem] = items.splice(sourceIndex, 1);
        items.splice(destinationIndex, 0, reorderedItem);

        if (onReorder) onReorder(items);
    };

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

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="projects">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {sortedProjects.map((p, index) => (
                                <Draggable key={p.id.toString()} draggableId={p.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            style={{
                                                padding: '1rem',
                                                background: p.is_pinned ? '#1a1a2e' : (snapshot.isDragging ? '#222' : '#111'),
                                                borderRadius: '0.5rem',
                                                border: p.is_pinned ? '1px solid #d4af37' : '1px solid #222',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.5)' : 'none',
                                                ...provided.draggableProps.style
                                            }}
                                        >
                                            {/* Drag Handle */}
                                            <div {...provided.dragHandleProps} style={{ marginRight: '1rem', color: '#666', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                                                <GripVertical size={20} />
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <b style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                    {p.is_pinned && <Pin size={12} color="#d4af37" />}
                                                    {p.title}
                                                </b>
                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => onTogglePin(p)} title={p.is_pinned ? 'Unpin' : 'Pin to top'} style={{ padding: '0.4rem', background: p.is_pinned ? '#d4af37' : '#222', border: 'none', color: p.is_pinned ? '#000' : '#fff', borderRadius: '0.3rem', cursor: 'pointer' }}><Pin size={14} /></button>
                                                <button onClick={() => onEdit(p)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#fbbf24', borderRadius: '0.3rem', cursor: 'pointer' }}>Edit</button>
                                                <button onClick={() => onDelete(p.id)} style={{ padding: '0.4rem', background: '#222', border: 'none', color: '#ef4444', borderRadius: '0.3rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {projects.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No projects found.</div>}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}
