import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { FiFileText, FiClock, FiCheckCircle, FiXCircle, FiPlus } from 'react-icons/fi';

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-dark-800 border border-dark-700 rounded-xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const statusStyles = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  posted: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, posted: 0, failed: 0 });
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, postsRes] = await Promise.all([
          api.get('/posts/stats'),
          api.get('/posts'),
        ]);
        setStats(statsRes.data);
        setRecentPosts(postsRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { icon: <FiFileText className="text-blue-400 text-xl" />, label: 'Total Posts', value: stats.total, color: 'bg-blue-500/20' },
    { icon: <FiClock className="text-yellow-400 text-xl" />, label: 'Scheduled', value: stats.pending, color: 'bg-yellow-500/20' },
    { icon: <FiCheckCircle className="text-green-400 text-xl" />, label: 'Published', value: stats.posted, color: 'bg-green-500/20' },
    { icon: <FiXCircle className="text-red-400 text-xl" />, label: 'Failed', value: stats.failed, color: 'bg-red-500/20' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Dashboard" />
        <main className="flex-1 p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* Recent Posts */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <h2 className="font-semibold text-white">Recent Posts</h2>
              <Link
                to="/create"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <FiPlus size={14} /> New Post
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : recentPosts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <FiFileText className="mx-auto text-3xl mb-2 opacity-40" />
                <p>No posts yet. Create your first one!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-dark-700">
                      <th className="text-left px-5 py-3">Content</th>
                      <th className="text-left px-5 py-3">Scheduled</th>
                      <th className="text-left px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPosts.map((post) => (
                      <tr key={post._id} className="border-b border-dark-700 hover:bg-dark-700/40 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-300 max-w-xs">
                          <p className="truncate">{post.content}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">
                          {new Date(post.scheduledTime).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusStyles[post.status]}`}>
                            {post.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
