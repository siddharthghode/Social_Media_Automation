const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
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

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id).select('-password');
  done(null, user);
});

module.exports = passport;
