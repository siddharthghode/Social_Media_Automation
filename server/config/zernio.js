const { Zernio } = require('@zernio/node');

const apiKey = process.env.ZIO_API_KEY || process.env.ZERNIO_API_KEY || '';
const hasRealKey = apiKey.length > 10 && !apiKey.startsWith('your_') && !apiKey.includes('placeholder') && apiKey !== 'mock_key';

let zernioInstance;

if (hasRealKey) {
  try {
    zernioInstance = new Zernio({ apiKey });
    console.log('[Zernio] Initialized real Zernio client');
  } catch (err) {
    console.error('[Zernio] Failed to initialize real client, using mock wrapper:', err.message);
  }
}

if (!zernioInstance) {
  console.log('[Zernio] Using mock Zernio client wrapper');
  zernioInstance = {
    profiles: {
      listProfiles: async () => {
        return { data: { profiles: [{ id: 'mock_profile_123', name: 'Mock Profile' }] } };
      },
      createProfile: async (data) => {
        return { data: { profile: { id: 'mock_profile_123', name: data.name || 'Mock Profile' } } };
      }
    },
    connect: {
      getConnectUrl: async ({ platform, query }) => {
        const redirect = query.redirectUrl || 'http://localhost:5173/accounts';
        // Mock connection endpoint that will simulate successful link
        const url = `http://localhost:5000/api/social/auth/callback/mock?platform=${platform}&profileId=${query.profileId}&redirectUrl=${encodeURIComponent(redirect)}`;
        return { data: { url } };
      }
    },
    accounts: {
      listAccounts: async ({ profileId }) => {
        return { data: { accounts: [] } };
      }
    },
    posts: {
      createPost: async (data) => {
        console.log('[Mock Zernio] Creating post:', data);
        return { data: { id: 'mock_post_' + Math.random().toString(36).substr(2, 9) } };
      }
    }
  };
}

module.exports = zernioInstance;
