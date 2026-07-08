import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BsPinterest, BsTelegram } from 'react-icons/bs';
import {
  FiInstagram,
  FiLinkedin,
  FiTwitter,
  FiFacebook,
  FiSend,
  FiCalendar,
  FiClock,
  FiImage,
  FiX,
  FiPlus,
  FiCheckCircle,
  FiTrash2,
  FiAlertCircle
} from 'react-icons/fi';

const platformDetails = {
  telegram: { name: 'Telegram', icon: <BsTelegram className="text-sky-400" /> },
  instagram: { name: 'Instagram', icon: <FiInstagram className="text-pink-500" /> },
  linkedin: { name: 'LinkedIn', icon: <FiLinkedin className="text-blue-500" /> },
  twitter: { name: 'X / Twitter', icon: <FiTwitter className="text-gray-200" /> },
  facebook: { name: 'Facebook', icon: <FiFacebook className="text-blue-600" /> },
  pinterest: { name: 'Pinterest', icon: <BsPinterest className="text-red-500" /> },
};

const Scheduler = () => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [accountsRes, postsRes] = await Promise.all([
        api.get('/social/accounts'),
        api.get('/posts'),
      ]);
      setConnectedAccounts(accountsRes.data);
      setPosts(postsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePlatform = (platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleSchedulePost = async (e) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one social media platform');
      return;
    }
    if (!content.trim()) {
      toast.error('Post content is required');
      return;
    }
    if (!scheduledTime) {
      toast.error('Schedule time is required');
      return;
    }
    if (new Date(scheduledTime) <= new Date()) {
      toast.error('Schedule time must be in the future');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post('/posts/create', {
        content,
        imageUrl: mediaUrl || null,
        scheduledTime: new Date(scheduledTime).toISOString(),
        platforms: selectedPlatforms,
      });
      toast.success('Post scheduled successfully!');
      setContent('');
      setMediaUrl('');
      setScheduledTime('');
      setSelectedPlatforms([]);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to schedule post');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success('Post deleted successfully');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete post');
    }
  };

  const upcomingPosts = posts.filter((p) => p.status === 'pending');
  const publishedPosts = posts.filter((p) => p.status === 'posted');

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Scheduler" />
        <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Left Compose Panel */}
          <div className="w-full lg:w-[450px] shrink-0">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-5 space-y-5 sticky top-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FiSend className="text-blue-500" /> Compose Post
              </h2>

              <form onSubmit={handleSchedulePost} className="space-y-4">
                {/* Platform Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Platforms
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(platformDetails).map((key) => {
                      const details = platformDetails[key];
                      const isConnected = connectedAccounts.some((a) => a.platform === key);
                      const isSelected = selectedPlatforms.includes(key);
                      
                      const alwaysEnabled = key === 'telegram';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (!isConnected && !alwaysEnabled) {
                              toast.error(`Connect ${details.name} in Accounts first`);
                              return;
                            }
                            handleTogglePlatform(key);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : isConnected || alwaysEnabled
                              ? 'bg-dark-700/50 border-dark-600 text-gray-300 hover:border-dark-500'
                              : 'bg-dark-800 border-dark-700 text-gray-500 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-sm">{details.icon}</span>
                          {details.name}
                        </button>
                      );
                    })}
                  </div>
                  {connectedAccounts.length === 0 && (
                    <p className="text-xs text-yellow-500/80 mt-1.5 flex items-center gap-1">
                      <FiAlertCircle /> Link accounts first to enable options.
                    </p>
                  )}
                </div>

                {/* Content Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Post Content
                  </label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type post copy, hashtags & links here..."
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                    required
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{content.length} characters</span>
                    <span>max 280 for X</span>
                  </div>
                </div>

                {/* Media Url Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <FiImage className="inline mr-1" /> Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                {/* Image Preview */}
                {mediaUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-dark-600 h-32 bg-dark-900 flex items-center justify-center">
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}

                {/* Date & Time Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                    <FiCalendar size={14} /> Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    required
                  />
                </div>

                {/* Schedule Button */}
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/10 mt-2"
                >
                  <FiClock size={16} />
                  {submitLoading ? 'Scheduling...' : 'Schedule Post'}
                </button>

              </form>
            </div>
          </div>

          {/* Right Queue Panel */}
          <div className="flex-1 space-y-6">
            
            {/* Upcoming/Scheduled queue */}
            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-750">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                  <FiClock className="text-yellow-500" /> Upcoming Posts ({upcomingPosts.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading posts...</div>
              ) : upcomingPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No upcoming posts. Compose one to schedule!
                </div>
              ) : (
                <div className="divide-y divide-dark-700">
                  {upcomingPosts.map((post) => (
                    <div key={post._id} className="p-5 flex flex-col md:flex-row justify-between gap-4 hover:bg-dark-750/30 transition-all">
                      <div className="space-y-2 flex-1">
                        <div className="flex gap-2 flex-wrap items-center">
                          {/* Selected platforms */}
                          {post.platforms && post.platforms.map((plat) => (
                            <span key={plat} className="text-sm bg-dark-700 p-1.5 rounded-lg border border-dark-600" title={plat}>
                              {platformDetails[plat]?.icon || <FiSend />}
                            </span>
                          ))}
                          {(!post.platforms || post.platforms.length === 0) && (
                            <span className="text-xs bg-dark-700 px-2.5 py-1 rounded-lg border border-dark-600 text-blue-400 font-semibold flex items-center gap-1">
                              <FiSend size={12} /> Telegram
                            </span>
                          )}
                          <span className="text-xs text-gray-400 flex items-center gap-1 ml-2">
                            <FiClock size={12} /> {new Date(post.scheduledTime).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{post.content}</p>
                        {post.imageUrl && (
                          <div className="max-w-xs rounded overflow-hidden border border-dark-650 mt-2">
                            <img src={post.imageUrl} alt="Scheduled Attachment" className="max-h-24 w-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors border border-red-500/20"
                          title="Delete Schedule"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Published Queue */}
            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-750">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                  <FiCheckCircle className="text-green-500" /> Published Posts ({publishedPosts.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading posts...</div>
              ) : publishedPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No published posts yet.
                </div>
              ) : (
                <div className="divide-y divide-dark-700 max-h-[500px] overflow-y-auto">
                  {publishedPosts.map((post) => (
                    <div key={post._id} className="p-5 flex flex-col md:flex-row justify-between gap-4 hover:bg-dark-750/10">
                      <div className="space-y-2 flex-1">
                        <div className="flex gap-2 flex-wrap items-center">
                          {post.platforms && post.platforms.map((plat) => (
                            <span key={plat} className="text-sm bg-dark-700 p-1.5 rounded-lg border border-dark-600">
                              {platformDetails[plat]?.icon || <FiSend />}
                            </span>
                          ))}
                          {(!post.platforms || post.platforms.length === 0) && (
                            <span className="text-xs bg-dark-700 px-2.5 py-1 rounded-lg border border-dark-600 text-blue-400 font-semibold">
                              Telegram
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center gap-1 ml-2">
                            <FiCheckCircle size={12} /> {new Date(post.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{post.content}</p>
                        {post.imageUrl && (
                          <div className="max-w-xs rounded overflow-hidden border border-dark-700 mt-2 opacity-80">
                            <img src={post.imageUrl} alt="Published Attachment" className="max-h-24 w-full object-cover" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full capitalize font-semibold bg-green-500/10 text-green-400 border border-green-500/20 self-start md:self-center">
                        Published
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default Scheduler;
