import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Layout, Users, Settings, ArrowLeft, X, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import useProjectStore from '../stores/projectStore';
import useBoardStore from '../stores/boardStore';
import useAuthStore from '../stores/authStore';

export default function ProjectPage() {
  const { projectId } = useParams();
  const { currentProject, fetchProject, inviteMember, removeMember } = useProjectStore();
  const { boards, fetchBoards, createBoard, deleteBoard } = useBoardStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('boards');
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [boardForm, setBoardForm] = useState({ name: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProject(projectId);
    fetchBoards(projectId);
  }, [projectId]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBoard(projectId, boardForm);
      toast.success('Board created!');
      setShowBoardModal(false);
      setBoardForm({ name: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteMember(projectId, inviteForm.email, inviteForm.role);
      toast.success('Member invited!');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'MEMBER' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (e, boardId) => {
    e.preventDefault();
    if (!confirm('Delete this board and all its tasks?')) return;
    try {
      await deleteBoard(projectId, boardId);
      toast.success('Board deleted');
    } catch {
      toast.error('Failed to delete board');
    }
  };

  const isOwnerOrAdmin = currentProject?.ownerId === user?.id ||
    currentProject?.members?.find(m => m.userId === user?.id)?.role === 'ADMIN';

  if (!currentProject) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: currentProject.color }}>
              {currentProject.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
              {currentProject.description && <p className="text-gray-500 text-sm">{currentProject.description}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {[{ id: 'boards', label: 'Boards', icon: Layout }, { id: 'members', label: 'Members', icon: Users }].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Boards Tab */}
      {tab === 'boards' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{boards.length} boards</p>
            <button onClick={() => setShowBoardModal(true)} className="btn-primary btn-sm">
              <Plus size={16} /> New Board
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link key={board.id} to={`/projects/${projectId}/boards/${board.id}`} className="card p-5 hover:shadow-md transition-shadow group relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Layout size={20} className="text-indigo-600" />
                  </div>
                  {isOwnerOrAdmin && (
                    <button onClick={(e) => handleDeleteBoard(e, board.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{board.name}</h3>
                {board.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{board.description}</p>}
                <p className="text-xs text-gray-400 mt-3">{board.tasks?.length || 0} tasks</p>
              </Link>
            ))}
            <button onClick={() => setShowBoardModal(true)} className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-500">
              <Plus size={24} />
              <span className="text-sm font-medium">Add Board</span>
            </button>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{currentProject.members?.length} members</p>
            {isOwnerOrAdmin && (
              <button onClick={() => setShowInviteModal(true)} className="btn-primary btn-sm">
                <UserPlus size={16} /> Invite Member
              </button>
            )}
          </div>
          <div className="card divide-y divide-gray-100">
            {currentProject.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                    {member.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{member.user.name}</p>
                    <p className="text-xs text-gray-400">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${member.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700' : member.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {member.role}
                  </span>
                  {isOwnerOrAdmin && member.userId !== user?.id && member.role !== 'OWNER' && (
                    <button onClick={() => removeMember(projectId, member.userId)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Modal */}
      {showBoardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Board</h2>
              <button onClick={() => setShowBoardModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="label">Board Name *</label>
                <input className="input" placeholder="Sprint 1" value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="Optional description" value={boardForm.description} onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBoardModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Create Board</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Invite Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="label">Email Address *</label>
                <input className="input" type="email" placeholder="member@example.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
