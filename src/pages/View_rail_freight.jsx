import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

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

  // Format currency values for display
  const formatCurrency = (value, currency = "₹") => {
    if (value === undefined || value === null) return "-";

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "-";

    return `${currency} ${numValue.toLocaleString(undefined, {
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

  // Fetch all rail freight data
  useEffect(() => {
    setIsLoading(true);
    fetch("https://origin-backend-3v3f.onrender.com/api/railfreight/forms/all")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok (Status: ${response.status})`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched rail freight data:", data);
        setRailFreightData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching rail freight data:", error);
        setError(error.message);
        setIsLoading(false);
      });
  }, []);

  // Sort and paginate data
  const sortedData = [...railFreightData].sort((a, b) => {
    // Sort by createdAt date in descending order (newest first)
    return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
  });

  // Get current entries for pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = sortedData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(sortedData.length / entriesPerPage);

  // Function to change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Rail Freight Charges</h1>

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
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {/* Pagination info */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{railFreightData.length > 0 ? indexOfFirstEntry + 1 : 0}</span> to{" "}
                <span className="font-medium">{Math.min(indexOfLastEntry, railFreightData.length)}</span> of{" "}
                <span className="font-medium">{railFreightData.length}</span> entries
              </div>
            </div>
            
            {/* Responsive table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      POR
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      POL
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Container Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Shipping Line
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      20ft (0-10 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      20ft (10-20 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      20ft (20+ Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      40ft (10-20 Ton)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      40ft (20+ Ton)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentEntries.length > 0 ? (
                    currentEntries.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getUserName(item)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.por}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.pol}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.container_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.shipping_lines}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.weight20ft0_10, item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.weight20ft10_20, item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.weight20ft20Plus, item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.weight40ft10_20, item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
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
            
            {/* Pagination controls */}
            {railFreightData.length > entriesPerPage && (
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
                      Showing <span className="font-medium">{railFreightData.length > 0 ? indexOfFirstEntry + 1 : 0}</span> to{" "}
                      <span className="font-medium">{Math.min(indexOfLastEntry, railFreightData.length)}</span> of{" "}
                      <span className="font-medium">{railFreightData.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
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
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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
                            aria-current={currentPage === pageNumber ? "page" : undefined}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
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
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4-4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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
