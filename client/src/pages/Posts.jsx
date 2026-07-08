import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import { FiPlus, FiFileText, FiRefreshCw } from 'react-icons/fi';

const FILTERS = ['all', 'pending', 'posted', 'failed'];

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/posts');
      setPosts(data);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Post deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="My Posts" />
        <main className="flex-1 p-6">
          <div className="bg-dark-800 border border-dark-700 rounded-xl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-dark-700">
              {/* Filter tabs */}
              <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                      filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchPosts}
                  className="flex items-center gap-1.5 border border-dark-600 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <FiRefreshCw size={14} /> Refresh
                </button>
                <Link
                  to="/create"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FiPlus size={14} /> New Post
                </Link>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Loading posts...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FiFileText className="mx-auto text-4xl mb-3 opacity-30" />
                <p className="font-medium">No {filter !== 'all' ? filter : ''} posts found</p>
                <p className="text-sm mt-1">
                  {filter === 'all' ? 'Create your first post to get started' : 'Try a different filter'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-dark-700">
                      <th className="text-left px-4 py-3">Content</th>
                      <th className="text-left px-4 py-3">Scheduled Time</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((post) => (
                      <PostCard key={post._id} post={post} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Showing {filtered.length} of {posts.length} posts
          </p>
        </main>
      </div>
    </div>
  );
};

export default Posts;
