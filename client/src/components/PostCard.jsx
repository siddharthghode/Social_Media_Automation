import { FiTrash2, FiEdit2, FiImage } from 'react-icons/fi';

const statusStyles = {
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  posted: 'bg-green-500/20 text-green-400 border border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const PostCard = ({ post, onDelete }) => {
  const scheduledDate = new Date(post.scheduledTime).toLocaleString();

  return (
    <tr className="border-b border-dark-700 hover:bg-dark-700/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          {post.imageUrl && <FiImage className="text-blue-400 mt-1 shrink-0" />}
          <p className="text-sm text-gray-300 line-clamp-2 max-w-xs">{post.content}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{scheduledDate}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[post.status]}`}>
          {post.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(post._id)}
          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10"
        >
          <FiTrash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export default PostCard;
