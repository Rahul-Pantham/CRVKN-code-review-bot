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
  const [allReviews, setAllReviews] = useState({ reviews: [], total: 0 });
  const [selectedReview, setSelectedReview] = useState(null);
  const [sectionFeedbackStats, setSectionFeedbackStats] = useState(null);
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
      console.log('User stats data:', userData);
      setUserStats(userData.users || []);

      // Fetch all reviews
      const reviewsResponse = await fetch(`${API_BASE}/admin/reviews/all?page=${currentPage}`, { headers });
      if (!reviewsResponse.ok) throw new Error('Failed to fetch reviews');
      const reviewsData = await reviewsResponse.json();
      console.log('Reviews data:', reviewsData);
      setAllReviews(reviewsData);

      // Fetch section feedback analytics
      try {
        const sectionResponse = await fetch(`${API_BASE}/admin/analytics/section-feedback`, { headers });
        if (sectionResponse.ok) {
          const sectionData = await sectionResponse.json();
          setSectionFeedbackStats(sectionData);
        }
      } catch (sectionErr) {
        console.warn('Section feedback analytics not available:', sectionErr.message);
        // Don't fail the entire dashboard if section analytics fails
      }

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

  // Component to format the AI Review content by parsing the ###HEADINGS###
  const FormattedAIReview = ({ reviewText }) => {
    if (!reviewText) {
        return <p className="text-gray-500">No AI review content available.</p>;
    }

    const parseReview = (text) => {
        const sections = [];
        // Regex to match a section header (e.g., ###CODE_QUALITY###) and its content
        // Content is non-greedily matched until the next header or the end of the string.
        const regex = /(###([A-Z_]+)###)([^#]*)/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const sectionName = match[2];
            let content = match[3].trim();

            // Create a human-readable title (e.g., CODE_QUALITY -> Code Quality)
            const displayTitle = sectionName.replace(/_/g, ' ').toLowerCase().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Replace markdown bolding (**...**) with HTML strong tags for styling
            // This is safer than relying on CSS only for the bolding
            const htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            sections.push({
                title: displayTitle,
                htmlContent: htmlContent
            });
        }
        return sections;
    };

    const sections = parseReview(reviewText);

    if (sections.length === 0) {
        // Fallback: If no section markers are found, treat the whole thing as a single block
        const fallbackContent = reviewText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return (
            <div className="text-white whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: fallbackContent }} />
        );
    }

    return (
        <div className="space-y-4">
            {sections.map((section, index) => (
                <div key={index}>
                    {/* Use a clear, prominent heading for the section */}
                    <h4 className="text-lg font-bold text-blue-400 border-b border-gray-600 pb-1 mb-2">
                        {section.title}
                    </h4>
                    {/* Apply 'pre-wrap' to respect existing line breaks in the LLM output 
                        and render the bolded content using dangerouslySetInnerHTML */}
                    <div
                        className="text-white text-sm"
                        style={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: section.htmlContent }}
                    />
                </div>
            ))}
        </div>
    );
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
        <div className="flex justify-center mb-8">
          {/* Pie Chart - Review Status */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-full max-w-md">
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
        </div>

        {/* Section Feedback Analytics */}
        {sectionFeedbackStats && sectionFeedbackStats.chart_data && (
          <div className="bg-[#1a1a1a] rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Section-Level Feedback Analytics</h3>
              <div className="text-sm text-gray-400">
                Total Records: {sectionFeedbackStats.summary?.total_feedback_records || 0} | 
                Recent (30d): {sectionFeedbackStats.summary?.recent_feedback_count || 0}
              </div>
            </div>
            <div className="h-80">
              <Bar 
                data={{
                  labels: sectionFeedbackStats.chart_data.map(item => item.section),
                  datasets: [
                    {
                      label: 'Accepted',
                      data: sectionFeedbackStats.chart_data.map(item => item.accepted),
                      backgroundColor: '#10B981',
                      borderColor: '#059669',
                      borderWidth: 1
                    },
                    {
                      label: 'Rejected',
                      data: sectionFeedbackStats.chart_data.map(item => item.rejected),
                      backgroundColor: '#EF4444',
                      borderColor: '#DC2626',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: 'white'
                      }
                    },
                    tooltip: {
                      callbacks: {
                        afterLabel: function(context) {
                          const dataIndex = context.dataIndex;
                          const sectionData = sectionFeedbackStats.chart_data[dataIndex];
                          const total = sectionData.accepted + sectionData.rejected;
                          if (total > 0) {
                            const percentage = context.dataset.label === 'Accepted' 
                              ? ((sectionData.accepted / total) * 100).toFixed(1)
                              : ((sectionData.rejected / total) * 100).toFixed(1);
                            return `${percentage}% of total feedback`;
                          }
                          return '';
                        }
                      }
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
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {sectionFeedbackStats.chart_data.map((section, index) => {
                const total = section.accepted + section.rejected;
                const acceptanceRate = total > 0 ? ((section.accepted / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="bg-[#2a2a2a] rounded-lg p-4">
                    <div className="text-white font-semibold text-base mb-1">{section.section}</div>
                    <div className="text-gray-300 text-sm mt-1">
                      {section.accepted}A / {section.rejected}R
                    </div>
                    <div className={`text-xs mt-1 ${parseFloat(acceptanceRate) >= 70 ? 'text-green-400' : parseFloat(acceptanceRate) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {acceptanceRate}% accepted
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                {userStats && userStats.length > 0 ? (
                  userStats.map((user, index) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No user statistics available yet
                    </td>
                  </tr>
                )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {allReviews?.reviews && allReviews.reviews.length > 0 ? (
                  allReviews.reviews.map((review) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No reviews available yet
                    </td>
                  </tr>
                )}
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
                    {/* Using the new FormattedAIReview component here */}
                    <FormattedAIReview reviewText={selectedReview.review} />
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
