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
  FiPlus,
  FiTrash2,
  FiLink,
  FiCheckCircle,
  FiX,
  FiAlertCircle
} from 'react-icons/fi';

const platformDetails = {
  telegram: { name: 'Telegram', icon: <BsTelegram className="text-sky-400" />, desc: 'Publish directly to Telegram channel' },
  instagram: { name: 'Instagram', icon: <FiInstagram className="text-pink-500" />, desc: 'Share photos and videos visually' },
  linkedin: { name: 'LinkedIn', icon: <FiLinkedin className="text-blue-500" />, desc: 'Connect with professionals & business' },
  twitter: { name: 'X / Twitter', icon: <FiTwitter className="text-gray-200" />, desc: 'Broadcast short updates' },
  facebook: { name: 'Facebook', icon: <FiFacebook className="text-blue-600" />, desc: 'Reach a broad local audience' },
  pinterest: { name: 'Pinterest', icon: <BsPinterest className="text-red-500" />, desc: 'Inspire with visual pins & boards' },
};

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  // Telegram Custom Connection
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChannelId, setTelegramChannelId] = useState('');
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [showTelegramForm, setShowTelegramForm] = useState(false);

  const handleLinkTelegram = async (e) => {
    e.preventDefault();
    if (!telegramBotToken.trim() || !telegramChannelId.trim()) {
      toast.error('Both Bot Token and Channel ID are required');
      return;
    }
    setLinkingTelegram(true);
    try {
      await api.post('/social/accounts/telegram/connect', {
        botToken: telegramBotToken.trim(),
        channelId: telegramChannelId.trim(),
      });
      toast.success('Telegram channel connected successfully!');
      setShowTelegramForm(false);
      setTelegramBotToken('');
      setTelegramChannelId('');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to connect Telegram channel');
    } finally {
      setLinkingTelegram(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/social/accounts');
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      toast.error('Could not load connected accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (platform) => {
    if (platform === 'telegram') {
      setShowTelegramForm(true);
      setShowModal(false);
      return;
    }
    setConnectingPlatform(platform);
    try {
      const { data } = await api.get(`/social/auth/url/${platform}`);
      if (data.url) {
        toast.loading(`Redirecting to connect ${platformDetails[platform].name}...`, { duration: 1500 });
        setTimeout(() => {
          window.location.href = data.url;
        }, 1000);
      } else {
        throw new Error('Failed to generate connection URL');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to initiate connection');
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!window.confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await api.delete(`/social/accounts/${accountId}`);
      toast.success('Account disconnected successfully');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to disconnect account');
    }
  };

  // Sync with TeleSync
  const handleSync = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/social/accounts/sync');
      toast.success('Synced with TeleSync!');
      setAccounts(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync accounts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Social Accounts" />
        <main className="flex-1 p-6 space-y-6">
          
          {/* Header section with Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div>
              <h2 className="text-xl font-bold text-white">Connected Accounts</h2>
              <p className="text-sm text-gray-400 mt-1">
                {accounts.length} out of {Object.keys(platformDetails).length} platforms linked.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                className="bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg border border-dark-600 transition-colors"
              >
                Sync Status
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                <FiPlus size={16} /> Link New Account
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((n) => (
                <div key={n} className="bg-dark-800 border border-dark-700 rounded-xl p-5 h-44 animate-pulse"></div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-8 text-center text-gray-400 flex flex-col items-center justify-center min-h-[300px]">
              <FiLink className="text-4xl text-gray-600 mb-3 animate-bounce" />
              <p className="text-lg font-semibold text-white">No accounts linked yet</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Connect your social media profiles using TeleSync to start automating your posting schedules.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Connect Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((acc) => {
                const info = platformDetails[acc.platform] || { name: acc.platform, icon: <FiLink />, desc: '' };
                return (
                  <div key={acc._id} className="bg-dark-800 border border-dark-700 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/50 transition-all hover:scale-[1.01]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-dark-700 border border-dark-600 rounded-lg flex items-center justify-center text-2xl">
                          {info.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{info.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">@{acc.handle}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 font-medium">
                        <FiCheckCircle size={12} /> Connected
                      </span>
                    </div>

                    <div className="mt-6 pt-4 border-t border-dark-750 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {acc.avatarUrl ? (
                          <img src={acc.avatarUrl} alt={acc.handle} className="w-6 h-6 rounded-full border border-dark-600" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-[10px] text-gray-400 border border-dark-600">
                            {acc.handle[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-400">Linked to profile</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(acc._id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                        title="Disconnect Account"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Platform Picker Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-dark-800 border border-dark-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-dark-700">
                  <h3 className="text-lg font-semibold text-white">Choose a Platform</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                    <FiX size={20} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {Object.entries(platformDetails).map(([key, details]) => {
                    const isConnected = accounts.some((a) => a.platform === key);
                    const isConnecting = connectingPlatform === key;

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                          isConnected
                            ? 'bg-dark-750/30 border-dark-700/50 opacity-60'
                            : 'bg-dark-750/50 border-dark-700 hover:border-blue-500/50 hover:bg-dark-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-3xl bg-dark-850 p-2 rounded-lg border border-dark-700">
                            {details.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">{details.name}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{details.desc}</p>
                          </div>
                        </div>
                        {isConnected ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <FiCheckCircle /> Linked
                          </span>
                        ) : (
                          <button
                            disabled={isConnecting}
                            onClick={() => handleConnect(key)}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {isConnecting ? 'Linking...' : 'Connect'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-dark-850 px-5 py-4 border-t border-dark-700 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Telegram Connection Form Modal */}
          {showTelegramForm && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-dark-800 border border-dark-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-dark-700">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BsTelegram className="text-sky-400" /> Link Telegram Bot & Channel
                  </h3>
                  <button onClick={() => setShowTelegramForm(false)} className="text-gray-400 hover:text-white transition-colors">
                    <FiX size={20} />
                  </button>
                </div>

                <form onSubmit={handleLinkTelegram}>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-gray-400">
                      To publish posts automatically, your bot must be added as an <strong>Administrator</strong> in your target channel.
                    </p>

                    {/* Bot Token Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Telegram Bot Token
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                        required
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Obtain this from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a> on Telegram.
                      </p>
                    </div>

                    {/* Channel ID Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Channel ID or Username
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. @mychannel or -100123456789"
                        value={telegramChannelId}
                        onChange={(e) => setTelegramChannelId(e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                        required
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Public channels use usernames (e.g. <code>@mychannel</code>). Private channels use numeric IDs (e.g. <code>-100xxxxxx</code>).
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-850 px-5 py-4 border-t border-dark-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowTelegramForm(false)}
                      className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={linkingTelegram}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {linkingTelegram ? 'Connecting...' : 'Link Channel'}
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

export default Accounts;
