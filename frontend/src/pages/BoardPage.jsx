import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ArrowLeft, Search, Filter, X, MessageSquare, Calendar, AlertCircle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../lib/api';
import useBoardStore from '../stores/boardStore';
import useProjectStore from '../stores/projectStore';
import useAuthStore from '../stores/authStore';

const STATUS_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: '#6b7280', bg: 'bg-gray-100' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-100' },
  { id: 'IN_REVIEW', label: 'In Review', color: '#6366f1', bg: 'bg-indigo-100' },
  { id: 'DONE', label: 'Done', color: '#10b981', bg: 'bg-green-100' },
];

const PRIORITY_COLORS = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-3.5 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</p>
        <span className={`badge shrink-0 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
      </div>
      {task.description && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{task.description}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Calendar size={11} />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task._count?.comments > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare size={11} />{task._count.comments}
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold" title={task.assignee.name}>
            {task.assignee.name[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { projectId, boardId } = useParams();
  const { boards, fetchBoards, moveTask, updateTaskInBoard, addTaskToBoard, removeTaskFromBoard } = useBoardStore();
  const { currentProject, fetchProject } = useProjectStore();
  const { user } = useAuthStore();

  const [tasks, setTasks] = useState({});
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState('TODO');
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentBoard = boards.find(b => b.id === boardId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProject(projectId), fetchBoards(projectId)]);
      setLoading(false);
    };
    load();
  }, [projectId, boardId]);

  useEffect(() => {
    if (currentBoard?.tasks) {
      const grouped = {};
      STATUS_COLUMNS.forEach(col => { grouped[col.id] = []; });
      currentBoard.tasks.forEach(task => {
        if (grouped[task.status]) grouped[task.status].push(task);
      });
      setTasks(grouped);
    }
  }, [currentBoard]);

  const getFilteredTasks = (status) => {
    return (tasks[status] || []).filter(task => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterAssignee && task.assigneeId !== filterAssignee) return false;
      return true;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    // Find which column the task dropped into
    const newStatus = over.id; // over could be column id
    const task = Object.values(tasks).flat().find(t => t.id === active.id);
    if (!task || !STATUS_COLUMNS.find(c => c.id === newStatus)) return;

    // Optimistic update
    setTasks(prev => {
      const newTasks = { ...prev };
      newTasks[task.status] = newTasks[task.status].filter(t => t.id !== task.id);
      newTasks[newStatus] = [...newTasks[newStatus], { ...task, status: newStatus }];
      return newTasks;
    });

    try {
      await api.patch(`/tasks/${task.id}/move`, { status: newStatus });
      updateTaskInBoard(task.id, { ...task, status: newStatus });
    } catch {
      toast.error('Failed to move task');
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const { data } = await api.post(`/boards/${boardId}/tasks`, { ...taskData, status: createStatus });
      setTasks(prev => ({
        ...prev,
        [createStatus]: [...(prev[createStatus] || []), data.data],
      }));
      addTaskToBoard(boardId, data.data);
      toast.success('Task created!');
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, updates);
      setTasks(prev => {
        const newTasks = {};
        STATUS_COLUMNS.forEach(col => {
          newTasks[col.id] = (prev[col.id] || []).map(t => t.id === taskId ? data.data : t);
        });
        return newTasks;
      });
      setSelectedTask(data.data);
      updateTaskInBoard(taskId, data.data);
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => {
        const newTasks = {};
        STATUS_COLUMNS.forEach(col => {
          newTasks[col.id] = (prev[col.id] || []).filter(t => t.id !== taskId);
        });
        return newTasks;
      });
      removeTaskFromBoard(taskId);
      setSelectedTask(null);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link to={`/projects/${projectId}`} className="hover:text-gray-700">{currentProject?.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{currentBoard?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{currentBoard?.name}</h1>
          <button onClick={() => { setCreateStatus('TODO'); setShowCreateModal(true); }} className="btn-primary btn-sm">
            <Plus size={16} /> Add Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-1.5 text-sm w-52" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input py-1.5 text-sm w-36" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || filterPriority || filterAssignee) && (
            <button onClick={() => { setSearch(''); setFilterPriority(''); setFilterAssignee(''); }} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {STATUS_COLUMNS.map((col) => {
              const colTasks = getFilteredTasks(col.id);
              return (
                <div key={col.id} className="w-72 flex flex-col shrink-0">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                      <span className="font-semibold text-gray-700 text-sm">{col.label}</span>
                      <span className="badge bg-gray-100 text-gray-500">{colTasks.length}</span>
                    </div>
                    <button onClick={() => { setCreateStatus(col.id); setShowCreateModal(true); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Drop zone */}
                  <SortableContext id={col.id} items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div
                      className="flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors"
                      style={{ background: colTasks.length === 0 ? '#f9fafb' : 'transparent' }}
                    >
                      {colTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">Drop tasks here</div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          status={createStatus}
          members={currentProject?.members || []}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          members={currentProject?.members || []}
          currentUser={user}
        />
      )}
    </div>
  );
}

// Create Task Modal
function CreateTaskModal({ status, members, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ ...form, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate || undefined });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Task details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Task Detail Modal
function TaskDetailModal({ taskId, onClose, onUpdate, onDelete, members, currentUser }) {
  const [task, setTask] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get(`/tasks/${taskId}`);
      setTask(data.data);
      setForm({
        title: data.data.title,
        description: data.data.description || '',
        status: data.data.status,
        priority: data.data.priority,
        assigneeId: data.data.assigneeId || '',
        dueDate: data.data.dueDate ? data.data.dueDate.split('T')[0] : '',
      });
    };
    load();
  }, [taskId]);

  const handleSave = async () => {
    await onUpdate(taskId, { ...form, assigneeId: form.assigneeId || null, dueDate: form.dueDate || null });
    setEditing(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content: comment });
      setTask(prev => ({ ...prev, comments: [...(prev.comments || []), data.data] }));
      setComment('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setTask(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  if (!task) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          {editing ? (
            <input className="input text-lg font-semibold flex-1 mr-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 flex-1 mr-4">{task.title}</h2>
          )}
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-5">
            <div>
              <label className="label">Description</label>
              {editing ? (
                <textarea className="input resize-none" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description || <span className="text-gray-400 italic">No description</span>}</p>
              )}
            </div>

            {/* Activity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity</h3>
              {task.activityLogs?.slice(0, 5).map(log => (
                <div key={log.id} className="flex gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {log.user.name[0]}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{log.details}</p>
                    <p className="text-xs text-gray-400">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments ({task.comments?.length || 0})</h3>
              <div className="space-y-3 mb-4">
                {task.comments?.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                      {c.user.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{c.user.name}</span>
                        <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'MMM d')}</span>
                        {c.userId === currentUser?.id && (
                          <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto">Delete</button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input className="input text-sm" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
                <button type="submit" className="btn-primary btn-sm shrink-0" disabled={submittingComment}>Post</button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div>
              <label className="label">Status</label>
              {editing ? (
                <select className="input text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                </select>
              ) : (
                <span className="badge bg-gray-100 text-gray-700">{task.status.replace('_', ' ')}</span>
              )}
            </div>
            <div>
              <label className="label">Priority</label>
              {editing ? (
                <select className="input text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              )}
            </div>
            <div>
              <label className="label">Assignee</label>
              {editing ? (
                <select className="input text-sm" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
                </select>
              ) : task.assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">{task.assignee.name[0]}</div>
                  <span className="text-sm">{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Unassigned</span>
              )}
            </div>
            <div>
              <label className="label">Due Date</label>
              {editing ? (
                <input className="input text-sm" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              ) : task.dueDate ? (
                <span className="text-sm text-gray-600">{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
              ) : (
                <span className="text-sm text-gray-400">No due date</span>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              {editing ? (
                <>
                  <button onClick={handleSave} className="btn-primary w-full justify-center btn-sm">Save Changes</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary w-full justify-center btn-sm">Cancel</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-secondary w-full justify-center btn-sm">Edit Task</button>
              )}
              <button onClick={() => onDelete(taskId)} className="btn-danger w-full justify-center btn-sm">Delete Task</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
