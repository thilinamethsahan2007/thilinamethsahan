import { useState, useEffect } from "react";
import { useScroll, useMotionValueEvent, useTransform, motion } from "framer-motion";
import { Code, Database, Brain, Github, Linkedin, Instagram, Mail, Share2, Layers, Cpu, Globe, Rocket } from "lucide-react";
import { supabase } from "../lib/supabase";

// --- Animation Components ---
const Typewriter = ({ text = "", speed = 100 }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        if (!text) return;
        let i = 0;
        setDisplayedText("");
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <span>
            {displayedText}
            <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                style={{ marginLeft: "2px", borderRight: "2px solid white", display: "inline-block", height: "1em", verticalAlign: "middle" }}
            />
        </span>
    );
};

// Map string icon names to Lucide components
const IconMap = {
    Code, Database, Brain, Github, Linkedin, Instagram, Mail, Share2, Layers, Cpu, Globe, Rocket
};

// Parse text with **highlighted** syntax
const parseHighlightedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} style={{ color: '#00f0ff', fontWeight: 600 }}>{part.slice(2, -2)}</span>;
        }
        return part;
    });
};

export const StickyViewport = () => {
    const { scrollYProgress } = useScroll();
    const [repos, setRepos] = useState([]);
    const [scroll, setScroll] = useState(0);
    const [siteSettings, setSiteSettings] = useState({
        hero_greeting: 'Hello there.',
        hero_name: 'Thilina Methsahan',
        hero_tagline: 'Creative Developer & UI Designer',
        about_title: 'The Human Anchor',
        about_text: "Beyond the code, I explore the intersection of rigorous mathematics and creative engineering. I don't just build systems; I architect digital experiences that feel alive.",
        about_image_url: "https://picsum.photos/400/400?grayscale",
        skills: [
            { title: "Engineering", subtitle: "Full-Stack Arch", icon: "Code" },
            { title: "Data", subtitle: "Predictive Modeling", icon: "Database" },
            { title: "AI", subtitle: "Generative Systems", icon: "Brain" }
        ],
        socials: [
            { label: "GitHub", url: "https://github.com", icon: "Github" },
            { label: "Email", url: "mailto:hello@thilina.dev", icon: "Mail" }
        ],
        projects_title: 'SELECTED WORKS',
        socials_title: 'Online Presence',
        copyright_text: '© 2025 Thilina Methsahan'
    });

    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        // console.log("Scroll:", latest.toFixed(2));
    });

    // --- Data Fetching (Supabase CMS) ---
    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('is_pinned', { ascending: false, nullsFirst: false })
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('id', { ascending: false });

            if (error) console.error("Supabase Error:", error);
            if (data) setRepos(data);
        };

        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (data) {
                // Parse skills and socials if needed
                const skills = Array.isArray(data.skills)
                    ? data.skills
                    : (typeof data.skills === 'string' ? JSON.parse(data.skills) : siteSettings.skills);

                const socials = Array.isArray(data.socials)
                    ? data.socials
                    : (typeof data.socials === 'string' ? JSON.parse(data.socials) : siteSettings.socials);

                setSiteSettings(prev => ({
                    ...prev,
                    ...data,
                    skills,
                    socials,
                    // Ensure about_image_url falls back to default if empty string
                    about_image_url: data.about_image_url || prev.about_image_url
                }));
            }
        };

        fetchProjects();
        fetchSettings();
    }, []);

    // --- Transforms ---

    // 1. Hello (0.0 - 0.15)
    const helloScale = useTransform(scrollYProgress, [0, 0.15], [1, 8]);
    const helloOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

    // 2. Name (0.15 - 0.30)
    const nameScale = useTransform(scrollYProgress, [0.15, 0.30], [2, 1]);
    const nameOpacity = useTransform(scrollYProgress, [0.14, 0.15, 0.30, 0.35], [0, 1, 1, 0]);

    // 3. Tagline (0.30 - 0.45)
    const taglineY = useTransform(scrollYProgress, [0.30, 0.45], [50, 0]);
    const taglineOpacity = useTransform(scrollYProgress, [0.30, 0.35, 0.45, 0.50], [0, 1, 1, 0]);

    // 4. About (0.45 - 0.70)
    // Enter: 0.45-0.50
    // Read: 0.50-0.60
    // Zoom: 0.60-0.68
    const aboutOpacity = useTransform(scrollYProgress, [0.45, 0.50, 0.60, 0.68], [0, 1, 1, 0]);
    const aboutScale = useTransform(scrollYProgress, [0.45, 0.50, 0.60, 0.68], [0.8, 1, 1, 3]);
    const aboutRadius = useTransform(scrollYProgress, [0.60, 0.68], ["1.5rem", "0rem"]);

    // 5. Projects - DYNAMIC based on number of projects
    // Each project card is ~450px + 2rem gap. Calculate total scroll needed.
    const projectCardWidth = 480; // ~450px card + 30px gap
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const totalProjectsWidth = repos.length * projectCardWidth + 300; // +300 for label

    // Calculate how far we need to scroll (as percentage of total width)
    const scrollNeeded = Math.max(100, (totalProjectsWidth / viewportWidth) * 100);
    const projectsEndX = `-${scrollNeeded}%`;

    // Projects section takes up proportionally more scroll time if there are more projects
    // Base: 0.65 to 0.95 (0.30 range). More projects = extend fade out point
    const baseProjectsEnd = 0.92;
    const projectsExtension = Math.min(0.06, repos.length * 0.01); // max +0.06
    const projectsFadeStart = Math.min(0.96, baseProjectsEnd + projectsExtension);
    const projectsFadeEnd = Math.min(0.99, projectsFadeStart + 0.03);

    const projectsOpacity = useTransform(scrollYProgress, [0.63, 0.68, projectsFadeStart, projectsFadeEnd], [0, 1, 1, 0]);
    const projectsX = useTransform(scrollYProgress, [0.65, projectsFadeStart], ["10%", projectsEndX]);

    // 6. Socials - Starts after projects fade
    const socialsStart = projectsFadeStart;
    const socialsOpacity = useTransform(scrollYProgress, [socialsStart - 0.01, Math.min(1, socialsStart + 0.03)], [0, 1]);
    const socialsScale = useTransform(scrollYProgress, [socialsStart, 1.0], [0.5, 1]);

    // Track scroll for pointer events
    useMotionValueEvent(scrollYProgress, "change", (latest) => setScroll(latest));


    return (
        <main
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                display: "grid",
                gridTemplateColumns: "100vw",
                gridTemplateRows: "100vh",
                placeItems: "center",
                overflow: "hidden",
                textAlign: "center"
            }}
        >

            {/* --- Parallax Background --- */}
            <motion.div
                style={{
                    gridArea: "1/1",
                    width: "100%",
                    height: "120%",
                    zIndex: -1,
                    background: "radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0, 240, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at center, #0a0a0a 0%, #000 100%)",
                    y: useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]),
                    scale: useTransform(scrollYProgress, [0, 1], [1, 1.05]),
                }}
            />
            {/* Mid Layer */}
            <motion.div
                style={{
                    gridArea: "1/1",
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, rgba(138, 43, 226, 0.2), rgba(0, 0, 255, 0.1))",
                    zIndex: -1,
                    filter: "blur(80px)",
                    x: useTransform(scrollYProgress, [0, 1], ["-50%", "50%"]),
                    y: useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]),
                }}
            />

            {/* 1. Hello */}
            <motion.h1
                style={{
                    gridArea: "1/1",
                    scale: helloScale,
                    opacity: helloOpacity,
                    fontSize: "clamp(2rem, 5vw, 4rem)",
                    fontWeight: "bold",
                    width: "100%",
                    padding: "0 1rem"
                }}
            >
                <Typewriter text={siteSettings.hero_greeting} speed={150} />
            </motion.h1>

            {/* 2. Name */}
            <motion.h2
                style={{
                    gridArea: "1/1",
                    scale: nameScale,
                    opacity: nameOpacity,
                    fontSize: "clamp(2.5rem, 8vw, 6rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    width: "100%",
                    padding: "0 1rem",
                    lineHeight: 1.1
                }}
            >
                I'm <span className="gradient-text">{siteSettings.hero_name}</span>
            </motion.h2>

            {/* 3. Tagline */}
            <motion.div
                style={{
                    gridArea: "1/1",
                    y: taglineY,
                    opacity: taglineOpacity
                }}
            >
                <p style={{
                    fontSize: "2rem",
                    fontWeight: 300,
                    color: "#aaa",
                    animation: "glitch 8s infinite"
                }}>
                    {siteSettings.hero_tagline}
                </p>
            </motion.div>

            {/* 4. About */}
            <motion.section
                style={{
                    gridArea: "1/1",
                    scale: aboutScale,
                    opacity: aboutOpacity,
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                <motion.div
                    className="glass"
                    style={{
                        borderRadius: aboutRadius,
                        padding: "clamp(1.5rem, 3vw, 3rem)",
                        width: "min(90vw, 900px)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "3rem",
                        alignItems: "center",
                        textAlign: "left"
                    }}
                >
                    {/* Left Col: Image & Spinners */}
                    <div style={{ position: "relative", width: "300px", height: "300px", margin: "0 auto" }}>

                        {/* Glowing Ring */}
                        <motion.div
                            animate={{
                                boxShadow: [
                                    "0 0 20px rgba(139, 92, 246, 0.3), 0 0 50px rgba(0, 240, 255, 0.2)",
                                    "0 0 30px rgba(139, 92, 246, 0.5), 0 0 70px rgba(0, 240, 255, 0.4)",
                                    "0 0 20px rgba(139, 92, 246, 0.3), 0 0 50px rgba(0, 240, 255, 0.2)"
                                ]
                            }}
                            transition={{
                                boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                            }}
                            style={{
                                position: "absolute",
                                inset: "-3px",
                                borderRadius: "50%",
                                // border: "2px solid rgba(139, 92, 246, 0.5)", // Removed dark ring
                            }}
                        />


                        {/* Image Container */}
                        <div style={{
                            position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
                            border: "2px solid rgba(255,255,255,0.1)", background: "#111"
                        }}>
                            <img
                                src={siteSettings.about_image_url}
                                alt="Profile"
                                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
                            />
                        </div>
                    </div>

                    {/* Right Col: Text & Skills */}
                    <div>
                        <h3 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginBottom: "1.5rem", lineHeight: 1.1 }}>
                            {siteSettings.about_title.split(' ').map((word, i) => (
                                <span key={i} style={{ color: i === siteSettings.about_title.split(' ').length - 1 ? 'var(--primary)' : 'inherit' }}>{word} </span>
                            ))}
                        </h3>
                        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
                            {parseHighlightedText(siteSettings.about_text)}
                        </p>

                        {/* Skills Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2rem" }}>
                            {siteSettings.skills.map((skill, i) => {
                                const IconComp = IconMap[skill.icon] || Code;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" }}
                                        whileHover={{ scale: 1.15, rotate: 5, y: -5 }}
                                        style={{ textAlign: "center", cursor: "default" }}
                                    >
                                        <IconComp size={24} style={{ color: ["#f59e0b", "#06b6d4", "#8b5cf6"][i % 3], margin: "0 auto 0.5rem" }} />
                                        <h4 style={{ fontSize: "0.9rem", color: "#fff" }}>{skill.title}</h4>
                                        <p style={{ fontSize: "0.75rem", color: "#666" }}>{skill.subtitle}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                </motion.div>
            </motion.section>

            {/* 5. Projects (Carousel) */}
            <motion.section
                style={{
                    gridArea: "1/1",
                    opacity: projectsOpacity,
                    width: "100%",
                    overflow: "visible"
                }}
            >
                <motion.div
                    style={{
                        display: "flex",
                        gap: "2rem",
                        x: projectsX, // Drive horizontal scroll
                        paddingLeft: "50vw" // Start offset
                    }}
                >
                    <div style={{ flexShrink: 0, width: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <h3 style={{ fontSize: "3rem", writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>{siteSettings.projects_title || 'SELECTED WORKS'}</h3>
                    </div>

                    {repos.length > 0 ? (
                        repos.map((repo, idx) => (
                            <motion.div
                                key={repo.id}
                                className="glass tilt-card"
                                whileHover={{
                                    scale: 1.03,
                                    y: -10,
                                    rotateX: 5,
                                    rotateY: -5,
                                    borderColor: "var(--accent)",
                                    boxShadow: "0 25px 50px -15px rgba(0, 240, 255, 0.35), 0 0 30px rgba(139, 92, 246, 0.2)"
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                style={{
                                    position: "relative",
                                    flexShrink: 0,
                                    width: "min(85vw, 450px)",
                                    borderRadius: "1.5rem",
                                    textAlign: "left",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    transformStyle: "preserve-3d",
                                    perspective: "1000px"
                                }}
                            >
                                {/* Capsule Link - Top Right */}
                                {(repo.demo_url || repo.repo_url) && (
                                    <motion.a
                                        href={repo.demo_url || repo.repo_url}
                                        target="_blank"
                                        whileHover={{ scale: 1.05 }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            position: "absolute",
                                            bottom: "1rem",
                                            right: "1rem",
                                            padding: "0.4rem 0.8rem",
                                            background: repo.demo_url
                                                ? "linear-gradient(90deg, #8b5cf6, #06b6d4)"
                                                : "rgba(0,0,0,0.7)",
                                            border: repo.demo_url ? "none" : "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "2rem",
                                            color: "#fff",
                                            fontSize: "0.7rem",
                                            textDecoration: "none",
                                            fontWeight: "600",
                                            zIndex: 10,
                                            backdropFilter: "blur(10px)"
                                        }}
                                    >
                                        {repo.demo_url ? "LIVE ✨" : "CODE →"}
                                    </motion.a>
                                )}
                                {/* Project Image */}
                                {repo.image_url && (
                                    <div style={{
                                        width: "100%",
                                        height: "200px",
                                        overflow: "hidden",
                                        background: "#111"
                                    }}>
                                        <img
                                            src={repo.image_url}
                                            alt={repo.title}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                transition: "transform 0.3s ease"
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
                                            onMouseOut={(e) => e.target.style.transform = "scale(1)"}
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                                    <h4 style={{
                                        fontSize: "1.8rem",
                                        marginBottom: "0.5rem",
                                        fontWeight: 700,
                                        background: "linear-gradient(90deg, #fff, #aaa)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}>
                                        {repo.title || repo.name || "Untitled"}
                                    </h4>

                                    <p style={{
                                        fontSize: "1rem",
                                        color: "var(--text-muted)",
                                        marginBottom: "1rem",
                                        lineHeight: 1.5,
                                        flex: 1
                                    }}>
                                        {repo.description || "No description provided."}
                                    </p>

                                    {/* Tags */}
                                    {repo.tags && repo.tags.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                            {(Array.isArray(repo.tags) ? repo.tags : [repo.tags]).map((tag, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        padding: "0.3rem 0.8rem",
                                                        background: "rgba(138, 43, 226, 0.2)",
                                                        border: "1px solid rgba(138, 43, 226, 0.4)",
                                                        borderRadius: "2rem",
                                                        fontSize: "0.75rem",
                                                        color: "#c4b5fd",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.5px"
                                                    }}
                                                >
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div style={{ color: "var(--text-muted)" }}>Loading Projects...</div>
                    )}
                </motion.div>
            </motion.section>

            {/* 6. Socials */}
            <motion.section
                style={{
                    gridArea: "1/1",
                    scale: socialsScale,
                    opacity: socialsOpacity,
                    pointerEvents: scroll > socialsStart ? "auto" : "none"
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
                    <h2 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: "bold", marginBottom: "3rem" }}>
                        {siteSettings.socials_title ? (
                            siteSettings.socials_title.split(' ').map((word, i) => (
                                <span key={i} style={{ color: i === 1 ? '#f59e0b' : 'inherit' }}>{word} </span>
                            ))
                        ) : (
                            <>Online <span style={{ color: "#f59e0b" }}>Presence</span>.</>
                        )}
                    </h2>

                    <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap", justifyContent: "center" }}>
                        {(siteSettings.socials || []).filter(item => item.url).map((social, index) => {
                            const IconComp = IconMap[social.icon] || Globe;
                            const colors = ["#8b5cf6", "#00f0ff", "#f59e0b", "#06b6d4", "#ec4899"];
                            const color = colors[index % colors.length];
                            return (
                                <motion.a
                                    key={index}
                                    href={social.url}
                                    target="_blank"
                                    initial={{ opacity: 0, y: 30, scale: 0.5 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: index * 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textDecoration: "none",
                                        color: "var(--text-main)",
                                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-10px) scale(1.05)";
                                        const iconWrap = e.currentTarget.querySelector(".icon-wrap");
                                        if (iconWrap) {
                                            iconWrap.style.boxShadow = `0 0 30px ${color}80, 0 0 60px ${color}40`;
                                            iconWrap.style.borderColor = color;
                                        }
                                        const svg = e.currentTarget.querySelector("svg");
                                        if (svg) svg.style.color = color;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                                        const iconWrap = e.currentTarget.querySelector(".icon-wrap");
                                        if (iconWrap) {
                                            iconWrap.style.boxShadow = "0 0 0 transparent";
                                            iconWrap.style.borderColor = "rgba(255,255,255,0.15)";
                                        }
                                        const svg = e.currentTarget.querySelector("svg");
                                        if (svg) svg.style.color = "white";
                                    }}
                                >
                                    <div
                                        className="icon-wrap"
                                        style={{
                                            width: "80px",
                                            height: "80px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            marginBottom: "1rem",
                                            transition: "all 0.4s ease"
                                        }}
                                    >
                                        <IconComp size={32} style={{ transition: "color 0.3s ease" }} />
                                    </div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.6, fontWeight: 500 }}>{social.label}</span>
                                </motion.a>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: "4rem", opacity: 0.5, fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                        {siteSettings.copyright_text}
                    </div>
                </div>
            </motion.section>
        </main >
    );
};
