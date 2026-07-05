import { useAuth } from '../context/AuthContext';
import { FiBell } from 'react-icons/fi';

const Navbar = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white transition-colors">
          <FiBell size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-gray-300 hidden sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
