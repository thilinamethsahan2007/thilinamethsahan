import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { StickyViewport } from "./components/StickyViewport";
import Admin from "./pages/Admin";
import { ToastProvider } from "./components/Toast";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Component to handle dynamic titles
function MetaHandler() {
  const location = useLocation();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('meta_title, meta_description').eq('id', 1).single();
      if (data) {
        if (data.meta_title) document.title = data.meta_title;
        if (data.meta_description) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.setAttribute('content', data.meta_description);
        }
      }
    };

    // Fetch on mount and maybe on route change if we wanted route-specific titles, 
    // but for now the user acts like it's a SPA portfolio with one main title usually.
    // We'll reset to Admin for admin route though.
    if (location.pathname === '/admin') {
      document.title = "Admin | CMS";
    } else {
      fetchSettings();
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <MetaHandler />
        <Routes>
          <Route path="/" element={
            // Phase 1: One scroll container (height: ~600vh)
            <div style={{ height: "600vh", position: "relative" }}>
              <StickyViewport />
            </div>
          } />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
