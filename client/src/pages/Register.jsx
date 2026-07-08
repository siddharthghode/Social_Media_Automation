import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSend, FiUser, FiMail, FiLock } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FiGithub } from 'react-icons/fi';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || '/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('OTP sent to your email!');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <FiSend className="text-white text-2xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-1">Start automating with TeleSync</p>
        </div>

        <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <a
              href={`${apiBase}/auth/google`}
              className="flex items-center justify-center gap-3 w-full border border-dark-600 hover:border-dark-500 hover:bg-dark-700 text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
            >
              <FcGoogle size={20} /> Continue with Google
            </a>
            <a
              href={`${apiBase}/auth/github`}
              className="flex items-center justify-center gap-3 w-full border border-dark-600 hover:border-dark-500 hover:bg-dark-700 text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
            >
              <FiGithub size={18} /> Continue with GitHub
            </a>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-dark-600" />
            <span className="text-xs text-gray-500">or register with email</span>
            <div className="flex-1 h-px bg-dark-600" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', icon: <FiUser />, placeholder: 'John Doe' },
              { key: 'email', label: 'Email', type: 'email', icon: <FiMail />, placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', icon: <FiLock />, placeholder: '••••••••' },
            ].map(({ key, label, type, icon, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
