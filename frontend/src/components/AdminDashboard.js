import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AdminDashboard = () => {
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
  const [overallStats, setOverallStats] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [adminToken, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      };

      // Fetch overall statistics
      const overallResponse = await fetch(`${API_BASE}/admin/stats/overall`, { headers });
      if (!overallResponse.ok) throw new Error('Failed to fetch overall stats');
      const overallData = await overallResponse.json();
      setOverallStats(overallData);

      // Fetch per-user statistics
      const userResponse = await fetch(`${API_BASE}/admin/stats/per-user`, { headers });
      if (!userResponse.ok) throw new Error('Failed to fetch user stats');
      const userData = await userResponse.json();
      setUserStats(userData.users);

      // Fetch all reviews
      const reviewsResponse = await fetch(`${API_BASE}/admin/reviews/all?page=${currentPage}`, { headers });
      if (!reviewsResponse.ok) throw new Error('Failed to fetch reviews');
      const reviewsData = await reviewsResponse.json();
      setAllReviews(reviewsData);

    } catch (err) {
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewDetail = async (reviewId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch review detail');
      const reviewDetail = await response.json();
      setSelectedReview(reviewDetail);
    } catch (err) {
      setError('Failed to load review details');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdmin');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#343541] flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#343541] flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  // Prepare pie chart data for accepted vs rejected
  const pieChartData = {
    labels: ['Accepted', 'Rejected', 'Pending'],
    datasets: [{
      data: [
        overallStats?.accepted_reviews || 0,
        overallStats?.rejected_reviews || 0,
        (overallStats?.total_reviews || 0) - (overallStats?.accepted_reviews || 0) - (overallStats?.rejected_reviews || 0)
      ],
      backgroundColor: [
        '#10B981', // Green for accepted
        '#EF4444', // Red for rejected  
        '#6B7280', // Gray for pending
      ],
      hoverBackgroundColor: [
        '#059669',
        '#DC2626',
        '#4B5563',
      ]
    }]
  };

  // Prepare bar chart data for rejection reasons
  const rejectionReasons = overallStats?.rejection_reasons || {};
  const barChartData = {
    labels: Object.keys(rejectionReasons).slice(0, 10), // Top 10 reasons
    datasets: [{
      label: 'Count',
      data: Object.values(rejectionReasons).slice(0, 10),
      backgroundColor: '#EF4444',
      borderColor: '#DC2626',
      borderWidth: 1
    }]
  };

  return (
    <div className="min-h-screen bg-[#343541]">
      {/* Header */}
      <div className="bg-[#1a1a1a] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">🔧</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                ← Back to Main App
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Reviews</p>
                <p className="text-2xl font-semibold text-white">{overallStats?.total_reviews || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <span className="text-white text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Acceptance Rate</p>
                <p className="text-2xl font-semibold text-white">{overallStats?.acceptance_rate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg">
                <span className="text-white text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold text-white">{overallStats?.total_users || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500 rounded-lg">
                <span className="text-white text-2xl">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Recent Activity</p>
                <p className="text-2xl font-semibold text-white">{overallStats?.recent_activity || 0}</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart - Review Status */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Review Status Distribution</h3>
            <div className="h-64">
              <Pie 
                data={pieChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: 'white'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Bar Chart - Top Rejection Reasons */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Top Rejection Reasons</h3>
            <div className="h-64">
              <Bar 
                data={barChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: 'white',
                        maxRotation: 45
                      },
                      grid: {
                        color: '#374151'
                      }
                    },
                    y: {
                      ticks: {
                        color: 'white'
                      },
                      grid: {
                        color: '#374151'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Per-User Statistics Table */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Per-User Statistics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Reviews</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Accepted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rejected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acceptance Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {userStats.map((user, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.total_reviews}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{user.accepted_reviews}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">{user.rejected_reviews}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.acceptance_rate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Reviews Table */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Individual Reviews</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {allReviews?.reviews?.map((review) => (
                  <tr key={review.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">#{review.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{review.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{review.language || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        review.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        review.feedback === 'positive' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.status === 'rejected' ? 'Rejected' : 
                         review.feedback === 'positive' ? 'Accepted' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{review.rating || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchReviewDetail(review.id)}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Review Details - #{selectedReview.id}</h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400">User:</p>
                    <p className="text-white font-medium">{selectedReview.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Language:</p>
                    <p className="text-white font-medium">{selectedReview.language || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status:</p>
                    <p className="text-white font-medium">{selectedReview.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Rating:</p>
                    <p className="text-white font-medium">{selectedReview.rating || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 mb-2">Original Code:</p>
                  <pre className="bg-[#40414f] p-4 rounded text-white text-sm overflow-x-auto">
                    {selectedReview.code}
                  </pre>
                </div>

                <div>
                  <p className="text-gray-400 mb-2">AI Review:</p>
                  <div className="bg-[#40414f] p-4 rounded text-white text-sm">
                    {selectedReview.review}
                  </div>
                </div>

                {selectedReview.rejection_reasons.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-2">Rejection Reasons:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.rejection_reasons.map((reason, index) => (
                        <span key={index} className="bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReview.custom_rejection_reason && (
                  <div>
                    <p className="text-gray-400 mb-2">Custom Rejection Reason:</p>
                    <div className="bg-[#40414f] p-4 rounded text-white text-sm">
                      {selectedReview.custom_rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
