const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// ── Google OAuth ──────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Link provider if registered via local
      if (user.authProvider === 'local') {
        user.authProvider = 'google';
        user.providerId = profile.id;
        user.isVerified = true;
        await user.save();
      }
      return done(null, user);
    }

    user = await User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos?.[0]?.value || null,
      authProvider: 'google',
      providerId: profile.id,
      isVerified: true,
    });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// ── GitHub OAuth ──────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: '/api/auth/github/callback',
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    let user = await User.findOne({ email });

    if (user) {
      if (user.authProvider === 'local') {
        user.authProvider = 'github';
        user.providerId = profile.id;
        user.isVerified = true;
        await user.save();
      }
      return done(null, user);
    }

    user = await User.create({
      name: profile.displayName || profile.username,
      email,
      avatar: profile.photos?.[0]?.value || null,
      authProvider: 'github',
      providerId: String(profile.id),
      isVerified: true,
    });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// ── Facebook OAuth ───────────────────────────────────────────
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails', 'photos'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
    let user = await User.findOne({ email });
    if (user) {
      if (user.authProvider === 'local') {
        user.authProvider = 'facebook';
        user.providerId = profile.id;
        user.isVerified = true;
        await user.save();
      }
      return done(null, { user, accessToken, fbUserId: profile.id, fbName: profile.displayName });
    }
    user = await User.create({
      name: profile.displayName,
      email,
      avatar: profile.photos?.[0]?.value || null,
      authProvider: 'facebook',
      providerId: profile.id,
      isVerified: true,
    });
    done(null, { user, accessToken, fbUserId: profile.id, fbName: profile.displayName });
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((data, done) => {
  // data can be a user object (google/github) or { user, accessToken } (facebook)
  const user = data.user || data;
  done(null, { id: user._id, accessToken: data.accessToken, fbUserId: data.fbUserId, fbName: data.fbName });
});
passport.deserializeUser(async ({ id }, done) => {
  const user = await User.findById(id).select('-password');
  done(null, user);
});

module.exports = passport;
