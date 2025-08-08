import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editName, setEditName] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [gameHistory, setGameHistory] = useState([]);

  const handleLogin = () => {
    // Simple password check (in production, use proper authentication)
    if (adminPassword === 'admin123') {
      setIsLoggedIn(true);
      fetchUsers();
      fetchGameHistory();
    } else {
      alert('Invalid password');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://telegram-bot-2-rffp.onrender.com/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const response = await fetch('https://telegram-bot-2-rffp.onrender.com/api/admin/game-history');
      const data = await response.json();
      setGameHistory(data);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  const updateUser = async (userId) => {
    try {
      await fetch(`https://telegram-bot-2-rffp.onrender.com/api/admin/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: parseFloat(editBalance),
          name: editName
        })
      });
      setSelectedUser(null);
      fetchUsers();
      alert('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const banUser = async (userId) => {
    try {
      await fetch(`https://telegram-bot-2-rffp.onrender.com/api/admin/ban/${userId}`, {
        method: 'POST'
      });
      fetchUsers();
      alert('User banned');
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const sendAnnouncement = async () => {
    try {
      await fetch('https://telegram-bot-2-rffp.onrender.com/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announcement })
      });
      setAnnouncement('');
      alert('Announcement sent');
    } catch (error) {
      console.error('Failed to send announcement:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">🔐 Admin Login</h1>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
            >
              Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">🎛️ Admin Dashboard</h1>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">👥 Users Management</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-gray-600">ID: {user.telegramId}</p>
                      <p className="text-sm">Balance: {user.balance} | Bonus: {user.bonus}</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setEditBalance(user.balance.toString());
                          setEditName(user.name);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => banUser(user._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">📢 Global Announcements</h2>
            <div className="space-y-4">
              <textarea
                placeholder="Type your announcement here..."
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none h-32"
              />
              <button
                onClick={sendAnnouncement}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold"
              >
                Send Announcement
              </button>
            </div>
          </div>

          {/* Game History */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">🎮 Game & Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Game</th>
                    <th className="text-left p-2">Result</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((entry, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{entry.userName}</td>
                      <td className="p-2">{entry.game}</td>
                      <td className="p-2">{entry.result}</td>
                      <td className="p-2">{entry.amount}</td>
                      <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit User Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-xl font-bold mb-4">Edit User: {selectedUser.name}</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Balance"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => updateUser(selectedUser._id)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
