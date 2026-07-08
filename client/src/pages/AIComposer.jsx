import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BsPinterest, BsTelegram } from 'react-icons/bs';
import {
  FiZap,
  FiInstagram,
  FiLinkedin,
  FiTwitter,
  FiFacebook,
  FiImage,
  FiCalendar,
  FiClock,
  FiPlus,
  FiX,
  FiCpu,
  FiSend,
  FiActivity
} from 'react-icons/fi';

const platformDetails = {
  telegram: { name: 'Telegram', icon: <BsTelegram className="text-sky-400" /> },
  instagram: { name: 'Instagram', icon: <FiInstagram className="text-pink-500" /> },
  linkedin: { name: 'LinkedIn', icon: <FiLinkedin className="text-blue-500" /> },
  twitter: { name: 'X / Twitter', icon: <FiTwitter className="text-gray-200" /> },
  facebook: { name: 'Facebook', icon: <FiFacebook className="text-blue-600" /> },
  pinterest: { name: 'Pinterest', icon: <BsPinterest className="text-red-500" /> },
};

const tones = ['Professional', 'Creative', 'Funny', 'Minimalist', 'Excited'];

const AIComposer = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generateImage, setGenerateImage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generations, setGenerations] = useState([]);
  
  // Scheduling Modal
  const [activeGeneration, setActiveGeneration] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Fetch connected accounts to enable selectors in modal
  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/social/accounts');
      setConnectedAccounts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // Load generations from local storage if available
    const saved = localStorage.getItem('ai_generations');
    if (saved) {
      setGenerations(JSON.parse(saved));
    }
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-post', {
        prompt,
        tone: selectedTone.toLowerCase(),
        generateImage,
      });

      const newGen = {
        id: 'gen_' + Date.now(),
        prompt,
        content: data.caption,
        imageUrl: data.mediaUrl,
        tone: selectedTone,
        createdAt: new Date().toISOString(),
      };

      const updated = [newGen, ...generations];
      setGenerations(updated);
      localStorage.setItem('ai_generations', JSON.stringify(updated));
      toast.success('AI content generated successfully!');
      setPrompt('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'AI generation failed. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScheduleModal = (gen) => {
    setActiveGeneration(gen);
    setSelectedPlatforms([]);
    setScheduledTime('');
  };

  const handleSchedulePost = async (e) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    if (!scheduledTime) {
      toast.error('Select a date and time');
      return;
    }
    if (new Date(scheduledTime) <= new Date()) {
      toast.error('Schedule time must be in the future');
      return;
    }

    setScheduleLoading(true);
    try {
      await api.post('/posts/create', {
        content: activeGeneration.content,
        imageUrl: activeGeneration.imageUrl || null,
        scheduledTime: new Date(scheduledTime).toISOString(),
        platforms: selectedPlatforms,
      });
      toast.success('Generated post scheduled successfully!');
      setActiveGeneration(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule post');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteGeneration = (id) => {
    const updated = generations.filter((g) => g.id !== id);
    setGenerations(updated);
    localStorage.setItem('ai_generations', JSON.stringify(updated));
  };

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="AI Composer" />
        <main className="flex-1 p-6 space-y-6">
          
          {/* Main generator card */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 max-w-3xl mx-auto space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FiCpu className="text-blue-500 animate-pulse" /> What should we create today?
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Create an announcement about launching our new Next.js 15 course with dynamic features..."
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                required
              />

              {/* Tone Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Tone of Voice
                </label>
                <div className="flex gap-2 flex-wrap">
                  {tones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setSelectedTone(tone)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        selectedTone === tone
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                          : 'bg-dark-700 border-dark-600 text-gray-400 hover:border-dark-500 hover:text-white'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Toggle & Generate button row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-dark-750">
                <button
                  type="button"
                  onClick={() => setGenerateImage(!generateImage)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    generateImage
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-dark-700 border-dark-600 text-gray-400'
                  }`}
                >
                  <FiImage size={14} />
                  {generateImage ? 'AI Image: ON' : 'AI Image: OFF'}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/10"
                >
                  <FiZap size={14} />
                  {loading ? 'Generating Content...' : 'Generate Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent generations list */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h3 className="font-bold text-gray-400 flex items-center gap-2 text-sm uppercase tracking-wider">
              <FiActivity /> Recent Generations ({generations.length})
            </h3>

            {generations.length === 0 ? (
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-8 text-center text-gray-500 text-sm">
                No recent generations yet. Describe your ideas above to generate.
              </div>
            ) : (
              <div className="space-y-4">
                {generations.map((gen) => (
                  <div key={gen.id} className="bg-dark-800 border border-dark-700 rounded-xl p-5 space-y-4 hover:border-dark-600 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center text-xs text-gray-400">
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                          {gen.tone}
                        </span>
                        <span>{new Date(gen.createdAt).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteGeneration(gen.id)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 font-medium italic">Prompt: "{gen.prompt}"</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{gen.content}</p>
                      
                      {gen.imageUrl && (
                        <div className="max-w-md rounded-lg overflow-hidden border border-dark-650 max-h-48">
                          <img src={gen.imageUrl} alt="AI Generated Attachment" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-dark-750 flex justify-end">
                      <button
                        onClick={() => handleOpenScheduleModal(gen)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        <FiCalendar size={14} /> Schedule Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Post Modal */}
          {activeGeneration && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-dark-800 border border-dark-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-dark-700">
                  <h3 className="text-lg font-semibold text-white">Schedule Generated Post</h3>
                  <button onClick={() => setActiveGeneration(null)} className="text-gray-400 hover:text-white transition-colors">
                    <FiX size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleSchedulePost} className="p-5 space-y-4">
                  
                  {/* Selected Channels */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Channels
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(platformDetails).map((key) => {
                        const details = platformDetails[key];
                        const isConnected = connectedAccounts.some((a) => a.platform === key);
                        const isSelected = selectedPlatforms.includes(key);

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (!isConnected && key !== 'telegram') {
                                toast.error(`Connect ${details.name} first`);
                                return;
                              }
                              if (isSelected) {
                                setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
                              } else {
                                setSelectedPlatforms([...selectedPlatforms, key]);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                : isConnected || key === 'telegram'
                                ? 'bg-dark-700/50 border-dark-600 text-gray-300 hover:border-dark-500'
                                : 'bg-dark-800 border-dark-700 text-gray-500 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <span>{details.icon}</span>
                            {details.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scheduled Time */}
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

                  {/* Preview section */}
                  <div className="p-4 bg-dark-850 rounded-lg border border-dark-750 max-h-40 overflow-y-auto">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Post Preview</p>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap">{activeGeneration.content}</p>
                    {activeGeneration.imageUrl && (
                      <div className="mt-2 rounded overflow-hidden border border-dark-700 max-h-20 w-32">
                        <img src={activeGeneration.imageUrl} alt="preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                  </div>

                  <div className="bg-dark-850 -mx-5 -mb-5 px-5 py-4 border-t border-dark-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveGeneration(null)}
                      className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={scheduleLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <FiClock size={14} />
                      {scheduleLoading ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AIComposer;
