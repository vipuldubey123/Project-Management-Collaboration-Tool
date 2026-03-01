import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, FolderOpen, LogOut, Menu, X, User, ChevronDown } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useProjectStore from '../../stores/projectStore';

export default function AppLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900">ProjectHub</span>
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 mb-1 transition-colors">
            <LayoutDashboard size={18} />
            {sidebarOpen && <span className="text-sm font-medium">Dashboard</span>}
          </Link>

          {sidebarOpen && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Projects</p>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 mb-0.5 transition-colors ${projectId === project.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}`}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100 relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
