import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { FiSend, FiZap, FiImage } from 'react-icons/fi';

const CreatePost = () => {
  const [form, setForm] = useState({ content: '', imageUrl: '', scheduledTime: '' });
  const [topic, setTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const navigate = useNavigate();

  const generateCaption = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/generate-caption', { topic });
      setForm((prev) => ({ ...prev, content: data.caption }));
      toast.success('AI caption generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) { toast.error('Content is required'); return; }
    if (!form.scheduledTime) { toast.error('Schedule time is required'); return; }
    if (new Date(form.scheduledTime) <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post('/posts/create', {
        content: form.content,
        imageUrl: form.imageUrl || null,
        scheduledTime: form.scheduledTime,
      });
      toast.success('Post scheduled successfully!');
      navigate('/posts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule post');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Get minimum datetime for the picker (now)
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Create Post" />
        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* AI Caption Generator */}
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                <FiZap className="text-yellow-400" /> AI Caption Generator
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter topic (e.g. product launch, fitness tips...)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && generateCaption()}
                />
                <button
                  onClick={generateCaption}
                  disabled={aiLoading}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-medium px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
                >
                  <FiZap size={14} />
                  {aiLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Post Form */}
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Post Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Post Content
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Write your Telegram post content here..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{form.content.length} characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <FiImage className="inline mr-1" /> Image URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                {/* Image Preview */}
                {form.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-dark-600">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Schedule Time
                  </label>
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                  >
                    <FiSend size={16} />
                    {submitLoading ? 'Scheduling...' : 'Schedule Post'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ content: '', imageUrl: '', scheduledTime: '' })}
                    className="px-6 py-2.5 border border-dark-600 text-gray-400 hover:text-white hover:border-dark-500 rounded-lg transition-colors text-sm"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreatePost;
