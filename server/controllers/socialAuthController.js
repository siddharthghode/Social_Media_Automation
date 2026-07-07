const User = require('../models/User');
const Account = require('../models/Account');
const zernio = require('../config/zernio');

const getOrCreateZeroProfile = async (user) => {
  try {
    if (user.zeroProfileId) return user.zeroProfileId;
    if (user.zernioProfileId) return user.zernioProfileId;

    const result = await zernio.profiles.listProfiles();
    const data = result.data || {};
    const profiles = data.profiles || [];

    if (profiles.length > 0) {
      const pId = profiles[0].id || profiles[0]._id;
      await User.findByIdAndUpdate(user._id, { zeroProfileId: pId, zernioProfileId: pId });
      return pId;
    }

    const createResult = await zernio.profiles.createProfile({
      name: user.name || user.email,
    });
    const created = createResult.data?.profile || createResult.data || {};
    const pId = created.id || created._id;

    if (!pId) {
      throw new Error('Failed to create Zernio profile: no ID returned');
    }

    await User.findByIdAndUpdate(user._id, { zeroProfileId: pId, zernioProfileId: pId });
    return pId;
  } catch (err) {
    console.error('getOrCreateZeroProfile error:', err.message);
    throw err;
  }
};

const generateOUrl = async (req, res) => {
  try {
    const { platform } = req.params;
    const profileId = await getOrCreateZeroProfile(req.user);

    const origin = req.headers.origin || 'http://localhost:5173';
    const redirectUrl = `${origin}/accounts`;

    const result = await zernio.connect.getConnectUrl({
      platform,
      query: {
        profileId,
        redirectUrl,
      },
    });

    const data = result.data || {};
    console.log('getConnectUrl response:', JSON.stringify(data));
    const url = data.url;

    if (!url) {
      throw new Error('Zernio returned no auth URL: ' + JSON.stringify(data));
    }

    res.json({ url });
  } catch (err) {
    console.error('generateOUrl error:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const syncAccounts = async (req, res) => {
  try {
    const profileId = await getOrCreateZeroProfile(req.user);

    const result = await zernio.accounts.listAccounts({
      profileId,
    });

    const data = result.data || {};
    const zAccounts = data.accounts || [];

    const supportedPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'pinterest'];
    const syncedAccounts = [];

    for (const zAccount of zAccounts) {
      const zId = zAccount._id || zAccount.id;
      if (!zId) {
        console.log('Skipping account with no ID', zAccount);
        continue;
      }

      const rawPlatform = (zAccount.platform || zAccount.type || '').toLowerCase();
      const normalizedPlatform = supportedPlatforms.find(p => rawPlatform.includes(p));

      if (!normalizedPlatform) {
        console.log(`Skipping unsupported platform: ${rawPlatform}`);
        continue;
      }

      const account = await Account.findOneAndUpdate(
        { userId: req.user._id, platform: normalizedPlatform },
        {
          userId: req.user._id,
          platform: normalizedPlatform,
          handle: zAccount.username || zAccount.displayName || zAccount.name || zAccount.handle || 'unknown',
          zeroAccountId: zId,
          status: 'connected',
          avatarUrl: zAccount.profilePicture || zAccount.avatarUrl || zAccount.picture || null,
        },
        { upsert: true, new: true }
      );
      syncedAccounts.push(account);
    }

    res.json(syncedAccounts);
  } catch (err) {
    console.error('syncAccounts error:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getConnectedAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id, status: 'connected' });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const disconnectAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    account.status = 'disconnected';
    await account.save();
    res.json({ message: 'Account disconnected successfully', account });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const mockCallback = async (req, res) => {
  try {
    const { platform, profileId, redirectUrl } = req.query;
    const user = await User.findOne({ $or: [{ zeroProfileId: profileId }, { zernioProfileId: profileId }] });
    if (!user) {
      return res.status(404).send('User profile not found for mock connection');
    }

    const mockId = 'mock_acc_' + Math.random().toString(36).substr(2, 9);
    
    await Account.findOneAndUpdate(
      { userId: user._id, platform },
      {
        userId: user._id,
        platform,
        handle: `${platform}_user_mock`,
        zeroAccountId: mockId,
        status: 'connected',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${platform}`,
      },
      { upsert: true, new: true }
    );

    res.redirect(redirectUrl || 'http://localhost:5173/accounts');
  } catch (err) {
    console.error('mockCallback error:', err.message);
    res.status(500).send('Mock callback error: ' + err.message);
  }
};

module.exports = {
  generateOUrl,
  syncAccounts,
  getConnectedAccounts,
  disconnectAccount,
  mockCallback,
};
