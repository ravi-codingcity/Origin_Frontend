import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { authFetch, handleAuthError, checkAuthentication } from "../utils/authHandler";

function View_rail_freight() {
  // State for storing fetched data
  const [railFreightData, setRailFreightData] = useState([]);
  // State for loading status
  const [isLoading, setIsLoading] = useState(true);
  // State for error messages
  const [error, setError] = useState(null);
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(50);
  // Add state for username filter
  const [usernameFilter, setUsernameFilter] = useState("");
  // Add state for refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Add state for shipping line filter
  const [shippingLineFilter, setShippingLineFilter] = useState("");

  // Add redirectToLogin helper function for consistent redirect handling
  const redirectToLogin = (reason) => {
    console.log(`Redirecting to login: ${reason || 'Authentication required'}`);
    
    // Clear all auth tokens
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
    
    // Redirect to login page
    window.location.href = '/';
  };

  // Format currency values for display
  const formatCurrency = (value, currency = "₹") => {
    if (value === undefined || value === null) return "-";

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "-";

    // Make sure we're using the correct currency symbol
    const currencySymbol = currency || "₹";

    return `${currencySymbol} ${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get username from various sources
  const getUserName = (item) => {
    if (item.name) return item.name;
    if (item.userName) return item.userName;
    if (item.createdBy) {
      if (typeof item.createdBy === "object" && item.createdBy !== null) {
        return (
          item.createdBy.name ||
          item.createdBy.username ||
          item.createdBy.email ||
          "User"
        );
      }
      return item.createdBy;
    }

    if (item.user) {
      if (typeof item.user === "object") {
        if (item.user.name) return item.user.name;
        if (item.user.username) return item.user.username;
        if (item.user.email) return item.user.email;
        return "User";
      }
      return item.user;
    }

    return "Unknown";
  };

  // Add enhanced authentication check at component mount
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      redirectToLogin('No authentication token found');
      return;
    }
    
    // Check if token is expired (if JWT)
    try {
      if (token.includes('.')) {
        // This is likely a JWT token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expiry) {
          redirectToLogin('Authentication token expired');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not verify token expiration:', e);
    }
  }, []);

  // Fetch all rail freight data with enhanced auth error handling
  useEffect(() => {
    setIsLoading(true);
    
    // Check token before making the request
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      redirectToLogin('No authentication token found for data fetch');
      return;
    }
    
    // Use the authFetch utility
    authFetch("https://originbackend-7uvypf08.b4a.run/api/railfreight/forms/all")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok (Status: ${response.status})`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("API Response Data:", data);
        setRailFreightData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching rail freight data:", error);
        
        // Check for specific auth-related errors
        if (error.message.includes('token') || error.message.includes('auth') || 
            error.message.includes('unauthorized') || error.message.includes('forbidden')) {
          redirectToLogin(`Authentication error during data fetch: ${error.message}`);
          return;
        }
        
        // Use the auth handler as fallback
        if (!handleAuthError(error)) {
          // Only set error message if it's not an auth error
          setError(error.message);
        }
        setIsLoading(false);
      });
  }, []);

  // Sort and paginate data
  const sortedData = [...railFreightData].sort((a, b) => {
    // Sort by createdAt date in descending order (newest first)
    return (
      new Date(b.createdAt || b.updatedAt || 0) -
      new Date(a.createdAt || a.updatedAt || 0)
    );
  });

  // Extract unique usernames for dropdown
  const uniqueUsernames = React.useMemo(() => {
    const usernames = railFreightData.map((item) => getUserName(item));
    return ["", ...new Set(usernames)].sort(); // Add empty option and sort alphabetically
  }, [railFreightData]);
  
  // Extract unique shipping lines for dropdown
  const uniqueShippingLines = React.useMemo(() => {
    const shippingLines = railFreightData
      .map((item) => item.shipping_lines)
      .filter(Boolean); // Filter out null/undefined values
    return ["", ...new Set(shippingLines)].sort(); // Add empty option and sort alphabetically
  }, [railFreightData]);

  // Apply filters to data before pagination
  const filteredData = sortedData.filter((item) => {
    // Apply username filter if set
    const usernameMatch = usernameFilter ? getUserName(item) === usernameFilter : true;
    // Apply shipping line filter if set
    const shippingLineMatch = shippingLineFilter ? item.shipping_lines === shippingLineFilter : true;
    // Item must match both filters when they are applied
    return usernameMatch && shippingLineMatch;
  });

  // Get current entries for pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(
    indexOfFirstEntry,
    indexOfLastEntry
  );
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  // Function to change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle filter changes
  const handleFilterChange = (e) => {
    setUsernameFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle shipping line filter changes
  const handleShippingLineChange = (e) => {
    setShippingLineFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Add function to handle refresh with enhanced auth error handling
  const handleRefresh = () => {
    setIsLoading(true);
    
    // Check token before refreshing
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      redirectToLogin('No authentication token found for data refresh');
      return;
    }
    
    authFetch("https://originbackend-7uvypf08.b4a.run/api/railfreight/forms/all")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (Status: ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        setRailFreightData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching rail freight data:", error);
        
        // Check for specific auth-related errors
        if (error.message.includes('token') || error.message.includes('auth') || 
            error.message.includes('unauthorized') || error.message.includes('forbidden')) {
          redirectToLogin(`Authentication error during refresh: ${error.message}`);
          return;
        }
        
        // Use the auth handler as fallback
        if (!handleAuthError(error)) {
          // Only set error message if it's not an auth error
          setError(error.message);
        }
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-3 flex items-center">
          View all India Rail Freight Charges
          <svg
            className="h-5 w-7 ml-2"
            viewBox="0 0 900 600"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Saffron band */}
            <rect width="900" height="200" fill="#FF9933" />
            {/* White band */}
            <rect y="200" width="900" height="200" fill="#FFFFFF" />
            {/* Green band */}
            <rect y="400" width="900" height="200" fill="#138808" />
            {/* Navy blue Ashoka Chakra */}
            <circle cx="450" cy="300" r="50" fill="#000080" />
          </svg>
        </h1>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>
              <strong>Error:</strong> {error}
            </p>
            <p>Please try again later or contact support.</p>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {/* Redesigned filter controls with shipping line filter */}
            <div className="mb-3 bg-white p-3 rounded-md shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  {/* User filter */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <label
                      htmlFor="username-filter"
                      className="text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      User:
                    </label>
                    <select
                      id="username-filter"
                      className="block w-full py-1.5 px-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      value={usernameFilter}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Users</option>
                      {uniqueUsernames
                        .filter((name) => name !== "")
                        .map((username) => (
                          <option key={username} value={username}>
                            {username}
                          </option>
                        ))}
                    </select>
                    
                    {usernameFilter && (
                      <button
                        onClick={() => {
                          setUsernameFilter("");
                          setCurrentPage(1);
                        }}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Shipping line filter - new addition */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <label
                      htmlFor="shipping-line-filter"
                      className="text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      Shipping Line:
                    </label>
                    <select
                      id="shipping-line-filter"
                      className="block w-full py-1.5 px-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      value={shippingLineFilter}
                      onChange={handleShippingLineChange}
                    >
                      <option value="">All Lines</option>
                      {uniqueShippingLines
                        .filter((line) => line !== "")
                        .map((line) => (
                          <option key={line} value={line}>
                            {line}
                          </option>
                        ))}
                    </select>
                    
                    {shippingLineFilter && (
                      <button
                        onClick={() => {
                          setShippingLineFilter("");
                          setCurrentPage(1);
                        }}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleRefresh}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center text-xs transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
              
              {/* Updated filter results message */}
              {(usernameFilter || shippingLineFilter) && (
                <div className="mt-2 text-xs text-gray-600">
                  Showing {filteredData.length} results
                  {usernameFilter && <span> for user "{usernameFilter}"</span>}
                  {shippingLineFilter && <span> with shipping line "{shippingLineFilter}"</span>}
                  {(usernameFilter || shippingLineFilter) && <span> (filtered from {sortedData.length})</span>}
                </div>
              )}
            </div>

            {/* Compact pagination info */}
            <div className="mb-2 flex justify-between items-center text-xs">
              <div className="text-gray-700">
                Showing {filteredData.length > 0 ? indexOfFirstEntry + 1 : 0} to{" "}
                {Math.min(indexOfLastEntry, filteredData.length)} of{" "}
                {filteredData.length} entries
                {usernameFilter && (
                  <span> (filtered from {sortedData.length})</span>
                )}
              </div>
            </div>

            {/* Responsive table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      POR
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      POL
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      Container Type
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      Shipping Line
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      20ft (0-10 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      20ft (10-20 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      20ft (20-26 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      20ft (26+ Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      40ft (10-20 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      40ft (20+ Ton)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentEntries.length > 0 ? (
                    currentEntries.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium border-r border-gray-200">
                          {getUserName(item)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.por}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.pol}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.container_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.shipping_lines}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                          {formatCurrency(item.weight20ft0_10, item.currency)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                          {formatCurrency(item.weight20ft10_20, item.currency)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                          {formatCurrency(item.weight20ft20_26, item.currency)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                          {formatCurrency(item.weight20ft26Plus, item.currency)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                          {formatCurrency(item.weight40ft10_20, item.currency)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.weight40ft20Plus, item.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="12"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No rail freight data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls - update to use filteredData.length */}
            {filteredData.length > entriesPerPage && (
              <div className="mt-4 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {railFreightData.length > 0 ? indexOfFirstEntry + 1 : 0}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(indexOfLastEntry, railFreightData.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {railFreightData.length}
                      </span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }).map(
                        (_, i) => {
                          let pageNumber;

                          // Calculate which page numbers to show (centered around current page)
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => paginate(pageNumber)}
                              aria-current={
                                currentPage === pageNumber ? "page" : undefined
                              }
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNumber
                                  ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        }
                      )}

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default View_rail_freight;
