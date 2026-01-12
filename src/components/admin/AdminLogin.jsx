import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess }) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            addToast("Logged in successfully!", "success");
            if (onLoginSuccess) onLoginSuccess(data.session);
        } catch (error) {
            addToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#000', color: '#fff' }}>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '320px', padding: '2rem', border: '1px solid #333', borderRadius: '1rem', background: '#0a0a0a' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Admin Access</h2>

                <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem', paddingLeft: '3rem', borderRadius: '0.5rem', border: '1px solid #333', background: '#111', color: '#fff', outline: 'none' }}
                    />
                </div>

                <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.8rem', paddingLeft: '3rem', borderRadius: '0.5rem', border: '1px solid #333', background: '#111', color: '#fff', outline: 'none' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        marginTop: '1rem',
                        padding: '0.8rem',
                        background: 'var(--primary, #8b5cf6)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Processing...' : <><LogIn size={18} /> Login</>}
                </button>
            </form>
        </div>
    );
}
